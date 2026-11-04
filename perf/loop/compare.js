#!/usr/bin/env node
/**
 * Loop comparison: accepted run vs candidate run, every metric.
 *
 *   node perf/loop/compare.js <accepted.json> <candidate.json> [--target a,b]
 *
 * Unlike the CI gate (perf/analysis/baseline.js), which only flags moves past
 * a per-metric tolerance, this reports every metric the two runs share and
 * calls a move real when it exceeds twice the larger stddev — the same noise
 * rule, without the tolerance floor. A 4% TTFD win that clears the noise is
 * worth keeping; the CI gate would call it "no change".
 *
 * Verdict, printed last and returned as the exit code:
 *   0  KEEP     every --target improved beyond noise, nothing regressed
 *   2  NEUTRAL  no target moved beyond noise, nothing regressed
 *   1  REJECT   something regressed beyond noise (or a target got worse)
 *
 * Noise is the robust spread of the per-run values (1.4826 × the median
 * absolute deviation, which equals the stddev for normal data) when values
 * are stored, else the stddev. Cold starts have occasional ~1s outliers (GC,
 * a late network response); they inflate the stddev of every downstream mark
 * enough to hide a real 250ms median shift, while barely moving the median
 * itself. Comparing medians against a median-based spread is consistent.
 *
 * A move must clear the metric's minimum magnitude, then:
 *   - declared --target metrics (the change's hypothesis): beyond 2× noise,
 *     OR a two-sided Mann–Whitney U on the per-run values with p < 0.01.
 *     The rank test uses every run rather than one spread estimate and is
 *     insensitive to outliers by construction.
 *   - every other metric (many comparisons at once): beyond 2× noise AND
 *     p < 0.001. Testing ~50 metrics at p < 0.01 yields false regressions
 *     between two runs of the same build; this keeps that rate near zero.
 * (Rank test adopted 2026-10-19 while judging the MoonPay deferral; checked
 * against two runs of identical code, which must come out NEUTRAL.)
 *
 * Metrics are "lower is better" except the few listed in HIGHER_IS_BETTER.
 * Bookkeeping fields that are timestamps rather than costs are skipped.
 */
const fs = require('fs');

const HIGHER_IS_BETTER = new Set([]);
// Absolute positions on the timeline: they move when anything before them
// moves, so they are reported but never counted as regressions on their own.
const POSITIONAL =
  /(_start_ms|_end_ms|_done_ms|_checked_ms|_route_ms|_success_ms|_render_ms|_commit_ms|^process_start_ms|^content_appeared_ms|^js_entry_ms|^store_ready_ms|^rehydrate_ms|^app_init_ms|^nav_ready_ms)$/;
// Too noisy or harness-dominated to judge on.
const IGNORE = new Set(['wall_clock_ms', 'am_wait_time_ms', 'visible_ms']);
// Small absolute moves in these never matter, whatever the noise says.
const MIN_ABS = {_ms: 5, _mb: 1, _kb: 2, _pct: 0.5};
// CPU totals are ~10 ms-granular (clock ticks); ignore single-tick moves.
const MIN_ABS_CPU_MS = 20;
// Count metrics: a handful of modules or one action is not a regression.
const MIN_ABS_PREFIX = {modules_: 25, actions_: 2, requests_: 1};

function minAbsFor(key) {
  const prefix = Object.keys(MIN_ABS_PREFIX).find(p => key.startsWith(p));
  if (prefix) {
    return MIN_ABS_PREFIX[prefix];
  }
  if (key.endsWith('_cpu_ms_settled')) {
    return MIN_ABS_CPU_MS;
  }
  const suffix = Object.keys(MIN_ABS).find(s => key.endsWith(s));
  return suffix ? MIN_ABS[suffix] : 1;
}

function robustNoise(summary) {
  const v = (summary.values || []).filter(Number.isFinite);
  if (v.length < 4) {
    return summary.stddev || 0;
  }
  const med = median(v);
  return 1.4826 * median(v.map(x => Math.abs(x - med)));
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Two-sided Mann–Whitney U, normal approximation with tie correction. */
function mannWhitneyP(a, b) {
  const n1 = a.length;
  const n2 = b.length;
  if (n1 < 6 || n2 < 6) {
    return 1;
  }
  const all = [...a.map(v => [v, 0]), ...b.map(v => [v, 1])].sort(
    (x, y) => x[0] - y[0],
  );
  const ranks = new Array(all.length);
  let tieTerm = 0;
  for (let i = 0; i < all.length; ) {
    let j = i;
    while (j + 1 < all.length && all[j + 1][0] === all[i][0]) {
      j++;
    }
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      ranks[k] = r;
    }
    const t = j - i + 1;
    tieTerm += t * t * t - t;
    i = j + 1;
  }
  let r1 = 0;
  all.forEach(([, g], i) => {
    if (g === 0) {
      r1 += ranks[i];
    }
  });
  const u = r1 - (n1 * (n1 + 1)) / 2;
  const n = n1 + n2;
  const sd = Math.sqrt(((n1 * n2) / 12) * (n + 1 - tieTerm / (n * (n - 1))));
  if (!sd) {
    return 1;
  }
  const z = (Math.abs(u - (n1 * n2) / 2) - 0.5) / sd;
  // Two-sided p from the normal tail (Abramowitz–Stegun 26.2.17).
  const t = 1 / (1 + 0.2316419 * z);
  const tail =
    0.3989423 *
    Math.exp((-z * z) / 2) *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return Math.min(1, 2 * tail);
}

function parseArgs(argv) {
  const files = [];
  const opts = {target: []};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--target') {
      opts.target = String(argv[++i] || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    } else {
      files.push(argv[i]);
    }
  }
  return {files, opts};
}

