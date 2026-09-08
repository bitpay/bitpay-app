const fs = require('node:fs');
const path = require('node:path');
const i18next = require('i18next');

const languages = ['en', 'de', 'es', 'fr', 'ja', 'nl', 'pt', 'ru', 'zh'];
const counts = [0, 1, 2, 3, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111];
const matches = (text, pattern) => (text.match(pattern) || []).sort();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const withoutVariables = text => text.replace(/{{[^{}]*}}/g, '');
const linkDestinations = text =>
  [...text.matchAll(/\[[^\]]*\]\(([^)]*)\)/g)].map(match => match[1]).sort();

function tagsAreBalanced(text) {
  const stack = [];
  for (const tag of text.matchAll(/<(\/?)([\w]+)(?:\s[^<>]*?)?(\/?)>/g)) {
    if (tag[3]) {
      continue;
    }
    if (tag[1]) {
      if (stack.pop() !== tag[2]) {
        return false;
      }
    } else {
      stack.push(tag[2]);
    }
  }
  return stack.length === 0;
}

async function checkTranslations(catalogs) {
  const errors = [];
  const warnings = [];
  const en = catalogs.en;
  const instance = i18next.createInstance();
  await instance.init({
    resources: Object.fromEntries(
      Object.entries(catalogs).map(([lang, translation]) => [
        lang,
        {translation},
      ]),
    ),
    lng: 'en',
    fallbackLng: 'en',
    compatibilityJSON: 'v3',
    keySeparator: false,
    nsSeparator: false,
    interpolation: {escapeValue: false},
  });
  const resolver = instance.services.pluralResolver;
  const families = Object.keys(en)
    .filter(key => key.endsWith('_plural'))
    .map(key => key.slice(0, -7));
  const bases = Object.keys(en).filter(key => !key.endsWith('_plural'));

  for (const key of families) {
    if (!Object.hasOwn(en, key)) {
      errors.push(`en: missing plural base ${JSON.stringify(key)}`);
    }
  }

  for (const [lang, catalog] of Object.entries(catalogs)) {
    const expected = new Map();
    for (const key of bases) {
      if (families.includes(key)) {
        for (const suffix of resolver.getSuffixes(lang)) {
          expected.set(
            key + suffix,
            key + (suffix === '' || suffix === '_0' ? '' : '_plural'),
          );
        }
      } else {
        expected.set(key, key);
      }
    }

    for (const key of Object.keys(catalog)) {
      if (!expected.has(key)) {
        errors.push(`${lang}: unexpected key ${JSON.stringify(key)}`);
      }
    }
    for (const [key, sourceKey] of expected) {
      const label = `${lang}: ${JSON.stringify(key)}`;
      const value = catalog[key];
      const source = en[sourceKey];
      if (typeof value !== 'string' || !value.trim()) {
        errors.push(`${label}: missing or empty translation`);
        continue;
      }
      if (typeof source !== 'string') {
        errors.push(`en: ${JSON.stringify(sourceKey)}: invalid source value`);
        continue;
      }
      const literal = withoutVariables(value);
      if (
        /{{|}}/.test(literal) ||
        matches(literal, /{/g).length !== matches(literal, /}/g).length
      ) {
        errors.push(`${label}: unbalanced interpolation or literal braces`);
      }
      if (
        !same(matches(value, /{{[^{}]*}}/g), matches(source, /{{[^{}]*}}/g))
      ) {
        errors.push(`${label}: interpolation mismatch`);
      }
      if (
        !same(
          matches(withoutVariables(value), /[{}]/g),
          matches(withoutVariables(source), /[{}]/g),
        )
      ) {
        errors.push(`${label}: literal brace mismatch`);
      }
      const tags = /<\/?[\w][^<>]*>/g;
      if (
        !same(matches(value, tags), matches(source, tags)) ||
        !same(linkDestinations(value), linkDestinations(source)) ||
        matches(value, /\*\*/g).length !== matches(source, /\*\*/g).length ||
        matches(value, /\*\*/g).length % 2 !== 0 ||
        !tagsAreBalanced(value)
      ) {
        errors.push(`${label}: markup mismatch or unbalanced tags`);
      }
      const trailing = text => text.match(/\s*$/)[0];
      const leading = text => text.match(/^\s*/)[0];
      if (trailing(value) !== trailing(source)) {
        const message = `${label}: trailing whitespace differs from English`;
        if (['ja', 'zh'].includes(lang)) {
          warnings.push({lang, key, kind: 'whitespace', message});
        } else {
          errors.push(message);
        }
      }
      if (leading(value) !== leading(source) || / {2,}/.test(value)) {
        warnings.push({lang, key, kind: 'whitespace', value});
      }
      if (/\\[nt"]/.test(value)) {
        errors.push(`${label}: literal escape sequence; check JSON escaping`);
      }
      if (lang !== 'en' && [...value].length > [...source].length * 1.6) {
        warnings.push({
          lang,
          key,
          kind: 'length',
          source,
          value,
          ratio: Number(([...value].length / [...source].length).toFixed(2)),
        });
      }
    }

    for (const key of families) {
      for (const count of counts) {
        const resolved = instance.translator.resolve(key, {lng: lang, count});
        if (
          resolved.usedLng !== lang ||
          resolved.exactUsedKey !== key + resolver.getSuffix(lang, count) ||
          typeof resolved.res !== 'string' ||
          !resolved.res
        ) {
          errors.push(
            `${lang}: ${JSON.stringify(
              key,
            )}: unresolved local plural for ${count}`,
          );
        }
        if (instance.t(key, {lng: lang, count}).includes('{{count}}')) {
          errors.push(
            `${lang}: ${JSON.stringify(key)}: count was not interpolated`,
          );
        }
      }
    }
  }
  return {
    errors,
    warnings,
    languages: Object.keys(catalogs),
    pluralFamilies: families.length,
  };
}

async function main() {
  const catalogs = {};
  const formatErrors = [];
  for (const lang of languages) {
    const file = path.join(__dirname, '../locales', lang, 'translation.json');
    const raw = fs.readFileSync(file, 'utf8');
    catalogs[lang] = JSON.parse(raw);
    if (raw !== JSON.stringify(catalogs[lang], null, 2) + '\n') {
      formatErrors.push(
        `${lang}: use unique keys, two-space indentation, Unicode and a final newline`,
      );
    }
  }
  const result = await checkTranslations(catalogs);
  result.errors.unshift(...formatErrors);
  if (process.argv.includes('--report')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const error of result.errors) {
      console.error(error);
    }
    const lengths = result.warnings.filter(w => w.kind === 'length').length;
    console.log(
      `${languages.length} catalogs, ${
        result.pluralFamilies
      } plural families: ${
        result.errors.length
      } errors; ${lengths} length and ${
        result.warnings.length - lengths
      } whitespace warnings.`,
    );
    console.log(
      'Use node scripts/check-translations.js --report to review warnings.',
    );
  }
  process.exitCode = result.errors.length ? 1 : 0;
}

module.exports = {checkTranslations};
if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
