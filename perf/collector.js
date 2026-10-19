const {run} = require('./lib/exec');

/**
 * Collects in-app performance payloads from logcat.
 *
 * The app emits them through the `AppPerf` native module rather than over HTTP,
 * because release builds of this app block cleartext traffic to localhost
 * (`network_security_config.xml`) and reject non-allowlisted URLs
 * (`AllowedUrlPrefixInterceptor`). Logcat sidesteps both.
 *
 * Wire format, one logcat line per chunk:
 *   BPPERF|<seq>|<index>|<total>|<kind>|<payload chunk>
 */

const LINE_RE = /BPPERF\|(\d+)\|(\d+)\|(\d+)\|([A-Za-z0-9_-]+)\|(.*)$/;

/**
 * Read and reassemble every complete payload currently in the log buffer.
 *
 * Incomplete sets (a payload still being written, or one whose head was lost to
 * log rotation) are skipped rather than parsed partially — a truncated payload
 * would produce a plausible-looking but wrong timeline.
 */
function collect(serial) {
  const args = serial ? ['-s', serial] : [];
  const {stdout} = run('adb', [
    ...args,
    'logcat',
    '-d',
    '-v',
    'raw',
    '-s',
    'BitPayPerf:I',
  ]);

  const bySeq = new Map();

  stdout.split('\n').forEach(line => {
    const m = line.match(LINE_RE);
    if (!m) {
      return;
    }

    const [, seq, index, total, kind, chunk] = m;
    const key = seq;

    if (!bySeq.has(key)) {
      bySeq.set(key, {kind, total: Number(total), chunks: new Map()});
    }

    bySeq.get(key).chunks.set(Number(index), chunk);
  });

  const payloads = [];

  // Ascending sequence keeps payloads in emission order.
  [...bySeq.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .forEach(([seq, {kind, total, chunks}]) => {
      if (chunks.size !== total) {
        return;
      }

      let json = '';
      for (let i = 0; i < total; i++) {
        const part = chunks.get(i);
        if (part === undefined) {
          return;
        }
        json += part;
      }

      try {
        payloads.push({seq: Number(seq), kind, ...JSON.parse(json)});
      } catch (e) {
        // Malformed payload — drop it rather than reporting a partial timeline.
      }
    });

  return payloads;
}

/**
 * Turn the app's raw `performance` entries into the flat startup metrics the
 * report expects. All values are milliseconds relative to nativeLaunchStart,
 * which is the only origin comparable across runs.
 */
function extractStartupTimeline(payload) {
  if (!payload || !Array.isArray(payload.entries)) {
    return {};
  }

  const byName = {};
  payload.entries.forEach(e => {
    // Keep the earliest occurrence — later duplicates are re-renders.
    if (byName[e.name] === undefined || e.startTime < byName[e.name]) {
      byName[e.name] = e.startTime;
    }
  });

  const origin = byName.nativeLaunchStart ?? 0;
  const rel = name =>
    byName[name] === undefined
      ? null
      : Number((byName[name] - origin).toFixed(2));

  const bundleStart = byName.runJsBundleStart;
  const bundleEnd = byName.runJsBundleEnd;

  return {
    native_launch_end_ms: rel('nativeLaunchEnd'),
    js_bundle_exec_ms:
      bundleStart !== undefined && bundleEnd !== undefined
        ? Number((bundleEnd - bundleStart).toFixed(2))
        : null,
    js_entry_ms: rel('bp_js_entry'),
    store_ready_ms: rel('bp_store_ready'),
    rehydrate_ms: rel('bp_store_rehydrated'),
    app_init_ms: rel('bp_app_initialized'),
    nav_ready_ms: rel('bp_nav_ready'),
    splash_hidden_ms: rel('bp_splash_hidden'),
    content_appeared_ms: rel('contentAppeared'),
  };
}

/** Per-screen navigation transition durations emitted by the nav listener. */
function extractTransitions(payload) {
  if (!payload || !Array.isArray(payload.entries)) {
    return {};
  }

  const transitions = {};
  payload.entries
    .filter(e => e.entryType === 'measure' && e.name.startsWith('bp_nav:'))
    .forEach(e => {
      const screen = e.name.replace('bp_nav:', '');
      // Keep the slowest observation per screen within a run — the worst case
      // is what a user notices, and averaging hides it.
      transitions[screen] = Math.max(
        transitions[screen] || 0,
        Number(e.duration.toFixed(2)),
      );
    });

  return transitions;
}

module.exports = {collect, extractStartupTimeline, extractTransitions, LINE_RE};
