#!/usr/bin/env node
/**
 * Print a run's startup timeline and load profile in reading order.
 *
 *   node perf/loop/profile.js <result.json> [--modules N]
 *
 * The timeline is every *_ms metric of startup-load sorted by median, with the
 * gap from the previous phase — the gaps are where to look. The profile lists
 * the heaviest modules by self time at first draw, requests by endpoint,
 * actions by time and store slices by size.
 */
const fs = require('fs');

const file = process.argv[2];
const nIdx = process.argv.indexOf('--modules');
const topN = nIdx > 0 ? Number(process.argv[nIdx + 1]) : 30;
if (!file) {
  console.error('usage: profile.js <result.json> [--modules N]');
  process.exit(64);
}

const run = JSON.parse(fs.readFileSync(file, 'utf8'));
const scenario =
  run.scenarios['startup-load'] || Object.values(run.scenarios)[0];
const m = scenario.metrics;

const timeline = Object.entries(m)
  .filter(
    ([k, v]) =>
      k.endsWith('_ms') &&
      v.median != null &&
      !/^(am_|wall_clock|visible|ttid|js_bundle_exec|module_init|action_ms)/.test(
        k,
      ),
  )
  .sort((a, b) => a[1].median - b[1].median);

console.log(
  `TIMELINE (ms from nativeLaunchStart, ${run.meta.runs} runs, ${run.meta.gitSha})`,
);
let prev = null;
timeline.forEach(([k, v]) => {
  const gap = prev == null ? '' : `+${(v.median - prev).toFixed(0)}`;
  console.log(
    `${v.median.toFixed(0).padStart(7)} ${gap.padStart(7)}  ${k.padEnd(36)} ±${(
      v.stddev || 0
    ).toFixed(0)}`,
  );
  prev = v.median;
});
[
  'ttid_ms',
  'js_bundle_exec_ms',
  'module_init_ms_ttfd',
  'peak_pss_mb',
  'avg_cpu_pct',
].forEach(k => {
  if (m[k]) {
    console.log(
      `        ${k.padEnd(28)} ${m[k].median} ±${(m[k].stddev || 0).toFixed(
        1,
      )}`,
    );
  }
});

console.log('\nLOAD');
Object.entries(m)
  .filter(([k]) =>
    /^(modules|requests|actions|js_heap|js_gc|store_kb|request_kb)/.test(k),
  )
  .forEach(([k, v]) => console.log(`  ${k.padEnd(26)} ${v.median}`));

const p = scenario.profile;
if (!p) {
  console.log('\n(no profile in this run)');
  process.exit(0);
}

console.log(
  `\nTOP ${topN} MODULES BY SELF TIME AT FIRST DRAW (ms, started at ms)`,
);
(p.topModules || []).slice(0, topN).forEach(x => {
  console.log(
    `${String(x.selfMs).padStart(8)} ${String(x.startMs).padStart(6)}  ${
      x.path || `#${x.id}`
    }`,
  );
});

console.log('\nREQUESTS (count, total ms, KB, endpoint)');
Object.entries(p.requests || {})
  .sort((a, b) => b[1].bytes - a[1].bytes)
  .forEach(([k, v]) => {
    console.log(
      `${String(v.count).padStart(4)} ${String(Math.round(v.totalMs)).padStart(
        7,
      )} ${String(Math.round(v.bytes / 1024)).padStart(6)}  ${k}${
        v.failed ? `  (failed ${v.failed})` : ''
      }`,
    );
  });

console.log('\nACTIONS (count, ms, type)');
Object.entries(p.actions || {})
  .sort((a, b) => b[1].ms - a[1].ms)
  .slice(0, 25)
  .forEach(([k, v]) =>
    console.log(
      `${String(v.count).padStart(4)} ${v.ms.toFixed(1).padStart(7)}  ${k}`,
    ),
  );

console.log('\nSTORE (KB, slice)');
Object.entries(p.storeBytes || {})
  .sort((a, b) => b[1] - a[1])
  .filter(([, v]) => v > 512)
  .forEach(([k, v]) =>
    console.log(`${(v / 1024).toFixed(1).padStart(7)}  ${k}`),
  );
