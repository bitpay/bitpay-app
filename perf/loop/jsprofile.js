#!/usr/bin/env node
/**
 * Summarise Hermes sampled traces from perf/loop/jsprofile.sh.
 *
 *   node perf/loop/jsprofile.js <jsprofile-dir> [--phase "<from> → <to>"] [--top N]
 *
 * Symbolicates each stack frame against the build's composed source map
 * (Hermes frames are bytecode addresses: line 1, column funcVirtAddr+offset),
 * places every JS-thread sample in a startup phase using that launch's bp_*
 * marks, and prints per phase:
 *   - self time by function (where the CPU actually was)
 *   - inclusive time by function, skipping module-system plumbing
 *   - self time by package / app directory
 * Times are sample counts × the median sampling interval, summed over all
 * launches and divided by the number of launches, i.e. ms per launch.
 */
const fs = require('fs');
const path = require('path');
const {SourceMapConsumer} = require('source-map');

const args = process.argv.slice(2);
const dir = args[0];
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i > 0 ? args[i + 1] : fallback;
};
const onlyPhase = opt('--phase', null);
const TOP = Number(opt('--top', 12));
if (!dir) {
  console.error(
    'usage: jsprofile.js <jsprofile-dir> [--phase "<from> → <to>"] [--top N]',
  );
  process.exit(64);
}

const ROOT = path.resolve(__dirname, '../..');
const consumer = new SourceMapConsumer(
  fs.readFileSync(path.join(dir, 'bundle.map'), 'utf8'),
);
const PLUMBING =
  /^(metroRequire|loadModuleImplementation|guardedLoadModule|metroImportDefault|metroImportAll|anonymous|global|\(root\)|\[root\]|_\$\$_REQUIRE|require)$/;

function shortFile(file) {
  if (!file) {
    return '?';
  }
  const rel = path.relative(ROOT, file);
  return rel.startsWith('..') ? file : rel;
}
function packageOf(file) {
  const m = /node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(file || '');
  if (m) {
    return m[1];
  }
  const rel = shortFile(file);
  return rel.split('/').slice(0, 3).join('/');
}

const symCache = new Map();
function symbolicate(frame) {
  const key = `${frame.funcVirtAddr}:${frame.offset}`;
  if (symCache.has(key)) {
    return symCache.get(key);
  }
  let sym = {name: frame.name || '(anonymous)', file: null, line: null};
  if (frame.funcVirtAddr !== undefined) {
    const col = Number(frame.funcVirtAddr) + Number(frame.offset || 0);
    const pos = consumer.originalPositionFor({line: 1, column: col});
    if (pos && pos.source) {
      sym = {
        name: pos.name || frame.name || '(anonymous)',
        file: pos.source,
        line: pos.line,
      };
    }
  }
  symCache.set(key, sym);
  return sym;
}

const launches = fs
  .readdirSync(dir)
  .filter(f => /^trace-\d+\.json$/.test(f))
  .map(f => f.match(/\d+/)[0]);
if (!launches.length) {
  console.error(`no traces in ${dir}`);
  process.exit(1);
}

const phases = new Map();
const bucket = name => {
  if (!phases.has(name)) {
    phases.set(name, {
      self: new Map(),
      incl: new Map(),
      pkg: new Map(),
      samples: 0,
    });
  }
  return phases.get(name);
};
const add = (map, key, w) => map.set(key, (map.get(key) || 0) + w);

let intervalsMs = [];
launches.forEach(n => {
  const trace = JSON.parse(
    fs.readFileSync(path.join(dir, `trace-${n}.json`), 'utf8'),
  );
  let marks = [];
  try {
    const startup = JSON.parse(
      fs.readFileSync(path.join(dir, `marks-${n}.json`), 'utf8'),
    );
    marks = (startup.entries || [])
      .filter(
        e =>
          e.entryType === 'mark' &&
          e.name.startsWith('bp_') &&
          !e.name.includes(':') &&
          !e.name.startsWith('bp_native_'),
      )
      .map(e => ({name: e.name.slice(3), atUs: e.startTime * 1000}))
      .sort((a, b) => a.atUs - b.atUs);
  } catch {
    /* no marks: everything lands in one phase */
  }
  const phaseOf = tsUs => {
    let i = 0;
    while (i < marks.length && tsUs >= marks[i].atUs) {
      i++;
    }
    return `${i === 0 ? 'bundle start' : marks[i - 1].name} → ${
      i === marks.length ? 'after' : marks[i].name
    }`;
  };

  const frames = trace.stackFrames;
  const samples = trace.samples
    .filter(s => s.sf !== undefined && frames[s.sf])
    .map(s => ({ts: Number(s.ts), sf: s.sf}))
    .sort((a, b) => a.ts - b.ts);
  for (let i = 1; i < samples.length; i++) {
    intervalsMs.push((samples[i].ts - samples[i - 1].ts) / 1000);
  }
  samples.forEach(s => {
    const b = bucket(phaseOf(s.ts));
    b.samples++;
    const leaf = symbolicate(frames[s.sf]);
    // A sample whose leaf is the root frame had no JS on the stack: the thread
    // was idle or inside native code called without a JS frame.
    if (leaf.name === '[root]' || leaf.name === '(root)') {
      b.idle = (b.idle || 0) + 1;
    }
    const leafKey = `${leaf.name}  ${shortFile(leaf.file)}:${leaf.line ?? '?'}`;
    add(b.self, leafKey, 1);
    add(b.pkg, packageOf(leaf.file), 1);
    const seen = new Set();
    let id = s.sf;
    while (id !== undefined && frames[id]) {
      const sym = symbolicate(frames[id]);
      if (!PLUMBING.test(sym.name)) {
        const k = `${sym.name}  ${shortFile(sym.file)}:${sym.line ?? '?'}`;
        if (!seen.has(k)) {
          seen.add(k);
          add(b.incl, k, 1);
        }
      }
      id = frames[id].parent;
    }
  });
});

// Sampling is not perfectly periodic; idle gaps inflate the mean, so use the
// median gap between consecutive samples as the per-sample weight.
intervalsMs = intervalsMs.filter(x => x > 0).sort((a, b) => a - b);
const perSampleMs = intervalsMs.length
  ? intervalsMs[Math.floor(intervalsMs.length / 2)]
  : 10;
const per = n => (n * perSampleMs) / launches.length;
const top = map =>
  [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP)
    .map(([k, v]) => `${per(v).toFixed(0).padStart(7)} ms  ${k}`);

console.log(
  `${launches.length} launch(es), ~${perSampleMs.toFixed(
    1,
  )} ms per sample; times are ms of JS-thread CPU per launch`,
);
[...phases.entries()]
  .filter(([name]) => !onlyPhase || name === onlyPhase)
  .sort((a, b) => b[1].samples - a[1].samples)
  .forEach(([name, b]) => {
    console.log(
      `\n══ ${name}: ~${per(b.samples - (b.idle || 0)).toFixed(
        0,
      )} ms busy (+${per(b.idle || 0).toFixed(0)} ms idle/native)`,
    );
    console.log('  self:');
    top(b.self).forEach(l => console.log(`  ${l}`));
    console.log('  inclusive (excluding module plumbing):');
    top(b.incl).forEach(l => console.log(`  ${l}`));
    console.log('  inclusive, app code only (src/, index.js):');
    top(
      new Map(
        [...b.incl.entries()].filter(([k]) => /  (src\/|index\.js)/.test(k)),
      ),
    ).forEach(l => console.log(`  ${l}`));
    console.log('  by package:');
    top(b.pkg)
      .slice(0, 8)
      .forEach(l => console.log(`  ${l}`));
  });
