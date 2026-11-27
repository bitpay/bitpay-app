import {NativeModules, Platform} from 'react-native';

/**
 * Tells Android the app has finished drawing everything the user needs.
 *
 * Unlike the rest of `src/perf`, this is NOT gated behind IS_PERF — it ships in
 * production. Android's built-in startup measurement stops at the first
 * rendered frame, which for this app is the bootsplash; without
 * reportFullyDrawn, Play Console vitals describe a splash screen rather than a
 * usable wallet.
 *
 * No-ops on iOS and on any build where the native module is unavailable.
 */
export function reportFullyDrawn(): void {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    NativeModules.AppPerf?.reportFullyDrawn?.();
  } catch {
    // Never let a metrics call affect startup.
  }
}
