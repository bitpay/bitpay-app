const {spawn, spawnSync} = require('child_process');

/**
 * Run a command and capture output. Never throws on a non-zero exit — callers
 * decide what a failure means (a missing optional tool is not fatal).
 */
function run(cmd, args = [], opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });

  return {
    code: res.status === null ? -1 : res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    error: res.error,
  };
}

function runOrThrow(cmd, args = [], opts = {}) {
  const res = run(cmd, args, opts);

  if (res.code !== 0) {
    throw new Error(
      `Command failed (${res.code}): ${cmd} ${args.join(' ')}\n${
        res.stderr || res.stdout
      }`,
    );
  }

  return res;
}

/**
 * Spawn a long-lived process (log streaming, profilers) and return a handle
 * that buffers stdout until stopped.
 */
function runBackground(cmd, args = [], opts = {}) {
  const child = spawn(cmd, args, {stdio: ['ignore', 'pipe', 'pipe'], ...opts});
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', d => (stdout += d.toString()));
  child.stderr.on('data', d => (stderr += d.toString()));

  return {
    child,
    stop() {
      if (!child.killed) {
        try {
          child.kill('SIGTERM');
        } catch (e) {
          /* already gone */
        }
      }
      return {stdout, stderr};
    },
    read() {
      return {stdout, stderr};
    },
  };
}

function which(bin) {
  return run('which', [bin]).code === 0;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {run, runOrThrow, runBackground, which, sleep};
