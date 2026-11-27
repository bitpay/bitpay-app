const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {test} = require('node:test');
const {
  checkTranslations,
  checkSourceTranslations,
} = require('./check-translations');

function catalogs() {
  return {
    en: {
      'Error: ': 'Error: ',
      Share: 'Share {{name}} with {{name}}',
      Terms: '<0>Read **terms**</0> [here](https://example.com)',
      '{{count}} wallet_one': '{{count}} wallet',
      '{{count}} wallet_other': '{{count}} wallets',
    },
    ru: {
      'Error: ': 'Ошибка: ',
      Share: 'Поделитесь {{name}} с {{name}}',
      Terms: '<0>Прочитайте **условия**</0> [здесь](https://example.com)',
      '{{count}} wallet_few': '{{count}} кошелька',
      '{{count}} wallet_many': '{{count}} кошельков',
      '{{count}} wallet_one': '{{count}} кошелёк',
      '{{count}} wallet_other': '{{count}} кошельков',
    },
    ja: {
      'Error: ': 'エラー：',
      Share: '{{name}} を {{name}} と共有',
      Terms: '<0>**規約**を読む</0> [こちら](https://example.com)',
      '{{count}} wallet_other': '{{count}} 個のウォレット',
    },
  };
}

test('native v4 families resolve locally; CJK spacing is a review warning', async () => {
  const result = await checkTranslations(catalogs());
  assert.deepEqual(result.errors, []);
  assert(result.warnings.some(w => w.lang === 'ja' && w.kind === 'whitespace'));
});

test('English fallback cannot conceal missing local plural forms', async () => {
  const input = catalogs();
  delete input.ru['{{count}} wallet_few'];
  const {errors} = await checkTranslations(input);
  assert(errors.some(e => e.includes('missing or empty translation')));
  assert(errors.some(e => e.includes('unresolved local plural for 2')));
});

test('rejects renamed/repeated variables and a residual brace after interpolation', async () => {
  for (const value of ['{{Name}} {{name}}', '{{name}}', '{{name}} {{name}}}']) {
    const input = catalogs();
    input.ru.Share = value;
    const {errors} = await checkTranslations(input);
    assert(
      errors.some(e => /interpolation mismatch|literal brace mismatch/.test(e)),
    );
  }
});

test('also rejects malformed interpolation in the English source', async () => {
  const {errors} = await checkTranslations({en: {Hello: 'Hello {{name}'}});
  assert(errors.some(e => e.includes('unbalanced interpolation')));
});

test('rejects broken tags, formatting and changed link destinations', async () => {
  for (const value of [
    '<0>**условия**</1> [здесь](https://example.com)',
    '</0>**условия**<0> [здесь](https://example.com)',
    '<0>условия</0> [здесь](https://example.com)',
    '<0>**условия**</0> [здесь](https://example.org)',
    '<0>**условия**</0> здесь](https://example.com)',
  ]) {
    const input = catalogs();
    input.ru.Terms = value;
    const {errors} = await checkTranslations(input);
    assert(errors.some(e => e.includes('markup mismatch')));
  }
});

test('rejects missing messages, obsolete v3 plural suffixes and lost Latin/Cyrillic separators', async () => {
  const input = catalogs();
  delete input.ja.Share;
  input.ja['{{count}} wallet_0'] = '{{count}} 個のウォレット';
  input.ru['Error: '] = 'Ошибка:';
  const {errors} = await checkTranslations(input);
  assert(errors.some(e => e.includes('missing or empty translation')));
  assert(errors.some(e => e.includes('unexpected key')));
  assert(errors.some(e => e.includes('trailing whitespace')));
});

test('preserves literal backup braces and reports long text without rejecting it', async () => {
  const input = {
    en: {Backup: 'Copy {{backup}} between {...}, including {}'},
    es: {
      Backup:
        'Copie todo el respaldo {{backup}} que aparece entre los símbolos {...}, incluidos los símbolos {}',
    },
  };
  const result = await checkTranslations(input);
  assert.deepEqual(result.errors, []);
  assert(result.warnings.some(w => w.kind === 'length'));
});

