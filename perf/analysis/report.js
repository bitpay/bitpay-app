const fs = require('fs');

/**
 * Self-contained HTML report — no external assets, so it can be opened from a
 * file:// path or attached to a CI job without a server.
 *
 * Presentation rules that matter:
 *  - A metric that was never collected renders as "not collected", never 0.
 *  - Every median is shown with its spread; a bare median is a lie about
 *    precision.
 *  - Metrics whose coefficient of variation exceeds the threshold are marked
 *    unreliable in place, so nobody quotes a number the harness distrusts.
 */

const METRIC_LABELS = {
  ttid_ms: 'Time to initial display (first frame)',
  ttfd_ms: 'Time to fully drawn (app usable)',
  am_total_time_ms: 'ActivityManager TotalTime (trampoline — reference only)',
  am_wait_time_ms: 'ActivityManager WaitTime',
  visible_ms:
    'Launch → element visible (includes ~14s Maestro startup — context only, not gated)',
  wall_clock_ms: 'Harness wall clock',
  js_bundle_exec_ms: 'Hermes bundle execution',
  js_entry_ms: 'JS entry reached',
  store_ready_ms: 'Redux store constructed',
  rehydrate_ms: 'redux-persist rehydrated',
  app_init_ms: 'AppInitialization complete',
  nav_ready_ms: 'NavigationContainer ready',
  splash_hidden_ms: 'Bootsplash hidden (perceived TTI)',
  content_appeared_ms: 'First content appeared',
  native_launch_end_ms: 'Native launch end',
  transition_ms: 'Screen transition',
  peak_pss_mb: 'Peak memory (PSS)',
  pss_mb: 'Memory (PSS)',
  java_heap_mb: 'Java heap',
  native_heap_mb: 'Native heap',
  avg_cpu_pct: 'Average CPU',
  peak_cpu_pct: 'Peak CPU',
  js_thread_cpu_pct: 'JS thread CPU (mqt_v_js)',
  ui_thread_cpu_pct: 'UI thread CPU',
  render_thread_cpu_pct: 'Render thread CPU',
  hermes_gc_cpu_pct: 'Hermes GC CPU (hades)',
  janky_frames_pct: 'Janky frames (needs GPU timing — 0 if unavailable)',
  janky_frames: 'Janky frames (count)',
  janky_frames_legacy_pct: 'Janky frames (legacy metric)',
  janky_frames_legacy: 'Janky frames, legacy (count)',
  frame_deadline_missed: 'Frame deadline missed',
  frame_deadline_missed_legacy: 'Frame deadline missed (legacy)',
  high_input_latency: 'High input latency frames',
  slow_ui_thread: 'Slow UI thread frames',
  frame_p50_ms: 'Frame time p50',
  frame_p90_ms: 'Frame time p90',
  frame_p95_ms: 'Frame time p95',
  frame_p99_ms: 'Frame time p99',
  total_frames: 'Total frames rendered',
  apk_size_bytes: 'APK size',
  bundle_size_bytes: 'JS bundle size',
  native_libs_bytes: 'Native libraries',
  assets_bytes: 'Assets',
  resources_bytes: 'Resources',
};

const UNITS = {
  _ms: 'ms',
  _mb: 'MB',
  _pct: '%',
  _bytes: 'bytes',
};

function unitFor(key) {
  const suffix = Object.keys(UNITS).find(s => key.endsWith(s));
  return suffix ? UNITS[suffix] : '';
}

