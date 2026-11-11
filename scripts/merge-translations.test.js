const assert = require('node:assert/strict');
const {execFileSync, spawnSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {test} = require('node:test');

const script = path.join(__dirname, 'merge-translations.js');
const serialize = catalog => JSON.stringify(catalog, null, 2) + '\n';

function merge(base, ours, theirs) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'bitpay-i18n-merge-'),
  );
  try {
    const files = ['base', 'ours', 'theirs'].map(name =>
      path.join(directory, `${name}.json`),
    );
    const before = [base, ours, theirs].map(value =>
      typeof value === 'string' ? value : serialize(value),
    );
    files.forEach((file, index) => fs.writeFileSync(file, before[index]));
    const result = spawnSync(process.execPath, [script, ...files], {
      encoding: 'utf8',
    });
    return {
      result,
      before,
      after: files.map(file => fs.readFileSync(file, 'utf8')),
    };
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

test('merges nearby additions and independent edits and deletions by key', () => {
  const {result, before, after} = merge(
    {
      Alpha: 'Alpha',
      Keep: 'Original',
      Other: 'Original other',
      Remove: 'Remove',
      Stable: 'Original stable',
      Zulu: 'Zulu',
    },
    {
      Zulu: 'Zulu',
      Stable: 'Shared edit',
      Other: 'Original other',
      Keep: 'Our edit',
      Beta: 'Beta',
      Alpha: 'Alpha',
    },
    {
      Alpha: 'Alpha',
      Gamma: 'Gamma',
      Keep: 'Original',
      Other: 'Their edit',
      Remove: 'Remove',
      Stable: 'Shared edit',
      Zulu: 'Zulu',
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    after[1],
    serialize({
      Alpha: 'Alpha',
      Beta: 'Beta',
      Gamma: 'Gamma',
      Keep: 'Our edit',
      Other: 'Their edit',
      Stable: 'Shared edit',
      Zulu: 'Zulu',
    }),
  );
  assert.equal(after[0], before[0]);
  assert.equal(after[2], before[2]);
});

test('preserves numeric, escaped and prototype-named keys', () => {
  const {result, after} = merge(
    '{"2":"Two","10":"Ten","\\u0053hare":"Original","__proto__":"Stored"}',
    '{"A":"A","10":"Ten","2":"Two","Share":"Changed","__proto__":"Stored"}',
    '{"2":"Two","10":"Ten","Share":"Original","B":"B","__proto__":"Stored"}',
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    after[1],
    serialize(
      JSON.parse(
        '{"2":"Two","10":"Ten","A":"A","B":"B","Share":"Changed","__proto__":"Stored"}',
      ),
    ),
  );
});

test('retains markers for incompatible edits, additions and deletion against edit', () => {
  for (const [base, ours, theirs, values] of [
    [
      {Share: 'Original'},
      {Share: 'First'},
      {Share: 'Second'},
      ['First', 'Second'],
    ],
    [{}, {Share: 'First'}, {Share: 'Second'}, ['First', 'Second']],
    [{Share: 'Original'}, {}, {Share: 'Edited'}, ['{}', 'Edited']],
  ]) {
    const {result, before, after} = merge(base, ours, theirs);
    assert.equal(result.status, 1, result.stderr);
    assert.match(after[1], /^<<<<<<< ours$/m);
    assert.match(after[1], /^=======$/m);
    assert.match(after[1], /^>>>>>>> theirs$/m);
    for (const value of values) {
      assert(after[1].includes(value));
    }
    assert.equal(after[0], before[0]);
    assert.equal(after[2], before[2]);
  }
});

test('reports a semantic conflict even when moved keys merge without text markers', () => {
  const entries = [
    'Alpha',
    'Bravo',
    'Charlie',
    'Delta',
    'Uniform',
    'Victor',
    'Whiskey',
    'Zulu',
  ].map(key => [key, key]);
  const withShare = (position, value) =>
    Object.fromEntries([
      ...entries.slice(0, position),
      ['Share', value],
      ...entries.slice(position),
    ]);
  const {result, after} = merge(
    withShare(4, 'Original'),
    withShare(1, 'First'),
    withShare(7, 'Second'),
  );
  assert.equal(result.status, 1, result.stderr);
  assert(after[1].includes('First'));
  assert(after[1].includes('Second'));
  assert(!after[1].includes('<<<<<<<'));
});

test('rejects malformed, duplicate and non-string catalogs without rewriting files', () => {
  for (const invalid of [
    '{"Share":',
    '{"Share":"First","Share":"Second"}',
    '{"Share":"First","\\u0053hare":"Second"}',
    '[]',
    'null',
    '{"Share":1}',
    '{"Share":{"nested":"Value"}}',
  ]) {
    for (const index of [0, 1, 2]) {
      const input = [
        {Share: 'Original'},
        {Share: 'Original'},
        {Share: 'Original'},
      ];
      input[index] = invalid;
      const {result, before, after} = merge(...input);
      assert.equal(result.status, 1, result.stderr);
      assert.deepEqual(after, before);
    }
  }
});

test('rejects incorrect arguments without modifying the input file', () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'bitpay-i18n-arguments-'),
  );
  try {
    const file = path.join(directory, 'catalog.json');
    const original = serialize({Share: 'Original'});
    fs.writeFileSync(file, original);
    for (const count of [0, 1, 2, 4]) {
      const result = spawnSync(
        process.execPath,
        [script, ...Array(count).fill(file)],
        {encoding: 'utf8'},
      );
      assert.equal(result.status, 1, result.stderr);
      assert.equal(fs.readFileSync(file, 'utf8'), original);
    }
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test('Git uses the driver to merge different keys inserted into the same gap', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bitpay-i18n-git-'));
  const git = (...args) =>
    execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {
      cwd: directory,
      encoding: 'utf8',
    });
  try {
    git('init', '-q', '--initial-branch=base');
    git('config', 'user.name', 'Translation tests');
    git('config', 'user.email', 'translations@example.invalid');
    git('config', 'commit.gpgsign', 'false');
    const quote = value => `'${value.replace(/'/g, "'\\''")}'`;
    git(
      'config',
      'merge.bitpay-translations.driver',
      `${quote(process.execPath)} ${quote(script)} "%O" "%A" "%B"`,
    );
    fs.copyFileSync(
      path.join(__dirname, '../.gitattributes'),
      path.join(directory, '.gitattributes'),
    );
    const file = 'locales/en/translation.json';
    fs.mkdirSync(path.dirname(path.join(directory, file)), {recursive: true});
    const base = {Alpha: 'Alpha', Middle: 'Middle', Zulu: 'Zulu'};
    fs.writeFileSync(path.join(directory, file), serialize(base));
    git('add', '--', '.gitattributes', file);
    git('commit', '-qm', 'Translation: Test - base');
    git('checkout', '-qb', 'ours');
    fs.writeFileSync(
      path.join(directory, file),
      serialize({Alpha: 'Alpha', Beta: 'Beta', Middle: 'Middle', Zulu: 'Zulu'}),
    );
    git('add', '--', file);
    git('commit', '-qm', 'Translation: Test - ours');
    git('checkout', '-qb', 'theirs', 'base');
    fs.writeFileSync(
      path.join(directory, file),
      serialize({
        Alpha: 'Alpha',
        Gamma: 'Gamma',
        Middle: 'Middle',
        Zulu: 'Zulu',
      }),
    );
    git('add', '--', file);
    git('commit', '-qm', 'Translation: Test - theirs');
    git('checkout', '-q', 'ours');
    git('merge', '--no-edit', 'theirs');
    assert.equal(
      fs.readFileSync(path.join(directory, file), 'utf8'),
      serialize({
        Alpha: 'Alpha',
        Beta: 'Beta',
        Gamma: 'Gamma',
        Middle: 'Middle',
        Zulu: 'Zulu',
      }),
    );
    assert.equal(git('ls-files', '-u', '--', file), '');
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});