async function checkSource(code, translations = {}) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'bitpay-i18n-check-'),
  );
  try {
    const source = path.join(directory, 'source.tsx');
    const catalog = path.join(directory, 'locales/en/translation.json');
    fs.mkdirSync(path.dirname(catalog), {recursive: true});
    const original = JSON.stringify(translations, null, 2) + '\n';
    fs.writeFileSync(source, code);
    fs.writeFileSync(catalog, original);
    const errors = await checkSourceTranslations({
      locales: ['en'],
      extract: {
        input: source,
        output: path.join(directory, 'locales/{{language}}/{{namespace}}.json'),
        defaultNS: 'translation',
        keySeparator: false,
        nsSeparator: false,
        functions: ['t', '*.t'],
        transComponents: ['Trans'],
        removeUnusedKeys: false,
        extractFromComments: false,
        sort: false,
      },
    });
    assert.equal(fs.readFileSync(catalog, 'utf8'), original);
    return errors;
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

test('rejects literal source keys missing from English without writing catalogs', async () => {
  const errors = await checkSource("t('Missing key');");
  assert(
    errors.some(error =>
      error.includes('"Missing key": used in code but missing'),
    ),
  );
});

test('checks plural variants, Trans keys and literal newlines against English', async () => {
  const errors = await checkSource(
    "t('Wallets', {count: 2}); <Trans i18nKey='SendTo'/>; t('Line\\nbreak');",
    {
      Wallets_one: 'One wallet',
      Wallets_other: 'Many wallets',
      SendTo: 'Send to <0>{{email}}</0>',
      'Line\nbreak': 'Line\nbreak',
    },
  );
  assert.deepEqual(errors, []);
  const missing = await checkSource(
    "t('Wallets', {count: 2}); <Trans i18nKey='SendTo'/>;",
    {
      Wallets_one: 'One wallet',
    },
  );
  assert(missing.some(error => error.includes('"Wallets_other"')));
  assert(missing.some(error => error.includes('"SendTo"')));
});

test('allows keys built entirely from literal concatenations and branches', async () => {
  const errors = await checkSource(
    "t('Hello ' + 'world'); t(flag ? 'One' : 'Two'); t(`Key-${flag ? 'one' : 'two'}`);",
    {
      'Hello world': 'Hello world',
      One: 'One',
      Two: 'Two',
      'Key-one': 'one',
      'Key-two': 'two',
    },
  );
  assert.deepEqual(errors, []);
});

test('rejects dynamic keys even when another branch is extractable', async () => {
  const errors = await checkSource(
    "t(variable); t(`Key-${variable}`); t(flag ? 'Known' : variable);",
    {Known: 'Known'},
  );
  assert.equal(
    errors.filter(error => error.includes('dynamic keys cannot be checked'))
      .length,
    3,
  );
});

test('checks translation aliases from useTranslation', async () => {
  const errors = await checkSource(
    'const {t: translate} = useTranslation(); translate(variable);',
  );
  assert(
    errors.some(error => error.includes('dynamic keys cannot be checked')),
  );
});

test('fails when extraction skips a source file with a parse error', async () => {
  const errors = await checkSource("t('Missing'); const = ;");
  assert(errors.some(error => error.includes('translation extraction failed')));
});

test('rejects unsorted keys in English and translated catalogs', async () => {
  for (const lang of ['en', 'es']) {
    const input = {
      en: {Alpha: 'Alpha', Zulu: 'Zulu'},
      es: {Alpha: 'Alfa', Zulu: 'Zulu'},
    };
    input[lang] = {Zulu: input[lang].Zulu, Alpha: input[lang].Alpha};
    const {errors} = await checkTranslations(input);
    assert.deepEqual(errors, [
      `${lang}: translation keys must be sorted; run yarn translation:sort`,
    ]);
  }
});

test('accepts code-unit ordering for punctuation, case, accents and plural forms', async () => {
  const {errors} = await checkTranslations({
    en: {
      '!Warning': '!Warning',
      Apple: 'Apple',
      Wallet_one: 'One wallet',
      Wallet_other: 'Many wallets',
      apple: 'apple',
      Álbum: 'Álbum',
    },
    ru: {
      '!Warning': '!Warning',
      Apple: 'Apple',
      Wallet_few: 'Wallets',
      Wallet_many: 'Wallets',
      Wallet_one: 'Wallet',
      Wallet_other: 'Wallets',
      apple: 'apple',
      Álbum: 'Álbum',
    },
  });
  assert.deepEqual(errors, []);
});

test('accepts canonical JavaScript ordering for integer keys', async () => {
  const {errors} = await checkTranslations({
    en: {10: 'Ten', 2: 'Two', Apple: 'Apple'},
    es: {10: 'Diez', 2: 'Dos', Apple: 'Manzana'},
  });
  assert.deepEqual(errors, []);
});

test('extraction preserves catalog values and keeps new keys sorted and idempotent', async () => {
  const cli = require.resolve('i18next-cli');
  const {createJiti} = require(require.resolve('jiti', {paths: [cli]}));
  const {runExtractor} = require(cli);
  const config = await createJiti(__dirname).import(
    path.join(__dirname, '../i18next.config.ts'),
    {default: true},
  );
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'bitpay-i18n-extract-'),
  );
  try {
    const source = path.join(directory, 'source.tsx');
    const catalog = path.join(directory, 'locales/en/translation.json');
    fs.mkdirSync(path.dirname(catalog), {recursive: true});
    fs.writeFileSync(source, "t('Middle');");
    fs.writeFileSync(
      catalog,
      JSON.stringify(
        {
          Zulu: 'Existing Zulu',
          Álbum: 'Existing album',
          apple: 'Existing apple',
          Wallet_other: 'Existing wallets',
          Wallet_one: 'Existing wallet',
          Alpha: 'Existing Alpha',
          '!Warning': 'Existing warning',
        },
        null,
        2,
      ) + '\n',
    );
    config.extract.input = source;
    config.extract.output = path.join(
      directory,
      'locales/{{language}}/{{namespace}}.json',
    );
    const first = await runExtractor(config, {quiet: true});
    assert.equal(first.hasErrors, false);
    const raw = fs.readFileSync(catalog, 'utf8');
    assert.equal(
      raw,
      JSON.stringify(
        {
          '!Warning': 'Existing warning',
          Alpha: 'Existing Alpha',
          Middle: 'Middle',
          Wallet_one: 'Existing wallet',
          Wallet_other: 'Existing wallets',
          Zulu: 'Existing Zulu',
          apple: 'Existing apple',
          Álbum: 'Existing album',
        },
        null,
        2,
      ) + '\n',
    );
    const second = await runExtractor(config, {quiet: true});
    assert.equal(second.hasErrors, false);
    assert.equal(second.anyFileUpdated, false);
    assert.equal(fs.readFileSync(catalog, 'utf8'), raw);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});
