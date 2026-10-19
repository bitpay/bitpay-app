#!/usr/bin/env node
/**
 * Pool several runs of the same build into one result, re-summarising every
 * metric from the concatenated per-run values. Use it when a phase is too
 * noisy for 10 runs to decide: measure again with --no-build, then merge.
 *
 *   node perf/loop/merge-runs.js <out.json> <run.json> <run.json>...
 */
const fs = require('fs');
const stats = require('../analysis/stats');

const [out, ...inputs] = process.argv.slice(2);
if (!out || inputs.length < 2) {
  console.error('usage: merge-runs.js <out.json> <run.json> <run.json>...');
  process.exit(64);
}
const runs = inputs.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const shas = new Set(runs.map(r => r.meta.gitSha));
if (shas.size > 1) {
  console.error(`refusing to merge different builds: ${[...shas].join(', ')}`);
  process.exit(1);
}
const merged = JSON.parse(JSON.stringify(runs[0]));
Object.entries(merged.scenarios).forEach(([name, sc]) => {
  Object.keys(sc.metrics).forEach(key => {
    const values = runs.flatMap(
      r => r.scenarios[name]?.metrics?.[key]?.values || [],
    );
    sc.metrics[key] = stats.summarize(values);
  });
  sc.completedRuns = runs.reduce(
    (n, r) => n + (r.scenarios[name]?.completedRuns || 0),
    0,
  );
});
merged.meta.runs = runs.reduce((n, r) => n + r.meta.runs, 0);
merged.meta.mergedFrom = inputs;
fs.writeFileSync(out, JSON.stringify(merged, null, 2));
console.log(`${out}: ${merged.meta.runs} runs`);
