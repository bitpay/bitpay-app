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
    <div class="table-wrap">
      <table>
        <thead><tr><th>Metric</th><th class="num">Median</th><th class="num">p90</th><th class="num">Spread</th><th class="num">Range</th></tr></thead>
        <tbody>${metricRows}${perScreen}</tbody>
      </table>
    </div>
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
        ? '<span class="verdict is-bad">regression</span>'
        : c.improvement
        ? '<span class="verdict is-good">improved</span>'
        : c.inconclusive
        ? '<span class="verdict is-warn">within noise</span>'
        : '<span class="verdict is-neutral">ok</span>'
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
    <div class="table-wrap">
      <table>
        <thead><tr><th>Scenario</th><th>Metric</th><th class="num">Baseline</th><th class="num">This run</th><th class="num">Change</th><th>Verdict</th></tr></thead>
        <tbody>${
          interesting.length
            ? interesting.map(row).join('\n')
            : '<tr><td colspan="6" class="dim">All compared metrics within tolerance.</td></tr>'
        }</tbody>
      </table>
    </div>
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
  /*
   * Visual system derived from the Vercel DESIGN.md spec
   * (voltagent/awesome-design-md): a stark ink-on-near-white duet, a four-step
   * surface ladder, mono reserved for the technical layer, and stacked
   * shadows with an inset hairline ring instead of a single heavy drop.
   * Dark mode is the spec's polarity-flipped ink band carried across the page.
   *
   * Deliberate deviations, both required by this surface:
   *  - System font stack rather than loading Geist/Inter. The report must open
   *    from file:// and inside CI artifact viewers, so no font CDN — this is
   *    the spec's own declared fallback chain.
   *  - Muted text sits at #6b6b6b rather than the spec's #888888, and the
   *    verdict green comes from the system's in-product green scale. #888888
   *    lands at 3.4:1 on the page canvas, which fails AA at the label sizes
   *    this report uses.
   */
  :root {
    /* Light — the default polarity. Four-step surface ladder. */
    --canvas: #fafafa;
    --surface: #ffffff;
    --surface-inset: #f5f5f5;
    --ink: #171717;
    --ink-body: #4d4d4d;
    --ink-mute: #6b6b6b;
    --hairline: #ebebeb;
    --hairline-strong: #e0e0e0;
    --link: #0070f3;

    --bad: #c50000;
    --bad-soft: #f7d4d6;
    --warn: #ab570a;
    --warn-soft: #ffefcf;
    --good: #0d6e31;
    --good-soft: #d5efdf;

    /* Stacked offsets plus an inset ring — never one heavy drop. */
    --ring: inset 0 0 0 1px #00000014;
    --elevation-2: 0px 1px 1px #00000005, 0px 2px 2px #0000000a, var(--ring);

    /* 4px base unit */
    --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px;
    --sp-6: 24px; --sp-8: 32px; --sp-12: 48px; --sp-16: 64px;
    --r-sm: 6px; --r-md: 8px; --r-lg: 12px;

    --sans: Geist, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      /* The spec's polarity-flipped ink band, carried across the whole page. */
      --canvas: #171717;
      --surface: #1f1f1f;
      --surface-inset: #232323;
      --ink: #ededed;
      --ink-body: #a1a1a1;
      --ink-mute: #8f8f8f;
      --hairline: #2e2e2e;
      --hairline-strong: #3a3a3a;
      --link: #52a8ff;

      --bad: #ff6166;
      --bad-soft: #2a1215;
      --warn: #f5a623;
      --warn-soft: #2b2010;
      --good: #62c073;
      --good-soft: #12261a;

      --ring: inset 0 0 0 1px #ffffff14;
      --elevation-2: var(--ring);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0 var(--sp-6) var(--sp-16);
    background: var(--canvas);
    color: var(--ink);
    font: 400 14px/20px var(--sans);
    letter-spacing: -0.28px;
    -webkit-font-smoothing: antialiased;
  }
  main { max-width: 1200px; margin: 0 auto; padding-top: var(--sp-12); }

  /* The brand gradient, kept full-bleed at page scale — never miniaturised. */
  .brandbar {
    position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 1;
    background: linear-gradient(90deg,
      #007cf0 0%, #00dfd8 25%, #7928ca 45%, #ff0080 65%, #ff4d4d 85%, #f9cb28 100%);
  }

  /* Type ------------------------------------------------------------------ */
  .eyebrow {
    font-family: var(--mono); font-size: 12px; line-height: 16px;
    letter-spacing: 0; color: var(--ink-mute); margin: 0 0 var(--sp-2);
  }
  h1 {
    font-size: 32px; font-weight: 600; line-height: 40px; letter-spacing: -1.28px;
    margin: 0 0 var(--sp-2);
  }
  h3 {
    font-size: 20px; font-weight: 600; line-height: 28px; letter-spacing: -0.6px;
    margin: var(--sp-12) 0 var(--sp-3);
  }
  .subtitle {
    font-family: var(--mono); font-size: 12px; line-height: 16px; letter-spacing: 0;
    color: var(--ink-mute); margin: 0;
  }
  .dim { color: var(--ink-body); }
  .strong { font-weight: 500; color: var(--ink); }
  code {
    font-family: var(--mono); font-size: 13px; line-height: 20px; letter-spacing: 0;
  }
  p { margin: var(--sp-3) 0; color: var(--ink-body); }
  ul { margin: var(--sp-2) 0; padding-left: var(--sp-6); color: var(--ink-body); }
  li { margin: var(--sp-1) 0; }
  b { font-weight: 500; color: var(--ink); }
  a { color: var(--link); }
  :focus-visible { outline: 2px solid var(--link); outline-offset: 2px; }

  /* Run metadata card ----------------------------------------------------- */
  .meta {
    background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--elevation-2);
    padding: var(--sp-6); margin: var(--sp-6) 0 var(--sp-8);
  }
  .meta dl {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--sp-6); margin: 0;
  }
  .meta dt {
    font-family: var(--mono); font-size: 12px; line-height: 16px; letter-spacing: 0;
    color: var(--ink-mute); margin-bottom: var(--sp-1);
  }
  .meta dd { margin: 0; font-size: 14px; font-weight: 500; color: var(--ink); }

  /* Tables ---------------------------------------------------------------- */
  .table-wrap {
    overflow-x: auto; background: var(--surface);
    border-radius: var(--r-lg); box-shadow: var(--elevation-2);
  }
  table { width: 100%; border-collapse: collapse; }
  th, td {
    text-align: left; padding: var(--sp-3) var(--sp-4);
    border-bottom: 1px solid var(--hairline);
  }
  tr:last-child td { border-bottom: 0; }
  /* Mono is the voice of the technical layer: headers, numbers, labels. */
  th {
    font-family: var(--mono); font-size: 12px; font-weight: 400; line-height: 16px;
    letter-spacing: 0; color: var(--ink-mute); white-space: nowrap;
    background: var(--surface-inset);
  }
  td { color: var(--ink-body); }
  td.num, th.num { text-align: right; }
  td.num {
    font-family: var(--mono); font-size: 13px; line-height: 20px; letter-spacing: 0;
    font-variant-numeric: tabular-nums; color: var(--ink);
  }
  td.num.dim { color: var(--ink-mute); }
  tr.muted td { color: var(--ink-mute); }
  tr.group td {
    background: var(--surface-inset); color: var(--ink);
    font-family: var(--mono); font-size: 12px; font-weight: 400; line-height: 16px;
    letter-spacing: 0;
  }
  tr.bad td { background: color-mix(in srgb, var(--bad) 7%, transparent); }
  tr.good td { background: color-mix(in srgb, var(--good) 7%, transparent); }
  tr.warn-row td { background: color-mix(in srgb, var(--warn) 8%, transparent); }

  /* Badges — soft fill, deep ink, 6px nav-scale radius throughout ---------- */
  .badge, .verdict {
    display: inline-block; font-family: var(--mono); font-size: 12px; line-height: 16px;
    font-weight: 400; letter-spacing: 0; white-space: nowrap;
    padding: 1px var(--sp-2); border-radius: var(--r-sm); vertical-align: middle;
  }
  .badge.warn { background: var(--warn-soft); color: var(--warn); }
  .badge.muted-badge {
    background: var(--surface-inset); color: var(--ink-mute); box-shadow: var(--ring);
  }
  .verdict.is-bad { background: var(--bad-soft); color: var(--bad); }
  .verdict.is-good { background: var(--good-soft); color: var(--good); }
  .verdict.is-warn { background: var(--warn-soft); color: var(--warn); }
  .verdict.is-neutral { background: var(--surface-inset); color: var(--ink-mute); }
  .pass { color: var(--good); font-weight: 500; }
  .fail { color: var(--bad); font-weight: 500; }
  .warn-text { color: var(--warn); }

  /* Callouts — a card with a semantic left edge, not a full colored box ---- */
  section.alert {
    background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--elevation-2);
    border-left: 2px solid var(--warn);
    padding: var(--sp-1) var(--sp-6) var(--sp-4);
    margin: var(--sp-6) 0;
  }
  section.alert h3 { margin-top: var(--sp-4); font-size: 16px; letter-spacing: -0.32px; }

  /* Footer ---------------------------------------------------------------- */
  .footnote {
    color: var(--ink-mute); font-size: 12px; line-height: 16px;
    border-top: 1px solid var(--hairline);
    padding-top: var(--sp-4); margin: var(--sp-16) 0 0;
  }

  @media (max-width: 639px) {
    body { padding: 0 var(--sp-4) var(--sp-8); }
    h1 { font-size: 24px; line-height: 32px; letter-spacing: -0.96px; }
    .meta { padding: var(--sp-4); }
  }
</style>
</head>
<body>
<div class="brandbar"></div>
<main>
  <p class="eyebrow">${esc(meta.platform || '')} performance harness</p>
  <h1>Performance report.</h1>
  <p class="subtitle">${esc(meta.appVersion || 'unknown version')} · ${esc(
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

  ${scenarios}

  ${
    staticRows
      ? `<section><h3>Artifact</h3><div class="table-wrap"><table><thead><tr><th>Metric</th><th class="num">Value</th></tr></thead><tbody>${staticRows}</tbody></table></div></section>`
      : ''
  }

  <p class="footnote">
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
