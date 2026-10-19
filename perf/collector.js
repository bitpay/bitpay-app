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

  // Every other `bp_*` mark (native PerfMarks.kt and JS sub-phase marks) is
  // reported generically as `<name>_ms`, so adding a mark in the app needs
  // no change here. Per-screen nav marks (`bp_nav_start:Foo`) are excluded.
  const named = new Set([
    'bp_js_entry',
    'bp_store_ready',
    'bp_store_rehydrated',
    'bp_app_initialized',
    'bp_nav_ready',
    'bp_splash_hidden',
  ]);
  const extra = {};
  Object.keys(byName)
    .filter(n => n.startsWith('bp_') && !n.includes(':') && !named.has(n))
    .forEach(n => {
      extra[`${n.slice(3)}_ms`] = rel(n);
    });

  // react-native-performance estimates nativeLaunchStart from CPU time; the
  // real process start (PerfMarks.processStart) shows how far off that is.
  const processStart = payload.entries.find(e => e.name === 'bp_process_start');
  if (processStart && typeof processStart.value === 'number') {
    extra.process_start_ms = Number((processStart.value - origin).toFixed(2));
  }

  return {
    ...extra,
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

/**
 * Load profile: what ran between launch and settling (see scheduleLoadProfile
 * in src/perf/PerfMonitor.ts). Two snapshots per launch — 'ttfd' when the
 * splash hides and 'settled' ~10s later.
 *
 * Returns flat metrics for statistics plus a `profile` with the detail
 * (heaviest modules by path, requests by endpoint, actions by type, store
 * bytes by slice) — the part that says what to fix, not just how much.
 */
function extractLoadProfile(payloads, moduleMap) {
  const byLabel = {};
  (payloads || [])
    .filter(p => p.kind === 'load')
    .forEach(p => {
      byLabel[p.label] = p;
    });

  const metrics = {};
  const profile = {};

  const sumActions = actions =>
    Object.values(actions || {}).reduce(
      (acc, a) => ({count: acc.count + a.count, ms: acc.ms + a.ms}),
      {count: 0, ms: 0},
    );

  ['ttfd', 'settled'].forEach(label => {
    const p = byLabel[label];
    if (!p) {
      return;
    }
    const round = v =>
      v === null || v === undefined ? null : Number(v.toFixed(2));
    if (p.modules) {
      metrics[`modules_${label}`] = p.modules.count;
      metrics[`module_init_ms_${label}`] = round(p.modules.totalSelfMs);
    }
    const reqs = p.requests || [];
    metrics[`requests_${label}`] = reqs.length;
    const acts = sumActions(p.actions);
    metrics[`actions_${label}`] = acts.count;
    metrics[`action_ms_${label}`] = round(acts.ms);
    if (p.heap && typeof p.heap.js_heapSize === 'number') {
      metrics[`js_heap_mb_${label}`] = round(p.heap.js_heapSize / 1048576);
    }
  });

  const settled = byLabel.settled || byLabel.ttfd;
  if (settled) {
    const reqs = settled.requests || [];
    metrics.request_kb_settled = Number(
      (reqs.reduce((s, r) => s + (r.bytes || 0), 0) / 1024).toFixed(1),
    );
    if (settled.heap && typeof settled.heap.js_numGCs === 'number') {
      metrics.js_gc_count_settled = settled.heap.js_numGCs;
    }
    if (settled.store) {
      metrics.store_kb_settled = Number(
        (
          Object.values(settled.store).reduce((s, v) => s + Math.max(v, 0), 0) /
          1024
        ).toFixed(1),
      );
      profile.storeBytes = settled.store;
    }

    const endpoints = {};
    reqs.forEach(r => {
      const key = `${r.method} ${r.url}`;
      const e =
        endpoints[key] ||
        (endpoints[key] = {count: 0, totalMs: 0, bytes: 0, failed: 0});
      e.count++;
      e.totalMs += r.durationMs || 0;
      e.bytes += r.bytes || 0;
      if (!r.status || r.status >= 400) {
        e.failed++;
      }
    });
    profile.requests = endpoints;
    profile.actions = settled.actions || {};
  }

  // Which JS initialised in which startup phase. With inline requires, a
  // module runs on first use, so this shows e.g. how much code the Home
  // screen's first render pulls in.
  const startup = (payloads || []).find(p => p.kind === 'startup');
  const ttfdMods = (byLabel.ttfd || {}).modules;
  if (startup && ttfdMods && Array.isArray(ttfdMods.all) && ttfdMods.origin) {
    profile.modulePhases = bucketModulesByPhase(startup, ttfdMods, moduleMap);
  }

  // Module detail from the ttfd snapshot: that is what blocked first use.
  const modSnap = (byLabel.ttfd || settled || {}).modules;
  if (modSnap) {
    profile.topModules = modSnap.top.map(([id, selfMs, startMs]) => ({
      id,
      path: (moduleMap && moduleMap[id]) || null,
      selfMs,
      startMs,
    }));
  }

  return {metrics, profile, sawLabels: Object.keys(byLabel)};
}

function bucketModulesByPhase(startupPayload, mods, moduleMap) {
  const marks = (startupPayload.entries || [])
    .filter(
      e =>
        e.entryType === 'mark' &&
        e.name.startsWith('bp_') &&
        !e.name.includes(':') &&
        !e.name.startsWith('bp_native_'),
    )
    .sort((a, b) => a.startTime - b.startTime);
  const bounds = marks.map(m => ({name: m.name.slice(3), at: m.startTime}));
  const phases = [];
  const phaseFor = absStart => {
    let i = 0;
    while (i < bounds.length && absStart >= bounds[i].at) {
      i++;
    }
    const from = i === 0 ? 'bundle start' : bounds[i - 1].name;
    const to = i === bounds.length ? 'after' : bounds[i].name;
    return `${from} → ${to}`;
  };
  const byPhase = new Map();
  mods.all.forEach(([id, self10, start]) => {
    const key = phaseFor(mods.origin + start);
    if (!byPhase.has(key)) {
      byPhase.set(key, {phase: key, count: 0, selfMs: 0, modules: []});
    }
    const b = byPhase.get(key);
    b.count++;
    b.selfMs += self10 / 10;
    b.modules.push({
      path: (moduleMap && moduleMap[id]) || `#${id}`,
      selfMs: self10 / 10,
    });
  });
  byPhase.forEach(b => {
    b.selfMs = Number(b.selfMs.toFixed(1));
    b.modules.sort((x, y) => y.selfMs - x.selfMs);
    b.top = b.modules.slice(0, 12);
    // Package-level rollup: which dependency dominates the phase.
    const pkgs = {};
    b.modules.forEach(m => {
      const pm = m.path.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
      const pkg = pm ? pm[1] : m.path.split('/').slice(0, 3).join('/');
      const e = pkgs[pkg] || (pkgs[pkg] = {count: 0, selfMs: 0});
      e.count++;
      e.selfMs += m.selfMs;
    });
    b.packages = Object.entries(pkgs)
      .map(([pkg, v]) => ({
        pkg,
        count: v.count,
        selfMs: Number(v.selfMs.toFixed(1)),
      }))
      .sort((x, y) => y.selfMs - x.selfMs)
      .slice(0, 12);
    delete b.modules;
    phases.push(b);
  });
  const order = bounds.map(b => b.name);
  return phases.sort(
    (a, b) =>
      order.indexOf(a.phase.split(' → ')[0]) -
      order.indexOf(b.phase.split(' → ')[0]),
  );
}

module.exports = {
  collect,
  extractStartupTimeline,
  extractTransitions,
  extractLoadProfile,
  LINE_RE,
};