function compareRuns(accepted, candidate, targets = []) {
  const rows = [];
  Object.entries(candidate.scenarios || {}).forEach(([scenario, cand]) => {
    const base = (accepted.scenarios || {})[scenario];
    if (!base) {
      return;
    }
    Object.entries(cand.metrics || {}).forEach(([key, c]) => {
      const b = (base.metrics || {})[key];
      if (IGNORE.has(key) || !b || c.median == null || b.median == null) {
        return;
      }
      const delta = c.median - b.median;
      const noise = Math.max(robustNoise(c), robustNoise(b));
      const p = mannWhitneyP(
        (b.values || []).filter(Number.isFinite),
        (c.values || []).filter(Number.isFinite),
      );
      const isTarget = targets.includes(key);
      const beyondNoise = Math.abs(delta) > 2 * noise;
      const real =
        Math.abs(delta) >= minAbsFor(key) &&
        (isTarget ? beyondNoise || p < 0.01 : beyondNoise && p < 0.001);
      const better = HIGHER_IS_BETTER.has(key) ? delta > 0 : delta < 0;
      rows.push({
        scenario,
        key,
        base: b.median,
        cand: c.median,
        delta,
        pct: b.median ? (delta / b.median) * 100 : null,
        noise,
        p,
        real,
        better,
        // phase_* are durations, whatever their names end in.
        positional: !key.startsWith('phase_') && POSITIONAL.test(key),
        target: targets.includes(key),
      });
    });
  });

  // Snapshots taken at TTFD (heap, modules, actions, requests, store size,
  // module time) move whenever TTFD moves relative to background work: a
  // change that makes the splash come down earlier, or later, changes how
  // much of that work has happened by then without changing the work. Judge
  // them only when the same metric at settle agrees.
  const byKey = new Map(rows.map(r => [`${r.scenario}|${r.key}`, r]));
  rows.forEach(r => {
    const m = /^(js_heap_mb|modules|module_init_ms|actions|action_ms|requests|request_kb|store_kb)_ttfd$/.exec(
      r.key,
    );
    if (!m || !r.real) {
      return;
    }
    const settled = byKey.get(`${r.scenario}|${m[1]}_settled`);
    if (settled && !(settled.real && settled.better === r.better)) {
      r.snapshotOnly = true;
    }
  });

  const regressions = rows.filter(
    r =>
      r.real &&
      !r.better &&
      !r.positional &&
      !r.snapshotOnly &&
      !r.key.startsWith('am_'),
  );
  const targetRows = rows.filter(r => r.target);
  const targetsImproved =
    targetRows.length > 0 && targetRows.every(r => r.real && r.better);
  const targetWorse = targetRows.some(r => r.real && !r.better);

  // KEEP: nothing regressed, and either every declared target improved or
  // some other metric improved under the strict (p < 0.001 and 2× noise)
  // threshold — a change can help more, or elsewhere, than predicted.
  const strictWin = rows.some(
    r => r.real && r.better && !r.positional && !r.snapshotOnly && !r.target,
  );
  let verdict = 'NEUTRAL';
  if (regressions.length || targetWorse) {
    verdict = 'REJECT';
  } else if (targetsImproved || strictWin) {
    verdict = 'KEEP';
  }
  return {rows, regressions, verdict};
}

function fmt(n) {
  if (n == null) {
    return '—';
  }
  return Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1);
}

function print({rows, regressions, verdict}) {
  const lines = [];
  lines.push(
    'scenario      metric                                  accepted   candidate      delta      %   noise       p  verdict',
  );
  rows
    .sort(
      (a, b) =>
        Number(b.real) - Number(a.real) ||
        Math.abs(b.pct || 0) - Math.abs(a.pct || 0),
    )
    .forEach(r => {
      const mark = !r.real
        ? '~'
        : r.snapshotOnly
        ? r.better
          ? '↓ (snap)'
          : '↑ (snap)'
        : r.better
        ? r.positional
          ? '↓ (pos)'
          : '↓ better'
        : r.positional
        ? '↑ (pos)'
        : '↑ WORSE';
      lines.push(
        [
          r.scenario.padEnd(13),
          `${r.target ? '*' : ' '}${r.key}`.padEnd(40),
          fmt(r.base).padStart(9),
          fmt(r.cand).padStart(11),
          fmt(r.delta).padStart(10),
          (r.pct == null ? '—' : r.pct.toFixed(1)).padStart(6),
          fmt(r.noise).padStart(7),
          (r.p < 0.001 ? '<.001' : r.p.toFixed(3)).padStart(7),
          ` ${mark}`,
        ].join(' '),
      );
    });
  lines.push('');
  if (regressions.length) {
    lines.push(
      `Regressions: ${regressions
        .map(r => `${r.key} (+${fmt(r.delta)})`)
        .join(', ')}`,
    );
  }
  lines.push(`VERDICT: ${verdict}`);
  return lines.join('\n');
}

if (require.main === module) {
  const {files, opts} = parseArgs(process.argv.slice(2));
  if (files.length !== 2) {
    console.error(
      'usage: compare.js <accepted.json> <candidate.json> [--target metric,metric]',
    );
    process.exit(64);
  }
  const [accepted, candidate] = files.map(f =>
    JSON.parse(fs.readFileSync(f, 'utf8')),
  );
  const result = compareRuns(accepted, candidate, opts.target);
  console.log(print(result));
  process.exitCode = {KEEP: 0, NEUTRAL: 2, REJECT: 1}[result.verdict];
}

module.exports = {compareRuns, print};
