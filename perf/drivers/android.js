const fs = require('fs');
const path = require('path');
const {run, sleep} = require('../lib/exec');
const {
  APP_ID,
  LAUNCHER_ACTIVITY,
  DRAWN_ACTIVITY,
  DEVICE_PREP,
} = require('../config');

const adbBase = serial => (serial ? ['-s', serial] : []);

/**
 * React Native's JS thread: `mqt_v_js` on the new architecture, `mqt_js` on the
 * old one. Verified against this app on a device — it runs `mqt_v_js`.
 */
const JS_THREAD_RE = /^mqt(_v)?_js$/;

function adb(serial, args, opts) {
  return run('adb', [...adbBase(serial), ...args], opts);
}

function adbShell(serial, cmd) {
  return adb(serial, ['shell', cmd]);
}

/**
 * ActivityTaskManager prints durations as `+1s234ms`, `+834ms`, or `+1m2s10ms`.
 *
 * Each unit is matched independently rather than with one combined optional
 * pattern. A single `(?:(\d+)m)?(?:(\d+)s)?(?:(\d+)ms)?` looks correct but lets
 * the minutes group swallow the `m` of `ms`, so the very common `834ms` parses
 * as 834 *minutes*. That failure is invisible downstream — it yields a stable
 * median with a low coefficient of variation, so the harness would confidently
 * report a wrong number. Hence the negative lookahead on minutes.
 */
function parseAndroidDuration(text) {
  if (!text) {
    return null;
  }

  const minutes = /(\d+)m(?!s)/.exec(text);
  const seconds = /(\d+)s/.exec(text);
  const millis = /(\d+)ms/.exec(text);

  if (!minutes && !seconds && !millis) {
    return null;
  }

  return (
    Number(minutes ? minutes[1] : 0) * 60000 +
    Number(seconds ? seconds[1] : 0) * 1000 +
    Number(millis ? millis[1] : 0)
  );
}

function listDevices() {
  const {stdout} = run('adb', ['devices', '-l']);

  return stdout
    .split('\n')
    .slice(1)
    .map(l => l.trim())
    .filter(l => l && l.includes('device '))
    .map(l => {
      const serial = l.split(/\s+/)[0];
      const model = (l.match(/model:(\S+)/) || [])[1] || 'unknown';
      return {serial, model, isEmulator: serial.startsWith('emulator-')};
    });
}

function resolveDevice(preferred) {
  const devices = listDevices();

  if (!devices.length) {
    throw new Error(
      'No Android device or emulator connected. Start an emulator or plug in a device (adb devices).',
    );
  }

  if (preferred) {
    const found = devices.find(d => d.serial === preferred);
    if (!found) {
      throw new Error(
        `Device "${preferred}" not found. Available: ${devices
          .map(d => d.serial)
          .join(', ')}`,
      );
    }
    return found;
  }

  if (devices.length > 1) {
    throw new Error(
      `Multiple devices connected — pass --device <serial>. Available: ${devices
        .map(d => `${d.serial} (${d.model})`)
        .join(', ')}`,
    );
  }

  return devices[0];
}

function getProp(serial, prop) {
  return adbShell(serial, `getprop ${prop}`).stdout.trim();
}

/**
 * Everything needed to decide whether two runs are comparable. The baseline
 * gate refuses to compare across differing device classes using these fields.
 */
function deviceInfo(serial) {
  const devices = listDevices();
  const entry = devices.find(d => d.serial === serial) || {};

  return {
    serial,
    model: getProp(serial, 'ro.product.model') || entry.model,
    manufacturer: getProp(serial, 'ro.product.manufacturer'),
    androidVersion: getProp(serial, 'ro.build.version.release'),
    sdkInt: Number(getProp(serial, 'ro.build.version.sdk')) || null,
    fingerprint: getProp(serial, 'ro.build.fingerprint'),
    abi: getProp(serial, 'ro.product.cpu.abi'),
    isEmulator:
      serial.startsWith('emulator-') ||
      getProp(serial, 'ro.build.characteristics').includes('emulator'),
  };
}

