const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {test} = require('node:test');
const {languages, parseCatalog, sortCatalog} = require('./translation-catalog');

test('parses flat translations without confusing quoted or escaped text with keys', () => {
  const catalog = {
    'A "quoted": key\\tail': 'Text: "quoted" and \\ path\n{{name}} <0>text</0>',
    Unicode: '日本語 y español',
    '': '',
  };
  assert.deepEqual(parseCatalog(JSON.stringify(catalog), 'en'), catalog);
  assert.deepEqual(parseCatalog('{}', 'en'), {});
});

test('rejects ordinary and escaped duplicate keys', () => {
  for (const raw of [
    '{"Share":"first","Share":"second"}',
    String.raw`{"Share":"first","Sh\u0061re":"second"}`,
    String.raw`{"A\\B":"first","A\u005cB":"second"}`,
  ]) {
    assert.throws(() => parseCatalog(raw, 'es'), {
      message: 'es: duplicate translation keys',
    });
  }
});

test('rejects malformed JSON and catalogs that are not flat string objects', () => {
  assert.throws(() => parseCatalog('{"Share":', 'en'), {
    message: 'en: invalid JSON',
  });
  for (const raw of [
    'null',
    '[]',
    '"text"',
    '2',
    'true',
    '{"Share":null}',
    '{"Share":2}',
    '{"Share":true}',
    '{"Share":[]}',
    '{"Share":{"nested":"text"}}',
  ]) {
    assert.throws(() => parseCatalog(raw, 'en'), {
      message: 'en: expected an object with string translations',
    });
  }
});

test('sorts with native integer-key ordering without losing translations', () => {
  const catalog = {
    Zulu: 'Zulu',
    10: 'ten',
    apple: 'apple',
    2: 'two',
    Álbum: 'álbum',
    Alpha: 'Alpha',
    '01': 'zero one',
    '!Warning': 'warning',
  };
  const sorted = sortCatalog(catalog);
  assert.deepEqual(Object.keys(sorted), [
    '2',
    '10',
    '!Warning',
    '01',
    'Alpha',
    'Zulu',
    'apple',
    'Álbum',
  ]);
  assert.deepEqual(sorted, catalog);
  const raw = JSON.stringify(sorted, null, 2) + '\n';
  assert.equal(JSON.stringify(sortCatalog(sorted), null, 2) + '\n', raw);
  assert.deepEqual(parseCatalog(raw, 'en'), catalog);
});

function withSorter(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bitpay-i18n-sort-'));
  try {
    fs.mkdirSync(path.join(directory, 'scripts'));
    for (const file of ['sort-translations.js', 'translation-catalog.js']) {
      fs.copyFileSync(
        path.join(__dirname, file),
        path.join(directory, 'scripts', file),
      );
    }
    const files = languages.map(lang =>
      path.join(directory, 'locales', lang, 'translation.json'),
    );
    for (const [index, file] of files.entries()) {
      fs.mkdirSync(path.dirname(file), {recursive: true});
      fs.writeFileSync(
        file,
        JSON.stringify({Zulu: `${languages[index]} Z`, Alpha: 'A'}) + '\n',
      );
    }
    run(directory, files);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

test('sort command preserves all nine catalogs and is byte-idempotent', () => {
  withSorter((directory, files) => {
    const before = files.map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
    const script = path.join(directory, 'scripts/sort-translations.js');
    const first = spawnSync(process.execPath, [script], {encoding: 'utf8'});
    assert.equal(first.status, 0, first.stderr);
    const sorted = files.map(file => fs.readFileSync(file, 'utf8'));
    for (const [index, raw] of sorted.entries()) {
      assert.deepEqual(JSON.parse(raw), before[index]);
      assert.equal(
        raw,
        JSON.stringify({Alpha: 'A', Zulu: `${languages[index]} Z`}, null, 2) +
          '\n',
      );
    }
    const second = spawnSync(process.execPath, [script], {encoding: 'utf8'});
    assert.equal(second.status, 0, second.stderr);
    assert.deepEqual(
      files.map(file => fs.readFileSync(file, 'utf8')),
      sorted,
    );
  });
});

test('sort command leaves every file untouched if the final catalog is invalid', () => {
  for (const [raw, message] of [
    ['{"Share":', 'invalid JSON'],
    ['{"Share":"first","Share":"second"}', 'duplicate translation keys'],
  ]) {
    withSorter((directory, files) => {
      fs.writeFileSync(files[files.length - 1], raw);
      const before = files.map(file => fs.readFileSync(file, 'utf8'));
      const result = spawnSync(
        process.execPath,
        [path.join(directory, 'scripts/sort-translations.js')],
        {encoding: 'utf8'},
      );
      assert.equal(result.status, 1);
      assert(result.stderr.includes(message));
      assert.deepEqual(
        files.map(file => fs.readFileSync(file, 'utf8')),
        before,
      );
    });
  }
});

function withExtractor(run) {
  withSorter((directory, files) => {
    const {scripts} = require('../package.json');
    fs.writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({
        private: true,
        scripts: {
          'translation:extract': scripts['translation:extract'],
          'translation:sort': scripts['translation:sort'],
        },
      }),
    );
    fs.copyFileSync(
      path.join(__dirname, '../i18next.config.ts'),
      path.join(directory, 'i18next.config.ts'),
    );
    fs.symlinkSync(
      path.join(__dirname, '../node_modules'),
      path.join(directory, 'node_modules'),
      'dir',
    );
    fs.mkdirSync(path.join(directory, 'src'));
    fs.writeFileSync(path.join(directory, 'src/source.tsx'), "t('Middle');");
    const extract = () =>
      spawnSync('yarn', ['translation:extract'], {
        cwd: directory,
        encoding: 'utf8',
        env: {
          ...process.env,
          npm_config_offline: 'true',
          npm_config_cache: path.join(directory, '.npm-cache'),
          YARN_CACHE_FOLDER: path.join(directory, '.yarn-cache'),
        },
      });
    run(files, extract);
  });
}

test('translation:extract sorts every locale before inserting new English keys', () => {
  withExtractor((files, extract) => {
    const before = files.map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
    const first = extract();
    assert.equal(first.status, 0, first.stderr + first.stdout);
    const sorted = files.map(file => fs.readFileSync(file, 'utf8'));
    for (const [index, raw] of sorted.entries()) {
      const catalog = JSON.parse(raw);
      assert.deepEqual(
        Object.keys(catalog),
        index === 0 ? ['Alpha', 'Middle', 'Zulu'] : ['Alpha', 'Zulu'],
      );
      for (const [key, value] of Object.entries(before[index])) {
        assert.equal(catalog[key], value);
      }
    }
    assert.equal(JSON.parse(sorted[0]).Middle, 'Middle');
    const second = extract();
    assert.equal(second.status, 0, second.stderr + second.stdout);
    assert.deepEqual(
      files.map(file => fs.readFileSync(file, 'utf8')),
      sorted,
    );
  });
});

test('translation:extract refuses duplicate keys before changing any catalog', () => {
  withExtractor((files, extract) => {
    fs.writeFileSync(files[0], '{"Alpha":"first","Alpha":"second"}');
    const before = files.map(file => fs.readFileSync(file, 'utf8'));
    const result = extract();
    assert.equal(result.status, 1);
    assert(
      (result.stderr + result.stdout).includes('duplicate translation keys'),
    );
    assert.deepEqual(
      files.map(file => fs.readFileSync(file, 'utf8')),
      before,
    );
  });
});
