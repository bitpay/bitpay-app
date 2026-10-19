import {InteractionManager, NativeModules} from 'react-native';
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
  InteractionManager.runAfterInteractions(() => {
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

  InteractionManager.runAfterInteractions(() => {
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
