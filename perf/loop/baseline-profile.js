#!/usr/bin/env node
/**
 * Turn the device's ART runtime profile into a baseline profile.
 *
 *   adb shell cmd package dump-profiles com.bitpay.wallet
 *   adb shell cat /data/misc/profman/com.bitpay.wallet-primary.prof.txt > dump.txt
 *   node perf/loop/baseline-profile.js dump.txt > android/app/src/main/baseline-prof.txt
 *
 * (perf/loop/baseline-profile.sh does all three.)
 *
 * `dump-profiles` on Android 11 prints profman's readable listing: per dex,
 * "hot methods", "startup methods", "post startup methods" and "classes",
 * with Java-style signatures. A baseline profile wants one rule per line in
 * descriptor form with H/S/P flags, e.g.
 *
 *   HSPLcom/facebook/react/ReactHost;->start()V
 *   Lcom/facebook/react/ReactHost;
 *
 * The reference profile is used (what ART compiled from), merged with the
 * current one. Both cover every dex in base.apk.
 */
const fs = require('fs');

const input = process.argv[2];
if (!input) {
  console.error('usage: baseline-profile.js <dump-profiles output>');
  process.exit(64);
}

const PRIMITIVES = {
  void: 'V',
  boolean: 'Z',
  byte: 'B',
  char: 'C',
  short: 'S',
  int: 'I',
  long: 'J',
  float: 'F',
  double: 'D',
};

const typeDescriptor = javaType => {
  let type = javaType.trim();
  let dims = '';
  while (type.endsWith('[]')) {
    dims += '[';
    type = type.slice(0, -2);
  }
  return dims + (PRIMITIVES[type] || `L${type.replace(/\./g, '/')};`);
};

/** "void a.b.C$D.run(int, java.lang.String[])" → "La/b/C$D;->run(I[Ljava/lang/String;)V" */
const methodRule = line => {
  const text = line.replace(/\[[^\]]*\],?\s*$/, '').replace(/,\s*$/, '').trim();
  const space = text.indexOf(' ');
  const open = text.indexOf('(', space);
  const close = text.lastIndexOf(')');
  if (space < 0 || open < 0 || close < open) {
    return null;
  }
  const ret = text.slice(0, space);
  const qualified = text.slice(space + 1, open);
  const dot = qualified.lastIndexOf('.');
  if (dot < 0) {
    return null;
  }
  const cls = qualified.slice(0, dot);
  const name = qualified.slice(dot + 1);
  const args = text
    .slice(open + 1, close)
    .split(',')
    .map(a => a.trim())
    .filter(Boolean)
    .map(typeDescriptor)
    .join('');
  return `${typeDescriptor(cls)}->${name}(${args})${typeDescriptor(ret)}`;
};

const FLAG_BY_SECTION = {
  'hot methods': 'H',
  'startup methods': 'S',
  'post startup methods': 'P',
};

const methods = new Map(); // rule → Set of flags
const classes = new Set();
let section = null;

for (const raw of fs.readFileSync(input, 'utf8').split('\n')) {
  const header = raw.match(/^\t(hot methods|startup methods|post startup methods|classes):/);
  if (header) {
    section = header[1];
    continue;
  }
  if (!raw.startsWith('\t\t')) {
    if (!raw.startsWith('\t')) {
      section = null;
    }
    continue;
  }
  if (!section) {
    continue;
  }
  if (section === 'classes') {
    const name = raw.trim().replace(/,$/, '');
    if (name) {
      classes.add(typeDescriptor(name));
    }
    continue;
  }
  const rule = methodRule(raw);
  if (!rule) {
    continue;
  }
  if (!methods.has(rule)) {
    methods.set(rule, new Set());
  }
  methods.get(rule).add(FLAG_BY_SECTION[section]);
}

const out = [];
for (const [rule, flags] of [...methods.entries()].sort(([a], [b]) =>
  a < b ? -1 : a > b ? 1 : 0,
)) {
  out.push(`${['H', 'S', 'P'].filter(f => flags.has(f)).join('')}${rule}`);
}
for (const cls of [...classes].sort()) {
  out.push(cls);
}
process.stdout.write(out.join('\n') + '\n');
console.error(`${methods.size} methods, ${classes.size} classes`);
