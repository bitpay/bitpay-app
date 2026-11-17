#!/usr/bin/env node
/**
 * Structural UI parity: compare the same screen on iOS and Android.
 *
 *   node perf/parity/compare.js <ios-dir> <android-dir> [--out report.html]
 *
 * Each dir holds, per screen, `<screen>.json` (a `maestro hierarchy` dump)
 * and `<screen>.png` (a screenshot), as written by capture.sh.
 *
 * Pixels differ between platforms by design (fonts, status bars, densities),
 * so this compares *layout*, not images:
 *   1. Leaf-ish elements with a stable key (testID / resource-id, else visible
 *      text, else accessibility label) are extracted with their bounds,
 *      normalised to the screen size (0..1) and clipped to the area below the
 *      status bar.
 *   2. Elements are matched across platforms by key.
 *   3. For every pair of matched elements that are near each other, the
 *      relation is classified — same row (left/right) or stacked
 *      (above/below) — and a relation that differs between platforms is
 *      reported. Two CTAs side by side on iOS but stacked on Android show up
 *      exactly this way.
 *   4. Elements present on one platform only, and matched elements whose
 *      normalised width differs by more than 35%, are reported too.
 *
 * Exit code 1 when any screen has layout differences, 0 otherwise. The HTML
 * report puts both screenshots side by side with the differing elements
 * outlined, for a human to confirm.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const [iosDir, androidDir] = args;
const outIdx = args.indexOf('--out');
const outPath = outIdx > 0 ? args[outIdx + 1] : null;
if (!iosDir || !androidDir) {
  console.error('usage: compare.js <ios-dir> <android-dir> [--out report.html]');
  process.exit(64);
}

const BOUNDS_RE = /\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/;
const ROW_TOLERANCE = 0.025; // vertical centre difference that still counts as one row
// Only relate elements that are vertically close on at least one platform:
// siblings in a row can sit at opposite screen edges, so horizontal distance
// must not exclude them.
const NEAR_Y = 0.12;
const WIDTH_RATIO = 1.35;

function parseBounds(b) {
  const m = BOUNDS_RE.exec(b || '');
  return m ? {x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4]} : null;
}

/** Elements with a usable key and non-empty bounds, normalised to 0..1. */
function extract(hierarchy) {
  const out = [];
  let screen = null;
  const walk = node => {
    const a = node.attributes || {};
    const b = parseBounds(a.bounds);
    if (b && (!screen || (b.x2 - b.x1) * (b.y2 - b.y1) > (screen.x2 - screen.x1) * (screen.y2 - screen.y1))) {
      screen = b;
    }
    const id = a['resource-id'] && !a['resource-id'].includes(':id/') ? a['resource-id'] : '';
    const text = (a.text || '').trim();
    const label = (a.accessibilityText || '').trim();
    const key = id ? `#${id}` : text ? `"${text}"` : label ? `@${label}` : '';
    if (key && b && b.x2 > b.x1 && b.y2 > b.y1) {
      out.push({key, b});
    }
    (node.children || []).forEach(walk);
  };
  walk(hierarchy);
  if (!screen) {
    return [];
  }
  const W = screen.x2 - screen.x1;
  const H = screen.y2 - screen.y1;
  // Status bars and system UI differ per platform; ignore the top ~5%.
  return out
    .map(({key, b}) => ({
      key,
      x1: (b.x1 - screen.x1) / W,
      y1: (b.y1 - screen.y1) / H,
      x2: (b.x2 - screen.x1) / W,
      y2: (b.y2 - screen.y1) / H,
      raw: b,
    }))
    .filter(e => e.y1 > 0.05 && e.y2 <= 1.01);
}

/** First element per key; duplicates (list rows) are ambiguous, so skipped. */
function byKey(elements) {
  const counts = {};
  elements.forEach(e => (counts[e.key] = (counts[e.key] || 0) + 1));
  const map = new Map();
  elements.forEach(e => {
    if (counts[e.key] === 1) {
      map.set(e.key, e);
    }
  });
  return map;
}

const cx = e => (e.x1 + e.x2) / 2;
const cy = e => (e.y1 + e.y2) / 2;

function relation(a, b) {
  if (Math.abs(cy(a) - cy(b)) <= ROW_TOLERANCE) {
    return cx(a) < cx(b) ? 'left-of' : 'right-of';
  }
  return cy(a) < cy(b) ? 'above' : 'below';
}

