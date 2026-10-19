import {NativeModules} from 'react-native';
import {IS_PERF} from '@env';

/**
 * In-app performance instrumentation.
 *
 * Everything in this module is inert unless the app was built with
 * `IS_PERF=true` (see `yarn build:android:perf`), mirroring the existing
 * `IS_MAESTRO` pattern in index.js. Production builds pay only a handful of
 * `if (!enabled) return;` checks.
 *
 * The one deliberate exception is `reportFullyDrawn()`, which ships enabled in
 * production: it is a public Android API designed for exactly this, costs
 * nothing, and is what makes Play Console startup vitals reflect the moment the
 * app is genuinely usable rather than the moment it first painted.
 *
 * Marks are collected via `react-native-performance`, which also supplies the
 * native launch timeline (nativeLaunchStart, runJsBundleStart/End,
 * contentAppeared) that JS cannot observe on its own.
 */

const enabled = IS_PERF === 'true';

type PerfEntry = {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  value?: number;
};

let performanceApi: any = null;

if (enabled) {
  try {
    // Required lazily so a missing/unlinked module can never break startup in
    // a build where instrumentation was accidentally left on.
    performanceApi = require('react-native-performance').default;
  } catch {
    performanceApi = null;
  }
}

const isReady = () => enabled && performanceApi !== null;

/**
 * Run `cb` once the JS thread goes idle.
 *
 * Stands in for `InteractionManager.runAfterInteractions`, which React Native
 * 0.87 removed: in release builds the export is simply undefined, so calling
 * it threw on the first navigation and took the instrumented app down at
 * launch. The timeout bounds how long a busy thread can defer a measurement.
 */
function afterIdle(cb: () => void): void {
  const idle = (global as any).requestIdleCallback;
  if (typeof idle === 'function') {
    idle(cb, {timeout: 10000});
  } else {
    setTimeout(cb, 0);
  }
}

const markedOnce = new Set<string>();

/**
 * Mark only the first occurrence — for render bodies and effects, which run
 * many times but whose first run is the startup cost.
 */
export function markOnce(name: string): void {
  if (!enabled || markedOnce.has(name)) {
    return;
  }
  markedOnce.add(name);
  mark(name);
}

/** Record a point in time. Safe to call from anywhere, including hot paths. */
export function mark(name: string): void {
  if (!isReady()) {
    return;
  }

  try {
    performanceApi.mark(name);
  } catch {
    // Instrumentation must never take the app down.
  }
}

export function measure(
  name: string,
  startMark: string,
  endMark: string,
): void {
  if (!isReady()) {
    return;
  }

  try {
    performanceApi.measure(name, startMark, endMark);
  } catch {
    /* ignore */
  }
}

function getEntries(): PerfEntry[] {
  if (!isReady()) {
    return [];
  }

  try {
    return performanceApi.getEntries().map((e: any) => ({
      name: e.name,
      entryType: e.entryType,
      startTime: e.startTime,
      duration: e.duration,
      ...(typeof e.value === 'number' ? {value: e.value} : {}),
    }));
  } catch {
    return [];
  }
}

/**
 * Ship a payload to the harness via the native module, which chunks it into
 * logcat.
 *
 * Not HTTP: release builds of this app block cleartext traffic to localhost
 * (`network_security_config.xml`) and reject any URL outside the manifest
 * allowlist (`AllowedUrlPrefixInterceptor`). A local HTTP sink would require
 * weakening both, which is not a trade worth making for instrumentation.
 * Logcat needs no permissions and no network.
 *
 * No-ops on iOS, where the native module does not exist yet.
 */
function post(kind: string, body: Record<string, unknown>): void {
  if (!enabled) {
    return;
  }

  try {
    NativeModules.AppPerf?.emit?.(
      kind,
      JSON.stringify({kind, at: Date.now(), ...body}),
    );
  } catch {
    // Dropping a metrics payload is always preferable to affecting the app.
  }
}