function formatValue(key, value) {
  if (value === null || value === undefined) {
    return '—';
  }
  if (key.endsWith('_bytes')) {
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${value}${unitFor(key)}`;
}

const esc = s =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function metricRow(key, summary) {
  const label = METRIC_LABELS[key] || key;

  if (!summary || summary.median === null) {
    return `<tr class="muted"><td>${esc(label)}</td><td colspan="4">not collected</td></tr>`;
  }

  const reliability =
    summary.reliable === false
      ? '<span class="badge warn" title="Coefficient of variation above threshold — treat this number as indicative only">unreliable</span>'
      : summary.reliable === null
      ? '<span class="badge muted-badge" title="Only one sample — no spread to measure">single run</span>'
      : '';

  const spread =
    summary.stddev === null
      ? '—'
      : `±${summary.stddev}${unitFor(key)} <span class="dim">(cov ${
          summary.cov === null ? '—' : (summary.cov * 100).toFixed(1) + '%'
        })</span>`;

  return `<tr>
    <td>${esc(label)} ${reliability}</td>
    <td class="num strong">${formatValue(key, summary.median)}</td>
    <td class="num">${formatValue(key, summary.p90)}</td>
    <td class="num">${spread}</td>
    <td class="num dim">${summary.count} runs · ${formatValue(
    key,
    summary.min,
  )}–${formatValue(key, summary.max)}</td>
  </tr>`;
}

function scenarioSection(name, data) {
  const metricRows = Object.entries(data.metrics || {})
    .map(([k, v]) => metricRow(k, v))
    .join('\n');

  const perScreen = Object.entries(data.perScreen || {})
    .map(
      ([screen, metrics]) => `
      <tr class="group"><td colspan="5">${esc(screen)}</td></tr>
      ${Object.entries(metrics)
        .map(([k, v]) => metricRow(k, v))
        .join('\n')}`,
    )
    .join('\n');

  if (!metricRows && !perScreen) {
    return '';
  }

  return `<section>
    <h3>${esc(name)}</h3>
    ${data.description ? `<p class="dim">${esc(data.description)}</p>` : ''}
    <table>
      <thead><tr><th>Metric</th><th class="num">Median</th><th class="num">p90</th><th class="num">Spread</th><th class="num">Range</th></tr></thead>
      <tbody>${metricRows}${perScreen}</tbody>
    </table>
  </section>`;
}

function comparisonSection(comparison) {
  if (!comparison) {
    return '';
  }

  if (!comparison.identity.comparable) {
    const rows = comparison.identity.mismatches
      .map(
        m =>
          `<li><code>${esc(m.field)}</code>: this run <b>${esc(
            m.candidate,
          )}</b> vs baseline <b>${esc(m.baseline)}</b></li>`,
      )
      .join('');

    return `<section class="alert">
      <h3>Baseline not comparable</h3>
      <p>These runs came from different device classes, so the comparison was skipped. Numbers from an emulator and a physical device are different quantities that share a unit.</p>
      <ul>${rows}</ul>
    </section>`;
  }

  const row = c => `<tr class="${
    c.regression ? 'bad' : c.improvement ? 'good' : c.inconclusive ? 'warn-row' : ''
  }">
    <td>${esc(c.scenario)}${c.screen ? ` · ${esc(c.screen)}` : ''}</td>
    <td>${esc(METRIC_LABELS[c.metric] || c.metric)}</td>
    <td class="num">${formatValue(c.metric, c.baseline)}</td>
    <td class="num">${formatValue(c.metric, c.candidate)}</td>
    <td class="num strong">${
      c.pctChange === null
        ? c.fromZeroBaseline
          ? 'from zero'
          : '—'
        : `${c.pctChange > 0 ? '+' : ''}${c.pctChange}%`
    }</td>
    <td>${
      c.regression
        ? 'REGRESSION'
        : c.improvement
        ? 'improved'
        : c.inconclusive
        ? 'within noise'
        : 'ok'
    }</td>
  </tr>`;

  const interesting = comparison.comparisons.filter(
    c => c.regression || c.improvement || c.inconclusive,
  );

  return `<section>
    <h3>vs baseline</h3>
    <p class="${comparison.passed ? 'pass' : 'fail'}">
      ${
        comparison.passed
          ? '✓ No regressions beyond threshold and noise.'
          : `✗ ${comparison.regressions.length} regression(s) exceeded both the tolerance and 2× the measured noise.`
      }
    </p>
    ${
      comparison.inconclusive.length
        ? `<p class="dim">${comparison.inconclusive.length} metric(s) moved past tolerance but not beyond noise — shown as "within noise". Re-run with more iterations to resolve.</p>`
        : ''
    }
    ${
      comparison.missing && comparison.missing.length
        ? `<p class="warn-text"><b>${
            comparison.missing.length
          } metric(s) in the baseline were not collected in this run</b> — a pass below covers only what was measured. Missing: ${comparison.missing
            .slice(0, 12)
            .map(m => esc(`${m.scenario}/${m.metric}`))
            .join(', ')}${comparison.missing.length > 12 ? ' …' : ''}</p>`
        : ''
    }
    <table>
      <thead><tr><th>Scenario</th><th>Metric</th><th class="num">Baseline</th><th class="num">This run</th><th class="num">Change</th><th>Verdict</th></tr></thead>
      <tbody>${
        interesting.length
          ? interesting.map(row).join('\n')
          : '<tr><td colspan="6" class="dim">All compared metrics within tolerance.</td></tr>'
      }</tbody>
    </table>
  </section>`;
}

function render(results, comparison) {
  const {meta} = results;

  const warnings = (meta.warnings || [])
    .map(w => `<li>${esc(w)}</li>`)
    .join('');

  const scenarios = Object.entries(results.scenarios || {})
    .map(([name, data]) => scenarioSection(name, data))
    .join('\n');

  const staticRows = Object.entries(results.static || {})
    .map(
      ([k, v]) =>
        `<tr><td>${esc(METRIC_LABELS[k] || k)}</td><td class="num strong">${formatValue(
          k,
          v,
        )}</td></tr>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Performance report — ${esc(meta.appVersion || '')}</title>
<style>
  :root {
    --bg: #ffffff; --fg: #16181d; --dim: #6b7280; --line: #e5e7eb;
    --card: #f9fafb; --good: #067647; --bad: #b42318; --warn: #b54708;
    --accent: #1a3b8b;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f1115; --fg: #e6e8eb; --dim: #9099a8; --line: #262b33;
      --card: #161a20; --good: #4ade80; --bad: #f87171; --warn: #fbbf24;
      --accent: #7aa2f7;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2rem 1.25rem 4rem; background: var(--bg); color: var(--fg);
    font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  main { max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 1.6rem; margin: 0 0 .35rem; }
  h3 { font-size: 1.1rem; margin: 2rem 0 .6rem; }
  .dim { color: var(--dim); }
  .strong { font-weight: 650; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .9em; }
  .meta { background: var(--card); border: 1px solid var(--line); border-radius: 10px;
          padding: .9rem 1.1rem; margin: 1rem 0 1.5rem; }
  .meta dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
             gap: .5rem 1.5rem; margin: 0; }
  .meta dt { color: var(--dim); font-size: .78rem; text-transform: uppercase; letter-spacing: .04em; }
  .meta dd { margin: 0 0 .4rem; font-weight: 550; }
  table { width: 100%; border-collapse: collapse; margin: .5rem 0 1rem; font-size: .93rem; }
  th, td { text-align: left; padding: .5rem .6rem; border-bottom: 1px solid var(--line); }
  th { color: var(--dim); font-weight: 600; font-size: .8rem; text-transform: uppercase; letter-spacing: .03em; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.muted td { color: var(--dim); font-style: italic; }
  tr.group td { background: var(--card); font-weight: 650; font-size: .85rem; }
  tr.bad td { background: color-mix(in srgb, var(--bad) 10%, transparent); }
  tr.good td { background: color-mix(in srgb, var(--good) 10%, transparent); }
  tr.warn-row td { background: color-mix(in srgb, var(--warn) 10%, transparent); }
  .badge { font-size: .68rem; padding: .1rem .4rem; border-radius: 4px; vertical-align: middle;
           text-transform: uppercase; letter-spacing: .04em; font-weight: 700; }
  .badge.warn { background: var(--warn); color: #fff; }
  .badge.muted-badge { background: var(--dim); color: var(--bg); }
  .pass { color: var(--good); font-weight: 650; }
  .fail { color: var(--bad); font-weight: 650; }
  .warn-text { color: var(--warn); }
  section.alert { border: 1px solid var(--warn); border-radius: 10px; padding: .5rem 1.1rem 1rem; }
  .table-wrap { overflow-x: auto; }
  ul { margin: .4rem 0; padding-left: 1.2rem; }
</style>
</head>
<body>
<main>
  <h1>Performance report</h1>
  <p class="dim">${esc(meta.appVersion || 'unknown version')} · ${esc(
    meta.gitSha || 'no sha',
  )} · ${esc(meta.timestamp || '')}</p>

  <div class="meta">
    <dl>
      <div><dt>Platform</dt><dd>${esc(meta.platform)}</dd></div>
      <div><dt>Device</dt><dd>${esc(meta.device?.model || '—')}${
    meta.device?.isEmulator ? ' (emulator)' : ''
  }</dd></div>
      <div><dt>OS</dt><dd>Android ${esc(meta.device?.androidVersion || '—')} (SDK ${esc(
    meta.device?.sdkInt || '—',
  )})</dd></div>
      <div><dt>ABI</dt><dd>${esc(meta.device?.abi || '—')}</dd></div>
      <div><dt>Runs</dt><dd>${esc(meta.runs)} (first ${esc(
    meta.discardedRuns,
  )} discarded)</dd></div>
      <div><dt>Animations</dt><dd>${
        meta.animationsDisabled ? 'disabled' : 'enabled'
      }</dd></div>
      <div><dt>Instrumented build</dt><dd>${
        meta.instrumented ? 'yes (IS_PERF)' : 'no — black box only'
      }</dd></div>
      <div><dt>Artifact</dt><dd class="dim"><code>${esc(
        meta.artifact?.name || '—',
      )}</code></dd></div>
    </dl>
  </div>

  ${
    meta.device?.isEmulator
      ? `<section class="alert"><h3>Emulator run</h3><p>These numbers are valid for <b>same-machine A/B comparison only</b>. Emulators have no thermal behaviour, host-dependent CPU, and unrealistic I/O — do not quote them as absolute figures or compare them against physical-device baselines.</p></section>`
      : ''
  }

  ${
    warnings
      ? `<section class="alert"><h3>Warnings</h3><ul>${warnings}</ul></section>`
      : ''
  }

  ${comparisonSection(comparison)}

  <div class="table-wrap">${scenarios}</div>

  ${
    staticRows
      ? `<section><h3>Artifact</h3><table><thead><tr><th>Metric</th><th class="num">Value</th></tr></thead><tbody>${staticRows}</tbody></table></section>`
      : ''
  }

  <p class="dim" style="margin-top:2rem">
    TTID comes from the ActivityTaskManager <code>Displayed</code> log line for
    <code>.MainActivity</code>. <code>am start -W</code> TotalTime is reported for reference only:
    the manifest launcher is <code>.LaunchActivity</code>, a trampoline that finishes before the app
    draws, so its TotalTime understates real startup.
  </p>
</main>
</body>
</html>`;
}

function write(filePath, results, comparison) {
  fs.writeFileSync(filePath, render(results, comparison));
  return filePath;
}

module.exports = {render, write, METRIC_LABELS, formatValue};
