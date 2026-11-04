#!/usr/bin/env node
/**
 * Backfill phase_* durations into stored result files taken before the
 * collector computed them. Uses each metric's per-iteration `values`; only
 * pairs whose value arrays have the same length (no dropped iterations) are
 * derived, so iterations always line up.
 *
 *   node perf/loop/derive-phases.js <result.json>...   (rewrites in place)
 */
const fs = require('fs');
const {PHASES} = require('../analysis/phases');
const stats = require('../analysis/stats');

process.argv.slice(2).forEach(file => {
  const run = JSON.parse(fs.readFileSync(file, 'utf8'));
  let added = 0;
  Object.values(run.scenarios || {}).forEach(sc => {
    const m = sc.metrics || {};
    PHASES.forEach(([key, end, start]) => {
      const e = m[end] && m[end].values;
      const s = m[start] && m[start].values;
      if (m[key] || !e || !s || e.length !== s.length || !e.length) {
        return;
      }
      m[key] = stats.summarize(e.map((v, i) => v - s[i]));
      added++;
    });
  });
  fs.writeFileSync(file, JSON.stringify(run, null, 2));
  console.log(`${file}: +${added} phase metrics`);
});
