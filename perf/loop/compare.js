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
 * Metrics are "lower is better" except the few listed in HIGHER_IS_BETTER.
 * Bookkeeping fields that are timestamps rather than costs are skipped.
 */
const fs = require('fs');

const HIGHER_IS_BETTER = new Set([]);
// Absolute positions on the timeline: they move when anything before them
// moves, so they are reported but never counted as regressions on their own.
const POSITIONAL =
  /(_start_ms|_end_ms|_done_ms|_checked_ms|_route_ms|_success_ms|^process_start_ms|^content_appeared_ms|^js_entry_ms|^store_ready_ms|^rehydrate_ms|^app_init_ms|^nav_ready_ms)$/;
// Too noisy or harness-dominated to judge on.
const IGNORE = new Set(['wall_clock_ms', 'am_wait_time_ms', 'visible_ms']);
// Small absolute moves in these never matter, whatever the noise says.
const MIN_ABS = {_ms: 5, _mb: 1, _kb: 2, _pct: 0.5};

function minAbsFor(key) {
  const suffix = Object.keys(MIN_ABS).find(s => key.endsWith(s));
  return suffix ? MIN_ABS[suffix] : 1;
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
      const noise = Math.max(c.stddev || 0, b.stddev || 0);
      const real =
        Math.abs(delta) > 2 * noise && Math.abs(delta) >= minAbsFor(key);
      const better = HIGHER_IS_BETTER.has(key) ? delta > 0 : delta < 0;
      rows.push({
        scenario,
        key,
        base: b.median,
        cand: c.median,
        delta,
        pct: b.median ? (delta / b.median) * 100 : null,
        noise,
        real,
        better,
        positional: POSITIONAL.test(key),
        target: targets.includes(key),
      });
    });
  });

  const regressions = rows.filter(
    r => r.real && !r.better && !r.positional && !r.key.startsWith('am_'),
  );
  const targetRows = rows.filter(r => r.target);
  const targetsImproved =
    targetRows.length > 0 && targetRows.every(r => r.real && r.better);
  const targetWorse = targetRows.some(r => r.real && !r.better);

  let verdict = 'NEUTRAL';
  if (regressions.length || targetWorse) {
    verdict = 'REJECT';
  } else if (
    targets.length
      ? targetsImproved
      : rows.some(r => r.real && r.better && !r.positional)
  ) {
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
    'scenario      metric                                  accepted   candidate      delta      %   noise  verdict',
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
