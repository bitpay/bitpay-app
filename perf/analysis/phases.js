/**
 * Startup phase durations, derived from the timeline marks.
 *
 * Absolute mark positions inherit every earlier phase's jitter (splash_hidden
 * carries ±300ms of it), so a fix that shortens one phase can vanish in the
 * noise of its end mark. Durations between adjacent marks are far tighter,
 * which is what lets the loop see a 50ms win in a 3.8s startup.
 *
 * Each entry: [metric, endMark, startMark] using the collector's *_ms keys.
 */
const PHASES = [
  [
    'phase_native_app_create_ms',
    'native_app_create_end_ms',
    'native_app_create_start_ms',
  ],
  [
    'phase_launch_trampoline_ms',
    'native_activity_create_start_ms',
    'native_app_create_end_ms',
  ],
  [
    'phase_integrity_check_ms',
    'native_integrity_checked_ms',
    'native_activity_create_start_ms',
  ],
  [
    'phase_activity_create_ms',
    'native_activity_create_end_ms',
    'native_activity_create_start_ms',
  ],
  [
    'phase_rn_start_to_js_entry_ms',
    'js_entry_ms',
    'native_activity_create_end_ms',
  ],
  ['phase_store_create_ms', 'store_ready_ms', 'js_entry_ms'],
  ['phase_wallet_secrets_ms', 'wallet_secrets_done_ms', 'ssl_pinning_done_ms'],
  ['phase_app_init_sync_ms', 'app_init_success_ms', 'wallet_secrets_done_ms'],
  ['phase_app_init_total_ms', 'app_init_success_ms', 'app_init_start_ms'],
  ['phase_route_ms', 'startup_route_ms', 'app_init_success_ms'],
  ['phase_home_render_ms', 'home_commit_ms', 'home_render_ms'],
  ['phase_home_commit_to_splash_ms', 'splash_hidden_ms', 'home_commit_ms'],
  ['phase_route_to_splash_ms', 'splash_hidden_ms', 'startup_route_ms'],
];

/** Add phase_* durations to one iteration's flat metrics. */
function addPhases(metrics) {
  PHASES.forEach(([key, end, start]) => {
    if (Number.isFinite(metrics[end]) && Number.isFinite(metrics[start])) {
      metrics[key] = Number((metrics[end] - metrics[start]).toFixed(2));
    }
  });
  return metrics;
}

module.exports = {PHASES, addPhases};
