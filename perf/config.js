/**
 * Central configuration for the performance harness.
 *
 * Everything that decides "what counts as a regression" lives here so the
 * thresholds are reviewable in a diff rather than buried in the analysis code.
 */

const APP_ID = 'com.bitpay.wallet';

/**
 * The manifest LAUNCHER is `.LaunchActivity`, a trampoline that immediately
 * starts `.MainActivity` and finishes itself. Two consequences the drivers
 * must respect:
 *
 *   1. Launch through LAUNCHER_ACTIVITY so we measure the real user path.
 *   2. Take TTID from the logcat `Displayed <pkg>/.MainActivity` line, NOT from
 *      `am start -W` TotalTime — that value describes the trampoline, which
 *      finishes before the app has drawn anything, and understates startup.
 */
const LAUNCHER_ACTIVITY = `${APP_ID}/.LaunchActivity`;
const DRAWN_ACTIVITY = `${APP_ID}/.MainActivity`;

const DEFAULTS = {
  runs: 10,
  /** The first iteration warms dex/ART caches and page cache — never counted. */
  discardFirstRuns: 1,
  /** Cool-down between iterations so thermal throttling doesn't skew later runs. */
  cooldownMs: 3000,
  /** Above this coefficient of variation a metric is reported as unreliable. */
  maxCoefficientOfVariation: 0.15,
  sinkPort: 8765,
};

/**
 * Regression thresholds, per metric key.
 *
 * `direction: 'lower'` means smaller is better (times, memory, size).
 * `direction: 'higher'` means bigger is better (frame rates).
 *
 * A metric only fails when BOTH conditions hold:
 *   - the median moved past the threshold, and
 *   - the move is larger than 2x the noise (max stddev of the two samples).
 * The second condition is what stops a noisy device from failing the build.
 */
const THRESHOLDS = {
  ttid_ms: {direction: 'lower', tolerance: 0.1},
  ttfd_ms: {direction: 'lower', tolerance: 0.1},
  am_total_time_ms: {direction: 'lower', tolerance: 0.15},
  // NOTE: `visible_ms` is deliberately NOT gated. Measured on a real run it is
  // dominated by harness overhead — Maestro's own driver startup is ~14s and
  // dwarfs the app's contribution, so a real 500ms app regression moves it by
  // ~2% and would never trip a threshold. It is reported for context only;
  // ttid_ms and ttfd_ms are the startup metrics worth gating on.
  transition_ms: {direction: 'lower', tolerance: 0.15},
  js_bundle_exec_ms: {direction: 'lower', tolerance: 0.1},
  store_ready_ms: {direction: 'lower', tolerance: 0.1},
  rehydrate_ms: {direction: 'lower', tolerance: 0.1},
  nav_ready_ms: {direction: 'lower', tolerance: 0.1},
  splash_hidden_ms: {direction: 'lower', tolerance: 0.1},
  peak_pss_mb: {direction: 'lower', tolerance: 0.15},
  avg_cpu_pct: {direction: 'lower', tolerance: 0.2},
  js_thread_cpu_pct: {direction: 'lower', tolerance: 0.2},
  janky_frames_pct: {direction: 'lower', tolerance: 0.2},
  // Gated as well as the modern metric: where GPU timing is unavailable this
  // is the only one that reflects reality (see readGfxInfo).
  janky_frames_legacy_pct: {direction: 'lower', tolerance: 0.2},
  frame_p95_ms: {direction: 'lower', tolerance: 0.2},
  frame_deadline_missed: {direction: 'lower', tolerance: 0.25},
  // Load profile (startup-load). Counts are close to deterministic for a given
  // wallet, so they get tight tolerances; times keep the usual ones.
  modules_ttfd: {direction: 'lower', tolerance: 0.03},
  module_init_ms_ttfd: {direction: 'lower', tolerance: 0.1},
  modules_settled: {direction: 'lower', tolerance: 0.03},
  requests_ttfd: {direction: 'lower', tolerance: 0.1},
  requests_settled: {direction: 'lower', tolerance: 0.1},
  actions_ttfd: {direction: 'lower', tolerance: 0.1},
  actions_settled: {direction: 'lower', tolerance: 0.1},
  action_ms_settled: {direction: 'lower', tolerance: 0.15},
  js_heap_mb_settled: {direction: 'lower', tolerance: 0.1},
  store_kb_settled: {direction: 'lower', tolerance: 0.05},
  /** Sizes are deterministic — zero noise, so a tight tolerance is safe. */
  apk_size_bytes: {direction: 'lower', tolerance: 0.05},
  bundle_size_bytes: {direction: 'lower', tolerance: 0.05},
};

/**
 * Scenario registry. `measures` documents which metric families a scenario is
 * expected to produce, so the report can tell "not collected" apart from
 * "collected and zero".
 */
const SCENARIOS = {
  'startup-cold': {
    flow: 'startup_cold.yaml',
    launchMode: 'cold',
    measures: ['startup', 'memory', 'cpu', 'jsTimeline'],
    description:
      'Force-stopped process, launched through the real LAUNCHER intent, timed to first draw and to fully-drawn.',
  },
  'startup-load': {
    // No Maestro flow: TTID/TTFD come from logcat, and Maestro's own driver
    // startup (~14s per run) was most of the wall-clock of startup-cold.
    flow: null,
    launchMode: 'cold',
    settleForLoadProfile: true,
    measures: ['startup', 'memory', 'cpu', 'jsTimeline', 'load'],
    description:
      'Cold start on the onboarded wallet, held until the app settles: timeline plus what loaded — modules, requests, actions, heap, store size. The self-healing loop gates on this.',
  },
  'startup-cold-fresh': {
    flow: 'startup_cold_fresh.yaml',
    launchMode: 'cold',
    measures: ['startup', 'memory', 'cpu', 'jsTimeline'],
    description:
      'Cold start on a fresh install, timed to the onboarding screen — the new-user first-launch experience.',
  },
  'startup-warm': {
    flow: 'startup_warm.yaml',
    launchMode: 'warm',
    measures: ['startup'],
    description:
      'Process killed while backgrounded, but files and pages still cached — the system-evicted warm start.',
  },
  'startup-hot': {
    flow: 'startup_hot.yaml',
    launchMode: 'hot',
    measures: ['startup'],
    description:
      'Resume from background — the most common real-world launch. Produces no TTID: the activity is never re-created, so the framework emits no Displayed line.',
  },
  'nav-tabs': {
    flow: 'nav_tabs.yaml',
    launchMode: 'none',
    measures: ['transitions', 'frames', 'cpu', 'memory'],
    description: 'Hops across the bottom tab bar, timing each transition.',
  },
  'scroll-home': {
    flow: 'scroll_home.yaml',
    launchMode: 'none',
    measures: ['frames', 'cpu', 'memory'],
    description: 'Scrolls the home surface to surface jank and dropped frames.',
  },
};

/**
 * Device state normalization. Applied before a session, restored after.
 * Recorded verbatim into results metadata so a reader can tell how the
 * numbers were produced.
 */
const DEVICE_PREP = {
  animationsDisabled: true,
  stayAwake: true,
  minBatteryPct: 30,
  /** Abort rather than publish numbers taken from a throttling device. */
  abortOnThermalThrottle: true,
};

module.exports = {
  APP_ID,
  LAUNCHER_ACTIVITY,
  DRAWN_ACTIVITY,
  DEFAULTS,
  THRESHOLDS,
  SCENARIOS,
  DEVICE_PREP,
};