function batteryLevel(serial) {
  const m = adbShell(serial, 'dumpsys battery').stdout.match(/level:\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * 0 NONE, 1 LIGHT, 2 MODERATE, 3 SEVERE, 4 CRITICAL...
 * At MODERATE and above the CPU is already being clocked down and timings
 * stop being comparable.
 */
function thermalStatus(serial) {
  const out = adbShell(serial, 'dumpsys thermalservice').stdout;
  const m = out.match(/Thermal Status:\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

function checkDeviceHealth(serial) {
  const warnings = [];
  const battery = batteryLevel(serial);
  const thermal = thermalStatus(serial);

  if (battery !== null && battery < DEVICE_PREP.minBatteryPct) {
    warnings.push(
      `Battery at ${battery}% (below ${DEVICE_PREP.minBatteryPct}%) — many devices throttle the CPU on low battery.`,
    );
  }

  if (thermal !== null && thermal >= 2) {
    const msg = `Device is thermally throttled (status ${thermal}). Timings will be slow and non-comparable.`;
    if (DEVICE_PREP.abortOnThermalThrottle) {
      throw new Error(`${msg} Let the device cool and re-run.`);
    }
    warnings.push(msg);
  }

  return {battery, thermal, warnings};
}

const ANIMATION_SCALES = [
  'window_animation_scale',
  'transition_animation_scale',
  'animator_duration_scale',
];

function prepareDevice(serial, {disableAnimations = true} = {}) {
  const restore = {};

  if (disableAnimations) {
    ANIMATION_SCALES.forEach(key => {
      restore[key] = adbShell(
        serial,
        `settings get global ${key}`,
      ).stdout.trim();
      adbShell(serial, `settings put global ${key} 0`);
    });
  }

  if (DEVICE_PREP.stayAwake) {
    adbShell(serial, 'svc power stayon true');
  }

  // A locked or dozing screen silently changes scheduling behaviour.
  adbShell(serial, 'input keyevent KEYCODE_WAKEUP');
  adbShell(serial, 'wm dismiss-keyguard');

  return restore;
}

function restoreDevice(serial, restore = {}) {
  Object.entries(restore).forEach(([key, value]) => {
    if (value && value !== 'null') {
      adbShell(serial, `settings put global ${key} ${value}`);
    } else {
      // The setting had no value before we touched it. Writing a default back
      // would leave animations permanently disabled on the device; deleting
      // restores the original "unset" state.
      adbShell(serial, `settings delete global ${key}`);
    }
  });

  adbShell(serial, 'svc power stayon false');
}

/**
 * Returns {reinstalled: true} when the existing package had to be removed
 * first — the caller should treat app state as wiped, which matters for
 * scenarios that assume an onboarded wallet.
 */
function install(serial, apkPath) {
  if (!fs.existsSync(apkPath)) {
    throw new Error(`Artifact not found: ${apkPath}`);
  }

  const attempt = () =>
    run('adb', [...adbBase(serial), 'install', '-r', '-d', apkPath]);

  let res = attempt();

  if (res.code === 0) {
    return {reinstalled: false};
  }

  const output = `${res.stdout}${res.stderr}`;

  // A locally-built APK is signed with a different key than a store or CI
  // build, so an existing install of the same package cannot be upgraded in
  // place. Uninstalling is the only way forward and is almost always what the
  // operator wants — but it wipes app data, so it is reported, not silent.
  if (output.includes('INSTALL_FAILED_UPDATE_INCOMPATIBLE')) {
    adb(serial, ['uninstall', APP_ID]);
    res = attempt();

    if (res.code === 0) {
      return {reinstalled: true};
    }
  }

  throw new Error(
    `Failed to install ${path.basename(apkPath)}:\n${output || res.stderr}`,
  );
}

function isInstalled(serial) {
  return adbShell(serial, `pm list packages ${APP_ID}`).stdout.includes(APP_ID);
}

function forceStop(serial) {
  adbShell(serial, `am force-stop ${APP_ID}`);
}

function clearAppData(serial) {
  adbShell(serial, `pm clear ${APP_ID}`);
}

function clearLogcat(serial) {
  adb(serial, ['logcat', '-c']);
}

function getPid(serial) {
  const out = adbShell(serial, `pidof ${APP_ID}`).stdout.trim();
  const pid = out.split(/\s+/)[0];
  return pid ? Number(pid) : null;
}

/**
 * Launch through the real LAUNCHER intent and return both the ActivityManager
 * numbers and the authoritative logcat draw timings.
 *
 * `am start -W` reports on `.LaunchActivity`, which is a trampoline that
 * finishes immediately — its TotalTime is NOT time-to-first-frame. We keep it
 * for reference but TTID comes from the `Displayed .../.MainActivity` line.
 */
async function launchAndMeasure(
  serial,
  {timeoutMs = 60000, expectDisplayed = true, fullyDrawnGraceMs} = {},
) {
  clearLogcat(serial);

  const started = Date.now();
  const {stdout} = adb(serial, [
    'shell',
    `am start -W -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n ${LAUNCHER_ACTIVITY}`,
  ]);

  const amTotal = Number((stdout.match(/TotalTime:\s*(\d+)/) || [])[1]);
  const amWait = Number((stdout.match(/WaitTime:\s*(\d+)/) || [])[1]);
  const amThis = Number((stdout.match(/ThisTime:\s*(\d+)/) || [])[1]);

  // A resume produces no `Displayed` line at all (the activity was never
  // re-created), so waiting for one would just burn the whole timeout.
  const drawn = expectDisplayed
    ? await waitForLogcatTimings(serial, {timeoutMs, fullyDrawnGraceMs})
    : {ttid: null, ttfd: null};

  return {
    am_total_time_ms: Number.isFinite(amTotal) ? amTotal : null,
    am_wait_time_ms: Number.isFinite(amWait) ? amWait : null,
    am_this_time_ms: Number.isFinite(amThis) ? amThis : null,
    ttid_ms: drawn.ttid,
    ttfd_ms: drawn.ttfd,
    wall_clock_ms: Date.now() - started,
  };
}

/**
 * Poll logcat for the `Displayed` (first frame) and `Fully drawn`
 * (reportFullyDrawn) lines for MainActivity.
 *
 * `Fully drawn` only appears once the app calls reportFullyDrawn() — it stays
 * null on builds without the native perf module, which the report renders as
 * "not collected" rather than zero.
 */
async function waitForLogcatTimings(
  serial,
  {timeoutMs = 60000, fullyDrawnGraceMs = 8000} = {},
) {
  const graceMs = Number.isFinite(fullyDrawnGraceMs) ? fullyDrawnGraceMs : 8000;
  const deadline = Date.now() + timeoutMs;
  let ttid = null;
  let ttfd = null;
  let ttidFoundAt = null;

  // `[^+]*` tolerates tokens between the activity name and the duration —
  // some platform versions emit `Displayed <pkg>/.MainActivity for user 0: +888ms`.
  const displayedRe = new RegExp(
    `Displayed ${escapeRe(DRAWN_ACTIVITY)}\\b[^+\\n]*\\+(\\S+)`,
  );
  const fullyDrawnRe = new RegExp(
    `Fully drawn ${escapeRe(DRAWN_ACTIVITY)}\\b[^+\\n]*\\+(\\S+)`,
  );

  while (Date.now() < deadline) {
    // Filtered to the one tag that carries these lines — dumping the whole
    // buffer every 250ms is expensive on chatty devices.
    const {stdout} = adb(serial, [
      'logcat',
      '-d',
      '-v',
      'brief',
      '-s',
      'ActivityTaskManager:I',
      'ActivityManager:I',
    ]);

    if (ttid === null) {
      const m = stdout.match(displayedRe);
      if (m) {
        ttid = parseAndroidDuration(m[1]);
        ttidFoundAt = Date.now();
      }
    }

    if (ttfd === null) {
      const m = stdout.match(fullyDrawnRe);
      if (m) {
        ttfd = parseAndroidDuration(m[1]);
      }
    }

    if (ttid !== null && ttfd !== null) {
      break;
    }

    // Once first-draw has landed, give fully-drawn a bounded grace period
    // instead of burning the entire timeout. Builds without the perf native
    // module never emit it, and every iteration would otherwise stall for the
    // full 60s and pollute the CPU averages with idle time.
    if (ttid !== null && Date.now() - ttidFoundAt >= graceMs) {
      break;
    }

    await sleep(250);
  }

  return {ttid, ttfd};
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Warm start, in Android's own sense of the term: the process is gone but the
 * system still has the app's files and pages cached, so relaunch skips much of
 * the cold-start I/O.
 *
 * Note `am kill` terminates the *process* (it is only permitted for a
 * backgrounded app, hence the HOME first). There is no reliable way to destroy
 * just the activity on a release build without toggling the global
 * "don't keep activities" developer setting, which would corrupt every other
 * scenario — so this measures the system-evicted variant of warm start.
 */
async function warmRestart(serial) {
  adbShell(serial, 'input keyevent KEYCODE_HOME');
  await sleep(1000);
  adbShell(serial, `am kill ${APP_ID}`);
  await sleep(500);
  return launchAndMeasure(serial);
}

/**
 * Hot start: background then resume.
 *
 * The activity is never re-created, so the framework emits no `Displayed` line
 * and there is no TTID to read — `expectDisplayed: false` stops us waiting for
 * one that will never arrive. What this scenario yields is the ActivityManager
 * resume timing plus the scenario's wall clock to a visible element.
 */
async function hotRestart(serial) {
  adbShell(serial, 'input keyevent KEYCODE_HOME');
  await sleep(1500);
  return launchAndMeasure(serial, {expectDisplayed: false});
}

function resetGfxInfo(serial) {
  adbShell(serial, `dumpsys gfxinfo ${APP_ID} reset`);
}

/**
 * Frame statistics since the last reset. This is the cheapest reliable jank
 * signal on Android and needs no instrumentation.
 */
function readGfxInfo(serial) {
  const out = adbShell(serial, `dumpsys gfxinfo ${APP_ID}`).stdout;
  const num = re => {
    const m = out.match(re);
    return m ? Number(m[1]) : null;
  };

  const total = num(/Total frames rendered:\s*(\d+)/);

  // Two jank metrics are reported and they disagree constantly:
  //
  //   Janky frames: 0 (0.00%)
  //   Janky frames (legacy): 122 (27.42%)
  //
  // The modern metric needs GPU completion timestamps. Where those are
  // unavailable — notably emulators using SwiftShader, which also give
  // themselves away with absurd "gpu percentile" values — it reports a
  // confident 0 while a quarter of frames are actually janking. Both are
  // captured so the report can say which one to believe instead of quietly
  // publishing a zero.
  //
  // Note the `Janky frames:` pattern cannot match the legacy line, since
  // "(legacy)" sits between the label and the colon.
  const janky = num(/Janky frames:\s*(\d+)/);
  const jankyLegacy = num(/Janky frames \(legacy\):\s*(\d+)/);

  const pct = value =>
    total && value !== null ? Number(((value / total) * 100).toFixed(2)) : null;

  // A sane GPU percentile is single- or double-digit milliseconds. Values in
  // the thousands mean the GPU timing pipeline is not reporting.
  const gpuP50 = num(/50th gpu percentile:\s*(\d+)ms/);
  const gpuTimingBroken = gpuP50 !== null && gpuP50 > 1000;

  return {
    total_frames: total,
    janky_frames: janky,
    janky_frames_pct: pct(janky),
    janky_frames_legacy: jankyLegacy,
    janky_frames_legacy_pct: pct(jankyLegacy),
    frame_p50_ms: num(/50th percentile:\s*(\d+)ms/),
    frame_p90_ms: num(/90th percentile:\s*(\d+)ms/),
    frame_p95_ms: num(/95th percentile:\s*(\d+)ms/),
    frame_p99_ms: num(/99th percentile:\s*(\d+)ms/),
    frame_deadline_missed: num(/Number Frame deadline missed:\s*(\d+)/),
    frame_deadline_missed_legacy: num(
      /Number Frame deadline missed \(legacy\):\s*(\d+)/,
    ),
    high_input_latency: num(/Number High input latency:\s*(\d+)/),
    slow_ui_thread: num(/Number Slow UI thread:\s*(\d+)/),
    gpu_timing_unavailable: gpuTimingBroken,
  };
}

function readMemoryMb(serial) {
  const out = adbShell(serial, `dumpsys meminfo ${APP_ID}`).stdout;
  const totalPss =
    (out.match(/TOTAL\s+PSS:\s*(\d+)/) || [])[1] ||
    (out.match(/^\s*TOTAL\s+(\d+)/m) || [])[1];
  const javaHeap = (out.match(/Java Heap:\s*(\d+)/) || [])[1];
  const nativeHeap = (out.match(/Native Heap:\s*(\d+)/) || [])[1];

  const toMb = kb => (kb ? Number((Number(kb) / 1024).toFixed(1)) : null);

  return {
    pss_mb: toMb(totalPss),
    java_heap_mb: toMb(javaHeap),
    native_heap_mb: toMb(nativeHeap),
  };
}

/**
 * Per-thread CPU sampler.
 *
 * React Native's interesting threads are the UI thread, `mqt_js` (the JS
 * thread) and RenderThread. Total process CPU hides the case where JS is
 * saturated while the process looks idle, so we break them out.
 */
/**
 * Cumulative CPU time per thread class since the process started, read once.
 *
 * The interval sampler cannot run during cold launches (the launch wait is
 * synchronous, so its timer never fires); this needs no timer. Read at the
 * end of startup-load, it is the total work the app did to start and settle,
 * attributed to the JS, UI, render, JIT and GC threads — the metric that
 * shows a JS-CPU saving even when wall-clock phases are network-bound.
 */
function readThreadCpuTotals(serial) {
  const pid = getPid(serial);
  if (!pid) {
    return {};
  }
  const out = adbShell(
    serial,
    `for f in /proc/${pid}/task/*/stat; do cat $f 2>/dev/null; done`,
  ).stdout;
  const totals = {js: 0, ui: 0, render: 0, jit: 0, gc: 0, all: 0};
  let sawJs = false;
  out.split('\n').forEach(line => {
    const close = line.lastIndexOf(')');
    const open = line.indexOf('(');
    if (close < 0 || open < 0) {
      return;
    }
    const tid = Number(line.slice(0, open).trim());
    const comm = line.slice(open + 1, close);
    const fields = line.slice(close + 2).split(/\s+/);
    // utime + stime in clock ticks (USER_HZ = 100 on Android) -> ms.
    const ms = (Number(fields[11]) + Number(fields[12])) * 10;
    if (!Number.isFinite(ms)) {
      return;
    }
    totals.all += ms;
    if (JS_THREAD_RE.test(comm)) {
      sawJs = true;
      totals.js += ms;
    }
    if (tid === pid) {
      totals.ui += ms;
    }
    if (comm === 'RenderThread') {
      totals.render += ms;
    }
    if (comm.startsWith('Jit thread')) {
      totals.jit += ms;
    }
    if (comm === 'hades' || comm === 'HeapTaskDaemon') {
      totals.gc += ms;
    }
  });
  return {
    js_cpu_ms_settled: sawJs ? totals.js : null,
    ui_cpu_ms_settled: totals.ui,
    render_cpu_ms_settled: totals.render,
    jit_cpu_ms_settled: totals.jit,
    gc_cpu_ms_settled: totals.gc,
    process_cpu_ms_settled: totals.all,
  };
}

function createCpuSampler(serial) {
  let last = null;
  const samples = [];

  const readTaskStats = pid => {
    const out = adbShell(
      serial,
      `for f in /proc/${pid}/task/*/stat; do cat $f 2>/dev/null; done`,
    ).stdout;

    // Keyed by tid, not comm: comm is truncated to 15 chars by the kernel and
    // is not unique across threads, whereas tid is stable for the sample pair.
    const threads = {};
    out.split('\n').forEach(line => {
      // comm can contain spaces and parens — split on the last ')'.
      const close = line.lastIndexOf(')');
      const open = line.indexOf('(');
      if (close < 0 || open < 0) {
        return;
      }

      const tid = Number(line.slice(0, open).trim());
      const comm = line.slice(open + 1, close);
      const fields = line.slice(close + 2).split(/\s+/);
      // After comm, fields[0] is state; utime is field 14 and stime 15 in the
      // 1-indexed proc(5) layout, i.e. offsets 11 and 12 here.
      const utime = Number(fields[11]);
      const stime = Number(fields[12]);

      if (
        Number.isFinite(tid) &&
        Number.isFinite(utime) &&
        Number.isFinite(stime)
      ) {
        threads[tid] = {comm, ticks: utime + stime};
      }
    });

    return threads;
  };

  return {
    sample() {
      const pid = getPid(serial);
      if (!pid) {
        return;
      }

      const now = Date.now();
      const threads = readTaskStats(pid);

      if (last && last.pid === pid) {
        const elapsedSec = (now - last.at) / 1000;
        // USER_HZ is 100 on every Android device in practice.
        const jiffiesPerSec = 100;
        const pct = ticks => (ticks / jiffiesPerSec / elapsedSec) * 100;

        let totalTicks = 0;
        let jsTicks = 0;
        let uiTicks = 0;
        let renderTicks = 0;
        let gcTicks = 0;
        let sawJsThread = false;

        Object.entries(threads).forEach(([tid, {comm, ticks}]) => {
          const prev = last.threads[tid];
          const delta = ticks - (prev ? prev.ticks : 0);
          totalTicks += Math.max(delta, 0);

          // React Native's JS thread is `mqt_v_js` under the new architecture
          // and `mqt_js` under the old one. Matching only the latter silently
          // reported 0% JS CPU on this app rather than reporting nothing —
          // presence is tracked separately so "no such thread" stays
          // distinguishable from "thread was idle".
          if (JS_THREAD_RE.test(comm)) {
            sawJsThread = true;
            jsTicks += Math.max(delta, 0);
          }

          // The main (UI) thread always has tid == pid; its comm is truncated
          // to the last 15 chars of the process name, so never match on it.
          if (Number(tid) === pid) {
            uiTicks += Math.max(delta, 0);
          }

          if (comm === 'RenderThread') {
            renderTicks += Math.max(delta, 0);
          }

          // Hermes' GC thread — a spike here explains jank that looks
          // unattributable on the JS thread alone.
          if (comm === 'hades') {
            gcTicks += Math.max(delta, 0);
          }
        });

        samples.push({
          total_cpu_pct: Number(pct(totalTicks).toFixed(1)),
          js_thread_cpu_pct: sawJsThread
            ? Number(pct(jsTicks).toFixed(1))
            : null,
          ui_thread_cpu_pct: Number(pct(uiTicks).toFixed(1)),
          render_thread_cpu_pct: Number(pct(renderTicks).toFixed(1)),
          hermes_gc_cpu_pct: Number(pct(gcTicks).toFixed(1)),
        });
      }

      last = {pid, at: now, threads};
    },
    results() {
      if (!samples.length) {
        return {avg_cpu_pct: null, js_thread_cpu_pct: null, peak_cpu_pct: null};
      }

      /** Averages only real readings; null when a thread was never present. */
      const avg = key => {
        const values = samples
          .map(s => s[key])
          .filter(v => v !== null && Number.isFinite(v));
        return values.length
          ? Number(
              (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
            )
          : null;
      };

      return {
        avg_cpu_pct: avg('total_cpu_pct'),
        js_thread_cpu_pct: avg('js_thread_cpu_pct'),
        ui_thread_cpu_pct: avg('ui_thread_cpu_pct'),
        render_thread_cpu_pct: avg('render_thread_cpu_pct'),
        hermes_gc_cpu_pct: avg('hermes_gc_cpu_pct'),
        peak_cpu_pct: Math.max(...samples.map(s => s.total_cpu_pct)),
      };
    },
  };
}

/**
 * Static artifact metrics — deterministic, zero variance, and the cheapest
 * regression signal available.
 */
function artifactStats(apkPath) {
  const size = fs.statSync(apkPath).size;
  const {stdout} = run('unzip', ['-l', apkPath]);

  const sumMatching = re =>
    stdout.split('\n').reduce((acc, line) => {
      const m = line.trim().match(/^(\d+)\s+\S+\s+\S+\s+(.+)$/);
      if (m && re.test(m[2])) {
        return acc + Number(m[1]);
      }
      return acc;
    }, 0) || null;

  return {
    apk_size_bytes: size,
    bundle_size_bytes: sumMatching(/index\.android\.bundle$/),
    native_libs_bytes: sumMatching(/^lib\//),
    assets_bytes: sumMatching(/^assets\//),
    resources_bytes: sumMatching(/^res\//),
  };
}

module.exports = {
  adb,
  adbShell,
  listDevices,
  resolveDevice,
  deviceInfo,
  checkDeviceHealth,
  prepareDevice,
  restoreDevice,
  install,
  isInstalled,
  forceStop,
  clearAppData,
  clearLogcat,
  getPid,
  launchAndMeasure,
  warmRestart,
  hotRestart,
  resetGfxInfo,
  readGfxInfo,
  readMemoryMb,
  createCpuSampler,
  readThreadCpuTotals,
  artifactStats,
  parseAndroidDuration,
};
