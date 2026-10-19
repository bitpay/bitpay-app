const path = require('path');
const fs = require('fs');
const {spawn} = require('child_process');
const {which} = require('../lib/exec');

const FLOWS_DIR = path.join(__dirname, '..', 'scenarios');

function isAvailable() {
  return which('maestro');
}

/**
 * Run a Maestro flow and time it from the harness side.
 *
 * Maestro is the scenario *driver*; the authoritative timings come from adb.
 * The wall-clock number here is a coarse cross-platform fallback (its polling
 * granularity is a few hundred ms), so it is reported as `visible_ms`
 * and never presented as time-to-first-frame.
 */
function resolveFlowPath(flowName) {
  const flowPath = path.isAbsolute(flowName)
    ? flowName
    : path.join(FLOWS_DIR, flowName);

  if (!fs.existsSync(flowPath)) {
    throw new Error(`Maestro flow not found: ${flowPath}`);
  }

  return flowPath;
}

/**
 * Async so the caller can sample CPU/memory on an interval while the flow
 * drives the app. A synchronous spawn would block the harness's event loop and
 * collapse every sample into a single post-hoc reading.
 */
function runFlow(flowName, {serial, env = {}, timeoutMs = 300000} = {}) {
  if (!isAvailable()) {
    return Promise.reject(
      new Error(
        'maestro not found on PATH. Install with: curl -Ls "https://get.maestro.mobile.dev" | bash',
      ),
    );
  }

  const flowPath = resolveFlowPath(flowName);
  const args = [];
  if (serial) {
    args.push('--device', serial);
  }
  args.push('test', flowPath);

  return new Promise(resolve => {
    const started = Date.now();
    const child = spawn('maestro', args, {
      env: {...process.env, ...env},
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', d => (stdout += d.toString()));
    child.stderr.on('data', d => (stderr += d.toString()));

    // Without this, a spawn failure (ENOENT between the `which` check and the
    // spawn) emits an unhandled 'error' event and takes down the harness.
    child.on('error', err => {
      clearTimeout(timer);
      resolve({
        ok: false,
        timedOut: false,
        durationMs: Date.now() - started,
        stdout,
        stderr: `${stderr}\nfailed to spawn maestro: ${err.message}`,
        steps: [],
      });
    });

    child.on('close', code => {
      clearTimeout(timer);
      resolve({
        ok: code === 0 && !timedOut,
        timedOut,
        durationMs: Date.now() - started,
        stdout,
        stderr,
        steps: parseStepTimings(stdout),
      });
    });
  });
}

/**
 * Maestro prints one line per command. We extract the ordered command list so
 * transitions can be attributed to the tap that caused them; precise per-screen
 * timing comes from the in-app instrumentation sink, not from this.
 */
function parseStepTimings(stdout) {
  const steps = [];

  (stdout || '').split('\n').forEach(line => {
    const m = line.match(/^\s*[✅❌]\s+(.+?)\s*$/);
    if (m) {
      steps.push({command: m[1].trim(), ok: line.includes('✅')});
    }
  });

  return steps;
}

module.exports = {
  isAvailable,
  runFlow,
  resolveFlowPath,
  parseStepTimings,
  FLOWS_DIR,
};