// ------------------------------------------------------------------ startup

let startupFlushed = false;

/**
 * Send the full startup timeline once the app is usable.
 *
 * Called from the bootsplash-hide branch in Root.tsx, which is the app's real
 * time-to-interactive: the point where a rendered, navigable screen replaces
 * the splash.
 */
export function flushStartup(): void {
  if (!enabled || startupFlushed) {
    return;
  }

  startupFlushed = true;

  // Let the frame that hides the splash actually render before serializing,
  // so `contentAppeared` is present in the payload.
  afterIdle(() => {
    post('startup', {entries: getEntries()});
  });
}

// --------------------------------------------------------------- navigation

const pendingTransitions = new Map<string, number>();
let lastRouteName: string | null = null;

/**
 * Feed this the NavigationContainer's state on every change.
 *
 * What it measures: from the moment the navigation state names a new route to
 * the moment interactions on that route have settled — i.e. mount, render and
 * transition animation.
 *
 * What it does NOT measure: the gap between the user's touch and React
 * Navigation dispatching the change. Capturing that needs a press-time hook on
 * every control, which is not worth the invasiveness; the number here is still
 * the right one for catching "this screen got slower to open".
 */
export function onNavigationStateChange(currentRouteName?: string): void {
  if (!enabled || !currentRouteName) {
    return;
  }

  if (currentRouteName === lastRouteName) {
    return;
  }

  lastRouteName = currentRouteName;

  const startMark = `bp_nav_start:${currentRouteName}`;
  mark(startMark);
  pendingTransitions.set(currentRouteName, Date.now());

  afterIdle(() => {
    const started = pendingTransitions.get(currentRouteName);
    if (started === undefined) {
      return;
    }

    pendingTransitions.delete(currentRouteName);

    const endMark = `bp_nav_end:${currentRouteName}`;
    mark(endMark);
    measure(`bp_nav:${currentRouteName}`, startMark, endMark);
  });
}

/**
 * Ship the navigation measures collected so far. The harness calls for these
 * at the end of a scenario; batching keeps the sink off the critical path
 * during the transitions being measured.
 */
export function flushNavigation(): void {
  if (!enabled) {
    return;
  }

  const entries = getEntries().filter(
    e => e.entryType === 'measure' && e.name.startsWith('bp_nav:'),
  );

  if (!entries.length) {
    return;
  }

  post('navigation', {entries});

  // Clear what we just sent. Without this every flush re-sends the whole
  // history, so the harness's per-iteration "worst transition" would actually
  // be "worst transition across all iterations so far" — samples stop being
  // independent, medians drift upward and the reported spread is fiction.
  entries.forEach(entry => {
    try {
      performanceApi.clearMeasures(entry.name);
    } catch {
      /* ignore */
    }
  });
}

/** Periodic flush so long interaction scenarios report before they end. */
let flushTimer: ReturnType<typeof setInterval> | null = null;

// Kept below the harness's post-scenario collection wait so the final
// transitions of a flow are always emitted before the log is read.
export function startNavigationReporting(intervalMs = 2000): void {
  if (!enabled || flushTimer) {
    return;
  }

  flushTimer = setInterval(flushNavigation, intervalMs);
}

