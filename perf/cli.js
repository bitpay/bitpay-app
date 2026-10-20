#!/usr/bin/env node
/**
 * Performance diagnostic harness.
 *
 *   yarn perf:run --artifact ./app-arm64-v8a-release.apk --runs 10
 *   yarn perf:run --artifact ./app.apk --scenarios startup-cold,nav-tabs
 *   yarn perf:baseline --from perf/results/<file>.json
 *   yarn perf:compare perf/results/a.json perf/results/b.json
 *
 * Design notes worth knowing before editing:
 *  - The harness performs startup launches itself via adb; startup Maestro
 *    flows must NOT contain `launchApp` or the app gets launched twice and the
 *    timing is meaningless.
 *  - In-app instrumentation arrives via logcat (see perf/collector.js), not
 *    over the network — this app's release builds block localhost HTTP.
 *  - A missing optional tool degrades the report; it never fails the run.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const android = require('./drivers/android');
const maestro = require('./drivers/maestro');
const stats = require('./analysis/stats');
const baselineLib = require('./analysis/baseline');
const report = require('./analysis/report');
const collector = require('./collector');
const {run, sleep} = require('./lib/exec');
const {APP_ID, DEFAULTS, SCENARIOS} = require('./config');

const RESULTS_DIR = path.join(__dirname, 'results');
const BASELINES_DIR = path.join(__dirname, 'baselines');

// ---------------------------------------------------------------- arg parsing

function parseArgs(argv) {
  const args = {_: []};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    } else {
      args._.push(arg);
    }
  }

  return args;
}

/** `--flag false` arrives as the string "false"; treat it as boolean false. */
function isDisabled(value) {
  return value === false || value === 'false' || value === 'none';
}

/** Positive integers only — `--runs 0` must not silently become the default. */
function positiveInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const log = (...a) => console.log(...a);
const warn = msg => console.log(`  ! ${msg}`);

// ------------------------------------------------------------------- helpers

function gitSha() {
  const res = run('git', ['rev-parse', '--short', 'HEAD']);
  return res.code === 0 ? res.stdout.trim() : null;
}

function appVersion() {
  try {
    return require('../package.json').version;
  } catch (e) {
    return null;
  }
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, {recursive: true});
}

/**
 * Baselines are per device class. Emulator and physical numbers live in
 * separate files so they can never be silently compared.
 */
