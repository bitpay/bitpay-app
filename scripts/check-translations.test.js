const assert = require('node:assert/strict');
const {test} = require('node:test');
const {checkTranslations} = require('./check-translations');

function catalogs() {
  return {
    en: {
      '{{count}} wallet': '{{count}} wallet',
      '{{count}} wallet_plural': '{{count}} wallets',
      Share: 'Share {{name}} with {{name}}',
      Terms: '<0>Read **terms**</0> [here](https://example.com)',
      'Error: ': 'Error: ',
    },
    ru: {
      '{{count}} wallet_0': '{{count}} кошелёк',
      '{{count}} wallet_1': '{{count}} кошелька',
      '{{count}} wallet_2': '{{count}} кошельков',
      Share: 'Поделитесь {{name}} с {{name}}',
      Terms: '<0>Прочитайте **условия**</0> [здесь](https://example.com)',
      'Error: ': 'Ошибка: ',
    },
    ja: {
      '{{count}} wallet_0': '{{count}} 個のウォレット',
      Share: '{{name}} を {{name}} と共有',
      Terms: '<0>**規約**を読む</0> [こちら](https://example.com)',
      'Error: ': 'エラー：',
    },
  };
}

test('native v3 families resolve locally; CJK spacing is a review warning', async () => {
  const result = await checkTranslations(catalogs());
  assert.deepEqual(result.errors, []);
  assert(result.warnings.some(w => w.lang === 'ja' && w.kind === 'whitespace'));
});

test('English fallback cannot conceal missing local plural forms', async () => {
  const input = catalogs();
  delete input.ru['{{count}} wallet_1'];
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

test('rejects missing messages, obsolete English plural suffixes and lost Latin/Cyrillic separators', async () => {
  const input = catalogs();
  delete input.ja.Share;
  input.ja['{{count}} wallet_plural'] = '{{count}} 個のウォレット';
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
