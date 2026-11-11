const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
const {parseCatalog, sortCatalog} = require('./translation-catalog');

function main() {
  const files = process.argv.slice(2);
  if (files.length !== 3) {
    throw new Error('Usage: merge-translations.js BASE OURS THEIRS');
  }
  const [base, ours, theirs] = files.map(file =>
    parseCatalog(fs.readFileSync(file, 'utf8'), file),
  );
  const merged = new Map();
  const conflicts = [];
  for (const key of new Set([
    ...Object.keys(base),
    ...Object.keys(ours),
    ...Object.keys(theirs),
  ])) {
    const before = Object.hasOwn(base, key) ? base[key] : undefined;
    const left = Object.hasOwn(ours, key) ? ours[key] : undefined;
    const right = Object.hasOwn(theirs, key) ? theirs[key] : undefined;
    let value;
    if (left === right || right === before) {
      value = left;
    } else if (left === before) {
      value = right;
    } else {
      conflicts.push(key);
      continue;
    }
    if (value !== undefined) {
      merged.set(key, value);
    }
  }
  if (conflicts.length) {
    console.error(
      `Conflicting translation keys: ${conflicts
        .map(key => JSON.stringify(key))
        .join(', ')}`,
    );
    const result = spawnSync(
      'git',
      [
        'merge-file',
        '-L',
        'ours',
        '-L',
        'base',
        '-L',
        'theirs',
        files[1],
        files[0],
        files[2],
      ],
      {stdio: 'inherit'},
    );
    if (result.error) {
      throw result.error;
    }
    process.exitCode = 1;
    return;
  }
  fs.writeFileSync(
    files[1],
    JSON.stringify(sortCatalog(Object.fromEntries(merged)), null, 2) + '\n',
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