function baselineNameFor(device) {
  const kind = device.isEmulator ? 'emulator' : 'device';
  const model = String(device.model || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `android-${kind}-${model}.json`;
}

/**
 * Module id -> path map written by metro.config.js when it bundles a perf
 * build. Only valid for the APK built alongside it, which is the normal case:
 * build, then run.
 */
function loadModuleMap() {
  const mapPath = path.join(__dirname, 'build', 'module-map.json');
  try {
    return JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  } catch {
    return null;
  }
}

// --------------------------------------------------------- scenario execution

/**
 * One iteration of one scenario. Returns a flat metric object, plus any
 * per-screen transition timings from the instrumented build.
 */
async function runIteration(ctx, scenario) {
  const {serial} = ctx;
  const metrics = {};
  let transitions = {};

  const sampler = android.createCpuSampler(serial);
  const memSamples = [];
  const wantsMemory = (scenario.measures || []).includes('memory');

  let samplerTimer = null;
  const startSampling = () => {
    samplerTimer = setInterval(() => {
      sampler.sample();
      // dumpsys meminfo is a binder call into the process being measured, so
      // it is only sampled for scenarios that actually report memory.
      if (wantsMemory) {
        const mem = android.readMemoryMb(serial);
        if (mem.pss_mb !== null) {
          memSamples.push(mem);
        }
      }
    }, 1000);
  };
  const stopSampling = () => {
    if (samplerTimer) {
      clearInterval(samplerTimer);
      samplerTimer = null;
    }
  };

  try {
    // Anchor for "launch → target element visible". For startup scenarios this
    // must start at the launch, not after the logcat wait has resolved.
    let visibleAnchor = null;

    // Once an iteration has shown this build never reports "Fully drawn"
    // (i.e. it isn't an IS_PERF build), stop waiting out the grace period on
    // every subsequent run — it was costing ~8s per iteration for nothing.
    const fullyDrawnGraceMs = ctx.expectFullyDrawn === false ? 0 : undefined;

    if (scenario.launchMode === 'cold') {
      android.forceStop(serial);
      await sleep(1500);
      android.resetGfxInfo(serial);
      startSampling();
      visibleAnchor = Date.now();
      Object.assign(
        metrics,
        await android.launchAndMeasure(serial, {fullyDrawnGraceMs}),
      );
    } else if (scenario.launchMode === 'warm') {
      startSampling();
      visibleAnchor = Date.now();
      Object.assign(metrics, await android.warmRestart(serial));
    } else if (scenario.launchMode === 'hot') {
      startSampling();
      visibleAnchor = Date.now();
      Object.assign(metrics, await android.hotRestart(serial));
    } else {
      // Interaction scenarios need the app already running and settled.
      if (!android.getPid(serial)) {
        await android.launchAndMeasure(serial);
        await sleep(3000);
      }
      // Startup launches clear the log themselves; interaction runs must clear
      // it here so the collector only sees this iteration's payloads.
      android.clearLogcat(serial);
      // Activity scenarios diff the app's 2 s activity snapshots; let one
      // land while the app is idle so the flow has a clean starting point.
      if ((scenario.measures || []).includes('activity')) {
        await sleep(2600);
      }
      android.resetGfxInfo(serial);
      startSampling();
      visibleAnchor = Date.now();
    }

    if (scenario.flow) {
      const result = await maestro.runFlow(scenario.flow, {serial});

      if (!result.ok) {
        stopSampling();
        return {
          failed: true,
          reason: result.timedOut
            ? `flow timed out after ${result.durationMs}ms`
            : (result.stderr || result.stdout || '')
                .split('\n')
                .slice(-6)
                .join('\n'),
        };
      }

      metrics.visible_ms = Date.now() - visibleAnchor;
    }

    stopSampling();

    // Learn whether this build reports fully-drawn at all, so later iterations
    // can skip the grace wait.
    if (scenario.launchMode === 'cold' && ctx.expectFullyDrawn === undefined) {
      ctx.expectFullyDrawn = metrics.ttfd_ms !== null;
    }

    if ((scenario.measures || []).includes('frames')) {
      const gfx = android.readGfxInfo(serial);

      // Booleans are not metrics — lift it to a run-level flag so the report
      // can warn that the modern jank number is untrustworthy here.
      if (gfx.gpu_timing_unavailable) {
        ctx.gpuTimingUnavailable = true;
      }
      delete gfx.gpu_timing_unavailable;

      Object.assign(metrics, gfx);
    }

    if (memSamples.length) {
      const pssValues = memSamples.map(m => m.pss_mb).filter(Number.isFinite);
      if (pssValues.length) {
        metrics.peak_pss_mb = Math.max(...pssValues);
        metrics.pss_mb = stats.median(pssValues);
      }
    }

    Object.assign(metrics, sampler.results());

    // Instrumented builds emit their timeline to logcat. This wait must exceed
    // PerfMonitor's 2s flush interval, otherwise the last transitions of a flow
    // are still buffered when we read and get discarded with the next
    // iteration's log clear.
    await sleep(3000);
    let payloads = collector.collect(serial);

    // startup-load holds the iteration open until the app's 'settled' load
    // snapshot (~10s after the splash hides) has been emitted.
    if (scenario.settleForLoadProfile) {
      const deadline = Date.now() + 20000;
      const hasSettled = () =>
        payloads.some(p => p.kind === 'load' && p.label === 'settled');
      while (!hasSettled() && Date.now() < deadline) {
        await sleep(1000);
        payloads = collector.collect(serial);
      }
    }
    const startupPayload = payloads.find(p => p.kind === 'startup');
    const navPayloads = payloads.filter(p => p.kind === 'navigation');

    if (startupPayload) {
      Object.assign(metrics, collector.extractStartupTimeline(startupPayload));
      ctx.sawInstrumentation = true;
    }

    navPayloads.forEach(p => {
      transitions = {...transitions, ...collector.extractTransitions(p)};
    });
    if (navPayloads.length) {
      ctx.sawInstrumentation = true;
    }

    // Total CPU work to start and settle, by thread (see readThreadCpuTotals).
    if (scenario.settleForLoadProfile) {
      Object.assign(metrics, android.readThreadCpuTotals(serial));
    }

    let profile = null;
    if ((scenario.measures || []).includes('activity')) {
      // The final snapshot can trail the flow by up to one interval.
      await sleep(2000);
      payloads = collector.collect(serial);
      const activity = collector.extractActivity(payloads);
      Object.assign(metrics, activity.metrics);
      profile = activity.profile;
    }
    if ((scenario.measures || []).includes('load')) {
      const load = collector.extractLoadProfile(payloads, ctx.moduleMap);
      Object.assign(metrics, load.metrics);
      profile = load.profile;
      if (!load.sawLabels.includes('settled')) {
        ctx.missingSettledLoad = true;
      }
    }

    return {metrics, transitions, profile};
  } finally {
    stopSampling();
  }
}

async function runScenario(ctx, scenarioName) {
  const scenario = SCENARIOS[scenarioName];

  if (!scenario) {
    throw new Error(
      `Unknown scenario "${scenarioName}". Known: ${Object.keys(SCENARIOS).join(
        ', ',
      )}`,
    );
  }

  const totalRuns = ctx.runs + ctx.discard;
  const iterations = [];
  const transitionRuns = [];
  const failures = [];
  let lastProfile = null;
  // Per-run action counts: cheap, and what explains a run that did far more
  // work than its neighbours.
  const actionsByRun = [];

  log(`\n▸ ${scenarioName} — ${scenario.description}`);

  for (let i = 0; i < totalRuns; i++) {
    const isWarmup = i < ctx.discard;
    process.stdout.write(
      `  run ${i + 1}/${totalRuns}${
        isWarmup ? ' (warm-up, discarded)' : ''
      } ... `,
    );

    const result = await runIteration(ctx, scenario);

    if (result.failed) {
      process.stdout.write('FAILED\n');
      failures.push({run: i + 1, reason: result.reason});
    } else {
      const headline =
        result.metrics.ttid_ms ??
        result.metrics.visible_ms ??
        result.metrics.avg_cpu_pct;
      process.stdout.write(`${headline !== undefined ? headline : 'ok'}\n`);

      if (!isWarmup) {
        iterations.push(result.metrics);
        transitionRuns.push(result.transitions || {});
        if (result.profile) {
          lastProfile = result.profile;
          actionsByRun.push({
            ...Object.fromEntries(
              Object.entries(result.profile.actions || {}).map(([k, v]) => [
                k,
                v.count,
              ]),
            ),
            _details: result.profile.actionDetails || [],
            _js_cpu_ms: result.metrics.js_cpu_ms_settled ?? null,
          });
        }
      }
    }

    if (i < totalRuns - 1) {
      await sleep(ctx.cooldownMs);
    }
  }

  if (failures.length) {
    warn(
      `${failures.length}/${totalRuns} iteration(s) failed. First failure:\n    ${failures[0].reason}`,
    );
  }

  const screens = new Set();
  transitionRuns.forEach(t => Object.keys(t).forEach(s => screens.add(s)));

  const perScreen = {};
  screens.forEach(screen => {
    perScreen[screen] = {
      transition_ms: stats.summarize(
        transitionRuns.map(t => t[screen]),
        {maxCov: ctx.maxCov},
      ),
    };
  });

  return {
    description: scenario.description,
    metrics: stats.summarizeRuns(iterations, {maxCov: ctx.maxCov}),
    perScreen,
    // Detail from the last measured iteration — names what loaded, which the
    // aggregated metrics cannot.
    profile: lastProfile,
    actionsByRun,
    failures,
    completedRuns: iterations.length,
  };
}

// ------------------------------------------------------------------- commands

async function cmdRun(args) {
  const artifact = args.artifact || args.apk;

  if (!artifact) {
    throw new Error('--artifact <path-to-apk> is required');
  }
  if ((args.platform || 'android') !== 'android') {
    throw new Error(
      'Only --platform android is implemented. iOS support is a separate phase; see perf/README.md.',
    );
  }

  const artifactPath = path.resolve(artifact);
  const device = android.resolveDevice(args.device);
  const info = android.deviceInfo(device.serial);

  const runs = positiveInt(args.runs, DEFAULTS.runs);
  const discard =
    args.discard === undefined
      ? DEFAULTS.discardFirstRuns
      : positiveInt(args.discard, DEFAULTS.discardFirstRuns);
  const cooldownMs = positiveInt(args.cooldown, DEFAULTS.cooldownMs);
  const disableAnimations = args.animations !== 'on';

  const scenarioNames = (
    args.scenarios ? String(args.scenarios).split(',') : Object.keys(SCENARIOS)
  ).map(s => s.trim());

  log(`Artifact : ${artifactPath}`);
  log(
    `Device   : ${info.model} (${info.serial})${
      info.isEmulator ? ' [emulator]' : ''
    }`,
  );
  log(`Android  : ${info.androidVersion} / SDK ${info.sdkInt} / ${info.abi}`);
  log(`Runs     : ${runs} + ${discard} discarded warm-up`);

  const warnings = [];
  const health = android.checkDeviceHealth(info.serial);
  health.warnings.forEach(w => {
    warn(w);
    warnings.push(w);
  });

  if (info.isEmulator) {
    const msg =
      'Emulator run — results are valid for same-machine A/B comparison only, not as absolute figures.';
    warn(msg);
    warnings.push(msg);
  }

  // BP_PERF_SKIP_INSTALL=1 measures the build already on the device as it is
  // — e.g. after `cmd package compile`, which a reinstall would undo.
  const skipInstall = process.env.BP_PERF_SKIP_INSTALL === '1';
  if (skipInstall) {
    const msg =
      'BP_PERF_SKIP_INSTALL=1: measuring the installed build; the --artifact APK was not installed.';
    warn(msg);
    warnings.push(msg);
  } else {
    log('\nInstalling artifact...');
  }
  const installResult = skipInstall
    ? {reinstalled: false}
    : android.install(info.serial, artifactPath);

  if (installResult.reinstalled) {
    const msg =
      'Existing install had a different signature and was uninstalled — app data is wiped, so the device is in a fresh-install state.';
    warn(msg);
    warnings.push(msg);
  }

  const ctx = {
    serial: info.serial,
    runs,
    discard,
    cooldownMs,
    maxCov: DEFAULTS.maxCoefficientOfVariation,
    sawInstrumentation: false,
    moduleMap: loadModuleMap(),
  };

  const scenarios = {};
  // Device state is mutated from here on — the finally block must cover every
  // subsequent failure path, including one in the very first scenario.
  const restore = android.prepareDevice(info.serial, {disableAnimations});

  try {
    for (const name of scenarioNames) {
      scenarios[name] = await runScenario(ctx, name);
    }
  } finally {
    android.restoreDevice(info.serial, restore);
  }

  if (ctx.missingSettledLoad) {
    const msg =
      "At least one iteration never received the app's 'settled' load snapshot; *_settled metrics there are missing, not zero.";
    warn(msg);
    warnings.push(msg);
  }

  if (ctx.gpuTimingUnavailable) {
    const msg =
      'GPU frame timing is unavailable on this device (typical of emulators using SwiftShader). "Janky frames" reports 0 regardless of actual jank — use the legacy jank percentage instead, and treat frame timing here as indicative only.';
    warn(msg);
    warnings.push(msg);
  }

  // Only meaningful if a scenario that can actually produce marks was run.
  // scroll-home, for instance, neither starts the app nor navigates, so it
  // emits nothing by design — telling the operator to rebuild would be wrong.
  const expectedInstrumentation = scenarioNames.some(name => {
    const measures = (SCENARIOS[name] || {}).measures || [];
    return measures.includes('jsTimeline') || measures.includes('transitions');
  });

  if (expectedInstrumentation && !ctx.sawInstrumentation) {
    const msg =
      'No in-app instrumentation received, though a scenario expected it. JS startup phases, per-screen transitions and TTFD are unavailable — build with `yarn build:android:perf` to collect them.';
    warn(msg);
    warnings.push(msg);
  }

  const results = {
    schemaVersion: 1,
    meta: {
      timestamp: new Date().toISOString(),
      appVersion: appVersion(),
      gitSha: gitSha(),
      platform: 'android',
      appId: APP_ID,
      artifact: {
        path: artifactPath,
        name: path.basename(artifactPath),
        sizeBytes: fs.statSync(artifactPath).size,
      },
      device: info,
      runs,
      discardedRuns: discard,
      animationsDisabled: disableAnimations,
      instrumented: ctx.sawInstrumentation,
      host: {platform: os.platform(), release: os.release()},
      battery: health.battery,
      thermalStatus: health.thermal,
      warnings,
    },
    scenarios,
    static: android.artifactStats(artifactPath),
  };

  ensureDir(RESULTS_DIR);
  const slug = `android-${timestampSlug()}`;
  const jsonPath = path.join(RESULTS_DIR, `${slug}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  const baselinePath = isDisabled(args.baseline)
    ? null
    : args.baseline && args.baseline !== true
    ? path.resolve(args.baseline)
    : path.join(BASELINES_DIR, baselineNameFor(info));

  let comparison = null;
  if (baselinePath && fs.existsSync(baselinePath)) {
    comparison = baselineLib.compare(results, baselineLib.load(baselinePath));
    log(`\nBaseline : ${path.relative(process.cwd(), baselinePath)}`);
  } else if (baselinePath) {
    log(
      `\nNo baseline yet for this device class. Promote this run with:\n  yarn perf:baseline --from ${path.relative(
        process.cwd(),
        jsonPath,
      )}`,
    );
  }

  const htmlPath = path.join(RESULTS_DIR, `${slug}.html`);
  report.write(htmlPath, results, comparison);

  printSummary(results, comparison);

  log(`\nJSON   : ${path.relative(process.cwd(), jsonPath)}`);
  log(`Report : ${path.relative(process.cwd(), htmlPath)}`);

  if (comparison && !comparison.passed) {
    process.exitCode = 1;
  }
}

function printSummary(results, comparison) {
  log('\n─── summary ───────────────────────────────────────');

  Object.entries(results.scenarios).forEach(([name, data]) => {
    const headline = [
      'ttid_ms',
      'ttfd_ms',
      'visible_ms',
      'janky_frames_pct',
      // Shown alongside the modern metric because the two disagree whenever
      // GPU timing is missing, and the legacy one is the honest number there.
      'janky_frames_legacy_pct',
      'avg_cpu_pct',
    ]
      .map(key => {
        const m = data.metrics[key];
        if (!m || m.median === null) {
          return null;
        }
        const flag = m.reliable === false ? ' (unreliable)' : '';
        return `${key}=${m.median}±${m.stddev}${flag}`;
      })
      .filter(Boolean);

    log(
      `${name}: ${
        headline.length ? headline.join('  ') : 'no metrics collected'
      }`,
    );
  });

  if (comparison) {
    if (!comparison.identity.comparable) {
      log('\nBaseline skipped — different device class.');
    } else if (comparison.passed) {
      log(
        `\n✓ No regressions (${comparison.comparisons.length} metrics compared).`,
      );
    } else {
      log(`\n✗ ${comparison.regressions.length} regression(s):`);
      comparison.regressions.forEach(r =>
        log(
          `   ${r.scenario}${r.screen ? '/' + r.screen : ''} ${r.metric}: ${
            r.baseline
          } → ${r.candidate} (${r.pctChange > 0 ? '+' : ''}${r.pctChange}%)`,
        ),
      );
    }

    if (comparison.missing && comparison.missing.length) {
      log(
        `\n! ${comparison.missing.length} metric(s) present in the baseline but missing from this run:`,
      );
      comparison.missing
        .slice(0, 10)
        .forEach(m => log(`   ${m.scenario} ${m.metric}`));
    }
  }
}

function cmdBaseline(args) {
  const from = args.from || args._[0];

  if (!from) {
    throw new Error('--from <results.json> is required');
  }

  const results = baselineLib.load(path.resolve(from));
  ensureDir(BASELINES_DIR);

  const target = path.join(BASELINES_DIR, baselineNameFor(results.meta.device));
  baselineLib.save(target, results);

  log(`Baseline written: ${path.relative(process.cwd(), target)}`);
  log(
    `  device : ${results.meta.device.model}${
      results.meta.device.isEmulator ? ' (emulator)' : ''
    }`,
  );
  log(`  version: ${results.meta.appVersion} @ ${results.meta.gitSha}`);
}

function cmdCompare(args) {
  const [a, b] = args._;

  if (!a || !b) {
    throw new Error('usage: perf compare <baseline.json> <candidate.json>');
  }

  const baseline = baselineLib.load(path.resolve(a));
  const candidate = baselineLib.load(path.resolve(b));
  const comparison = baselineLib.compare(candidate, baseline);

  printSummary(candidate, comparison);

  ensureDir(RESULTS_DIR);
  const out = path.join(RESULTS_DIR, `compare-${timestampSlug()}.html`);
  report.write(out, candidate, comparison);
  log(`\nReport : ${path.relative(process.cwd(), out)}`);

  if (!comparison.passed) {
    process.exitCode = 1;
  }
}

function cmdReport(args) {
  const from = args.from || args._[0];

  if (!from) {
    throw new Error('--from <results.json> is required');
  }

  const results = baselineLib.load(path.resolve(from));
  const out = String(from).replace(/\.json$/, '.html');

  report.write(out, results, null);
  log(`Report : ${path.relative(process.cwd(), out)}`);
}

function usage() {
  log(`
Performance harness for ${APP_ID}

  perf run       --artifact <apk> [--runs N] [--scenarios a,b] [--device serial]
                 [--baseline <path>|--baseline false] [--animations on] [--cooldown ms]
  perf baseline  --from <results.json>      promote a run to the baseline for its device class
  perf compare   <baseline.json> <candidate.json>
  perf report    --from <results.json>      regenerate HTML from stored results

Scenarios: ${Object.keys(SCENARIOS).join(', ')}
`);
}

// ---------------------------------------------------------------------- main

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0];
  const args = parseArgs(argv.slice(1));

  try {
    switch (command) {
      case 'run':
        await cmdRun(args);
        break;
      case 'baseline':
        cmdBaseline(args);
        break;
      case 'compare':
        cmdCompare(args);
        break;
      case 'report':
        cmdReport(args);
        break;
      default:
        usage();
        process.exitCode = command ? 1 : 0;
    }
  } catch (e) {
    console.error(`\nError: ${e.message}`);
    process.exitCode = 1;
  }
}

main();
