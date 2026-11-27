#!/usr/bin/env node
/**
 * Summarise Perfetto cold-start traces from systrace.sh.
 *
 *   node perf/loop/systrace-report.js <systrace-dir> [--until-ms 6000]
 *
 * For each trace: the UI thread's top-level slices over 8 ms (bindApplication,
 * activityStart, Choreographer#doFrame, ...) with times from the process's
 * first main-thread slice, and how the UI, JS (mqt_v_js) and RenderThread
 * threads spent the window — running, runnable (wanted CPU, didn't get it),
 * sleeping, or blocked on I/O. Also warns when the trace came from a
 * profiling build, whose sampler thread skews timings.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');

const dir = process.argv[2];
const uIdx = process.argv.indexOf('--until-ms');
const untilMs = uIdx > 0 ? Number(process.argv[uIdx + 1]) : 6000;
const TP = path.join(os.homedir(), '.bitpay-perf/tools/trace_processor');

if (!dir) {
  console.error('usage: systrace-report.js <systrace-dir> [--until-ms N]');
  process.exit(64);
}

const q = (trace, sql) => {
  const file = path.join(os.tmpdir(), `bp-tp-${process.pid}.sql`);
  fs.writeFileSync(file, sql);
  const out = execFileSync(TP, ['-q', file, trace], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024,
  });
  const lines = out
    .trim()
    .split('\n')
    .filter(l => l && !l.startsWith('Loading'));
  const header = lines
    .shift()
    .split(',')
    .map(h => h.replace(/"/g, ''));
  return lines.map(l => {
    const cells = l
      .match(/("([^"]|"")*"|[^,]*)(,|$)/g)
      .map(c => c.replace(/,$/, '').replace(/^"|"$/g, ''));
    return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
  });
};

const PRELUDE = `
with app as (select upid, pid from process where name = 'com.bitpay.wallet' order by start_ts desc limit 1),
main as (select utid from thread join app using (upid) where thread.tid = app.pid),
t0 as (select min(s.ts) as ts from slice s join thread_track tt on s.track_id = tt.id where tt.utid in (select utid from main))
`;

const summary = [];
fs.readdirSync(dir)
  .filter(f => f.endsWith('.pftrace'))
  .sort()
  .forEach(f => {
    const trace = path.join(dir, f);
    console.log(`\n═══ ${f}`);

    const threads = q(
      trace,
      `${PRELUDE}
      select t.name as name from thread t join app using (upid)`,
    );
    if (threads.some(t => t.name === 'hermes-sampling')) {
      console.log(
        '  ⚠ profiling build (hermes-sampling thread present) — timings are skewed',
      );
    }

    const slices = q(
      trace,
      `${PRELUDE}
      select round((s.ts - (select ts from t0)) / 1e6, 1) as at_ms,
             round(s.dur / 1e6, 1) as dur_ms, s.depth as depth, s.name as name
      from slice s join thread_track tt on s.track_id = tt.id
      where tt.utid in (select utid from main) and s.dur > 8e6 and s.depth <= 2
        and s.ts < (select ts from t0) + ${untilMs * 1e6}
      order by s.ts`,
    );
    console.log('  UI thread slices > 8 ms (at, duration, name):');
    slices.forEach(s =>
      console.log(
        `  ${s.at_ms.padStart(8)} ${s.dur_ms.padStart(7)}  ${'  '.repeat(
          Number(s.depth),
        )}${s.name.slice(0, 90)}`,
      ),
    );

    const frames = q(
      trace,
      `${PRELUDE}
      select round((s.ts - (select ts from t0)) / 1e6, 0) as at_ms, round(s.dur / 1e6, 1) as dur_ms
      from slice s join thread_track tt on s.track_id = tt.id
      where tt.utid in (select utid from main) and s.name = 'Choreographer#doFrame'
        and s.ts < (select ts from t0) + ${untilMs * 1e6}
      order by s.ts`,
    );
    const long = frames.filter(fr => Number(fr.dur_ms) > 32);
    const overBudget = frames.reduce(
      (acc, fr) => acc + Math.max(0, Number(fr.dur_ms) - 16.7),
      0,
    );
    console.log(
      `  frames: ${frames.length} · over 32 ms: ${
        long.length
      } · time over 16.7 ms budget: ${overBudget.toFixed(0)} ms`,
    );
    console.log(
      `    long frames: ${long
        .map(fr => `${fr.dur_ms}@${fr.at_ms}`)
        .join('  ')}`,
    );
    summary.push({
      trace: f,
      frames: frames.length,
      long: long.length,
      overBudget,
    });

    const states = q(
      trace,
      `${PRELUDE}
      , named as (
        select utid, case when tid = (select pid from app) then 'UI' else name end as tname
        from thread where upid = (select upid from app)
          and (tid = (select pid from app) or name in ('mqt_v_js', 'RenderThread', 'mqt_v_native'))
      )
      select n.tname as thread, ts.state as state, round(sum(ts.dur) / 1e6, 0) as ms
      from thread_state ts join named n using (utid)
      where ts.ts >= (select ts from t0) and ts.ts < (select ts from t0) + ${
        untilMs * 1e6
      }
      group by n.tname, ts.state order by n.tname, ms desc`,
    );
    const label = {
      R: 'runnable',
      'R+': 'runnable (preempted)',
      S: 'sleeping',
      D: 'I/O wait',
      DK: 'I/O wait',
      Running: 'running',
    };
    console.log(`  thread time in the first ${untilMs} ms:`);
    const byThread = {};
    states.forEach(r => {
      (byThread[r.thread] ||= []).push(`${label[r.state] || r.state} ${r.ms}`);
    });
    Object.entries(byThread).forEach(([t, parts]) =>
      console.log(`    ${t.padEnd(13)} ${parts.join(' · ')}`),
    );
  });

if (summary.length > 1) {
  const med = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  console.log(
    `\nmedian over ${summary.length} launches: ${med(
      summary.map(x => x.long),
    )} frames > 32 ms, ${med(summary.map(x => x.overBudget)).toFixed(
      0,
    )} ms over budget (first ${untilMs} ms)`,
  );
}