export function stopNavigationReporting(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

export const isPerfEnabled = enabled;

// ------------------------------------------------------------- load profile

/**
 * "How much is loading at once": what the app does between launch and the
 * moment it settles, beyond the phase timeline above.
 *
 *   - JS modules initialised, from perf/runtime/module-timer.js (a Metro
 *     polyfill present only in perf builds)
 *   - network requests started, via a thin XMLHttpRequest wrapper (fetch is
 *     built on XHR in React Native, so this sees both)
 *   - Redux actions dispatched, via perfActionMiddleware in src/store
 *   - Hermes heap size, and the serialised size of each store slice
 *
 * Emitted twice per launch: when the splash hides ('ttfd') and again once the
 * app has had time to settle ('settled'), so startup work deferred until just
 * after first paint is visible too.
 */

type RequestRecord = {
  method: string;
  url: string;
  startMs: number;
  durationMs: number | null;
  status: number | null;
  bytes: number | null;
};

const LOAD_SETTLE_MS = 10000;
const requests: RequestRecord[] = [];
const actionCounts: Record<string, {count: number; ms: number}> = {};
let getStoreState: (() => Record<string, unknown>) | null = null;
const perfNow = () =>
  typeof (global as any).nativePerformanceNow === 'function'
    ? (global as any).nativePerformanceNow()
    : Date.now();

/** Strip query strings and ids so requests group by endpoint. */
function endpointOf(url: string): string {
  const withoutQuery = String(url).split(/[?#]/)[0];
  return withoutQuery
    .replace(/\/[0-9a-f]{16,}(?=\/|$)/gi, '/:id')
    .replace(/\/0x[0-9a-f]{20,}(?=\/|$)/gi, '/:addr')
    .replace(/\/\d+(?=\/|$)/g, '/:n');
}

if (enabled && typeof XMLHttpRequest !== 'undefined') {
  const proto = XMLHttpRequest.prototype as any;
  const open = proto.open;
  const send = proto.send;
  proto.open = function (method: string, url: string, ...rest: unknown[]) {
    this.__bpPerf = {method, url: endpointOf(url)};
    return open.call(this, method, url, ...rest);
  };
  proto.send = function (...args: unknown[]) {
    const meta = this.__bpPerf;
    if (meta) {
      const record: RequestRecord = {
        method: meta.method,
        url: meta.url,
        startMs: perfNow(),
        durationMs: null,
        status: null,
        bytes: null,
      };
      requests.push(record);
      this.addEventListener?.('loadend', () => {
        record.durationMs = perfNow() - record.startMs;
        record.status = this.status;
        // Check responseType before touching responseText: React Native's XHR
        // throws when responseText is read on a 'blob' response (images), and
        // an exception here surfaced as an "Unexpected error" alert in the
        // Shop tab of perf builds.
        try {
          record.bytes =
            this.responseType === '' || this.responseType === 'text'
              ? String(this.responseText ?? '').length
              : null;
        } catch {
          record.bytes = null;
        }
      });
    }
    return send.apply(this, args);
  };
}

// Native component view configs requested from UIManager (perf builds only):
// name, time taken and when. Since configs are computed on first use, this
// says which components each startup phase pays to configure.
const viewConfigRequests: Array<[string, number, number]> = [];
if (enabled) {
  try {
    const {UIManager} = require('react-native');
    const original = UIManager.getViewManagerConfig;
    const seen = new Set<string>();
    UIManager.getViewManagerConfig = (name: string) => {
      if (seen.has(name)) {
        return original.call(UIManager, name);
      }
      seen.add(name);
      const started = perfNow();
      const config = original.call(UIManager, name);
      viewConfigRequests.push([
        name,
        Math.round((perfNow() - started) * 10) / 10,
        Math.round(started),
      ]);
      return config;
    };
  } catch {
    // instrumentation must never break the app
  }
}

/** Called from src/store once the store exists, for slice sizes. */
export function registerStoreForPerf(
  getState: () => Record<string, unknown>,
): void {
  if (enabled) {
    getStoreState = getState;
  }
}

// Actions whose payload explains a run, recorded verbatim (perf builds only).
const DETAIL_ACTION_TYPES = new Set(['PORTFOLIO/START_POPULATE_PORTFOLIO']);
const actionDetails: Array<{type: string; at: number; payload: unknown}> = [];

/** Redux middleware body — counts and times every dispatched action. */
export function recordAction(
  type: string,
  ms: number,
  payload?: unknown,
): void {
  if (!enabled) {
    return;
  }
  if (DETAIL_ACTION_TYPES.has(type) && actionDetails.length < 20) {
    actionDetails.push({type, at: Math.round(perfNow()), payload});
  }
  const entry = actionCounts[type] || (actionCounts[type] = {count: 0, ms: 0});
  entry.count++;
  entry.ms += ms;
}

function moduleSummary(full: boolean) {
  const stats = (global as any).__BP_MODULE_STATS__;
  if (!stats) {
    return null;
  }
  const {records, count} = stats as {records: number[]; count: number};
  let totalSelfMs = 0;
  const all: Array<[number, number, number]> = [];
  for (let i = 0; i < records.length; i += 3) {
    totalSelfMs += records[i + 1];
    all.push([records[i], records[i + 1], records[i + 2]]);
  }
  // Full records let the harness bucket module cost by startup phase. Kept
  // compact: [id, selfMs×10, startMs] as integers.
  const compact = full
    ? all.map(([id, self, start]) => [
        id,
        Math.round(self * 10),
        Math.round(start),
      ])
    : undefined;
  all.sort((a, b) => b[1] - a[1]);
  return {
    count,
    totalSelfMs,
    // Absolute time of the module timer's origin, on the same clock as the
    // performance marks, so startMs can be placed on the startup timeline.
    origin: (global as any).__BP_MODULE_STATS__?.origin,
    all: compact,
    // [moduleId, selfMs, startMs] — the harness maps ids to paths.
    top: all
      .slice(0, 60)
      .map(([id, self, start]) => [
        id,
        Math.round(self * 100) / 100,
        Math.round(start),
      ]),
  };
}

function storeSizes(): Record<string, number> | null {
  if (!getStoreState) {
    return null;
  }
  try {
    const state = getStoreState();
    const sizes: Record<string, number> = {};
    Object.keys(state).forEach(slice => {
      try {
        sizes[slice] = JSON.stringify(state[slice])?.length ?? 0;
      } catch {
        sizes[slice] = -1;
      }
    });
    return sizes;
  } catch {
    return null;
  }
}

function heapStats(): Record<string, number> | null {
  try {
    return (global as any).HermesInternal?.getInstrumentedStats?.() ?? null;
  } catch {
    return null;
  }
}

/**
 * Profiling builds only: have the native side write the Hermes sampled trace
 * (started in PerfMarks.startJsProfiler) to the app's external files dir,
 * which `adb pull` can read on a release build. Non-profiling builds reject
 * immediately and nothing is posted.
 */
function dumpJsProfile(): void {
  const appPerf = NativeModules.AppPerf;
  if (!appPerf?.dumpJsProfile) {
    return;
  }
  let dir: string;
  try {
    dir = require('react-native-fs').ExternalDirectoryPath;
  } catch {
    return;
  }
  appPerf
    .dumpJsProfile(`${dir}/bp-startup-profile.json`)
    .then((file: string) => post('profile', {file}))
    .catch((e: any) => {
      if (e?.code !== 'E_NOT_PROFILING') {
        post('profile', {error: String(e?.message || e)});
      }
    });
}

function flushLoad(label: string): void {
  post('load', {
    label,
    modules: moduleSummary(label === 'ttfd'),
    requests: requests.slice(),
    actions: actionCounts,
    actionDetails,
    viewConfigs: viewConfigRequests.slice(),
    heap: heapStats(),
    // Slice sizes are the expensive part (a full serialisation), so they are
    // only taken once the app has settled.
    store: label === 'settled' ? storeSizes() : null,
  });
}

let loadScheduled = false;

/** Call when the splash hides. */
export function scheduleLoadProfile(): void {
  if (!enabled || loadScheduled) {
    return;
  }
  loadScheduled = true;
  afterIdle(() => flushLoad('ttfd'));
  setTimeout(
    () =>
      afterIdle(() => {
        flushLoad('settled');
        dumpJsProfile();
      }),
    LOAD_SETTLE_MS,
  );
}