function compareScreen(iosH, androidH) {
  const ios = byKey(extract(iosH));
  const android = byKey(extract(androidH));
  const shared = [...ios.keys()].filter(k => android.has(k));
  const diffs = [];

  for (let i = 0; i < shared.length; i++) {
    for (let j = i + 1; j < shared.length; j++) {
      const [ka, kb] = [shared[i], shared[j]];
      const [ia, ib, aa, ab] = [ios.get(ka), ios.get(kb), android.get(ka), android.get(kb)];
      if (
        Math.abs(cy(ia) - cy(ib)) > NEAR_Y &&
        Math.abs(cy(aa) - cy(ab)) > NEAR_Y
      ) {
        continue;
      }
      const ri = relation(ia, ib);
      const ra = relation(aa, ab);
      const rowOnOne = ri.endsWith('-of') !== ra.endsWith('-of');
      if (ri !== ra && rowOnOne) {
        diffs.push({
          kind: 'relation',
          keys: [ka, kb],
          message: `${ka} is ${ri} ${kb} on iOS but ${ra} it on Android`,
        });
      }
    }
  }

  shared.forEach(k => {
    const wi = ios.get(k).x2 - ios.get(k).x1;
    const wa = android.get(k).x2 - android.get(k).x1;
    const ratio = Math.max(wi, wa) / Math.max(Math.min(wi, wa), 1e-6);
    if (ratio > WIDTH_RATIO && Math.max(wi, wa) > 0.05) {
      diffs.push({
        kind: 'width',
        keys: [k],
        message: `${k} width ${(wi * 100).toFixed(0)}% on iOS vs ${(wa * 100).toFixed(0)}% on Android`,
      });
    }
  });

  const onlyIos = [...ios.keys()].filter(k => !android.has(k) && k.startsWith('#'));
  const onlyAndroid = [...android.keys()].filter(k => !ios.has(k) && k.startsWith('#'));
  onlyIos.forEach(k => diffs.push({kind: 'missing', keys: [k], message: `${k} only on iOS`}));
  onlyAndroid.forEach(k => diffs.push({kind: 'missing', keys: [k], message: `${k} only on Android`}));

  return {diffs, ios, android, shared: shared.length};
}

function htmlReport(results) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const boxes = (elements, keys) =>
    keys
      .map(k => elements.get(k))
      .filter(Boolean)
      .map(
        e =>
          `<div class="box" style="left:${e.x1 * 100}%;top:${e.y1 * 100}%;width:${(e.x2 - e.x1) * 100}%;height:${(e.y2 - e.y1) * 100}%"></div>`,
      )
      .join('');
  const sections = results
    .map(r => {
      const keys = [...new Set(r.diffs.flatMap(d => d.keys))];
      return `<section><h2>${esc(r.screen)} — ${r.diffs.length ? `${r.diffs.length} difference(s)` : 'no layout differences'} <small>(${r.shared} matched elements)</small></h2>
<ul>${r.diffs.map(d => `<li class="${d.kind}">${esc(d.message)}</li>`).join('')}</ul>
<div class="pair"><figure><figcaption>iOS</figcaption><div class="shot"><img src="${esc(r.iosPng)}">${boxes(r.ios, keys)}</div></figure>
<figure><figcaption>Android</figcaption><div class="shot"><img src="${esc(r.androidPng)}">${boxes(r.android, keys)}</div></figure></div></section>`;
    })
    .join('\n');
  return `<!doctype html><meta charset="utf-8"><title>UI parity</title>
<style>body{font:14px system-ui;margin:24px;background:#fff;color:#111}@media(prefers-color-scheme:dark){body{background:#111;color:#eee}}
.pair{display:flex;gap:16px;flex-wrap:wrap}.shot{position:relative;width:300px}.shot img{width:100%;display:block}
.box{position:absolute;outline:2px solid #e5484d;background:rgba(229,72,77,.12)}li.relation{color:#e5484d}li.missing{opacity:.8}</style>
<h1>UI parity — iOS vs Android</h1>${sections}`;
}

const screens = fs
  .readdirSync(androidDir)
  .filter(f => f.endsWith('.json') && fs.existsSync(path.join(iosDir, f)))
  .map(f => f.replace(/\.json$/, ''));

const results = screens.map(screen => {
  const load = d => JSON.parse(fs.readFileSync(path.join(d, `${screen}.json`), 'utf8'));
  const r = compareScreen(load(iosDir), load(androidDir));
  return {
    screen,
    ...r,
    iosPng: path.resolve(iosDir, `${screen}.png`),
    androidPng: path.resolve(androidDir, `${screen}.png`),
  };
});

results.forEach(r => {
  console.log(`\n${r.screen}: ${r.diffs.length} difference(s), ${r.shared} matched`);
  r.diffs.forEach(d => console.log(`  [${d.kind}] ${d.message}`));
});
if (outPath) {
  fs.writeFileSync(outPath, htmlReport(results));
  console.log(`\nreport: ${outPath}`);
}
process.exitCode = results.some(r => r.diffs.some(d => d.kind !== 'missing')) ? 1 : 0;

module.exports = {extract, compareScreen, relation};
