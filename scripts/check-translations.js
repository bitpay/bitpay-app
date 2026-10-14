const fs = require('node:fs');
const path = require('node:path');
require('intl-pluralrules');
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
    keySeparator: false,
    nsSeparator: false,
    interpolation: {escapeValue: false},
  });
  const resolver = instance.services.pluralResolver;
  const pluralSuffixes = ['_zero', '_one', '_two', '_few', '_many', '_other'];
  const families = Object.keys(en)
    .filter(key => key.endsWith('_one'))
    .map(key => key.slice(0, -4));
  const bases = Object.keys(en).filter(
    key => !pluralSuffixes.some(suffix => key.endsWith(suffix)),
  );

  for (const [lang, catalog] of Object.entries(catalogs)) {
    const expected = new Map();
    for (const key of new Set([...bases, ...families])) {
      if (families.includes(key)) {
        if (Object.hasOwn(catalog, key)) {
          expected.set(key, key + '_other');
        }
        for (const suffix of resolver.getSuffixes(lang)) {
          expected.set(
            key + suffix,
            key + (suffix === '_one' ? '_one' : '_other'),
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

function isStaticTranslationKey(node) {
  if (node.type === 'StringLiteral') {
    return true;
  }
  if (node.type === 'TemplateLiteral') {
    return node.expressions.every(isStaticTranslationKey);
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return (
      isStaticTranslationKey(node.left) && isStaticTranslationKey(node.right)
    );
  }
  if (node.type === 'ConditionalExpression') {
    return (
      isStaticTranslationKey(node.consequent) &&
      isStaticTranslationKey(node.alternate)
    );
  }
  if (node.type === 'ArrayExpression') {
    return node.elements.every(
      element =>
        element &&
        !element.spread &&
        isStaticTranslationKey(element.expression),
    );
  }
  return false;
}

function getFunctionName(node) {
  if (node.type === 'Identifier') {
    return node.value;
  }
  if (node.type === 'MemberExpression' && node.property.type === 'Identifier') {
    const parent = getFunctionName(node.object);
    return parent && `${parent}.${node.property.value}`;
  }
}

async function checkSourceTranslations(inputConfig) {
  const cli = require.resolve('i18next-cli');
  // i18next-cli does not export its config loader; it reads the TS config with its own jiti dependency.
  const {createJiti} = require(require.resolve('jiti', {paths: [cli]}));
  const {findKeys, getTranslations} = require(cli);
  const config =
    inputConfig ||
    (await createJiti(__dirname).import(
      path.join(__dirname, '../i18next.config.ts'),
      {default: true},
    ));
  const errors = [];
  const fileErrors = [];
  let currentFile;
  let currentCode;
  const functions = config.extract.functions || ['t', '*.t'];
  const {allKeys, objectKeys} = await findKeys(
    {
      ...config,
      extract: {
        ...config.extract,
        ignore: [
          ...(Array.isArray(config.extract.ignore)
            ? config.extract.ignore
            : config.extract.ignore
            ? [config.extract.ignore]
            : []),
          '**/config.ts',
          '**/.env*',
        ],
      },
      plugins: [
        ...(config.plugins || []),
        {
          name: 'check-static-translation-keys',
          onLoad(code, file) {
            currentFile = file;
            currentCode = code;
          },
          onVisitNode(node, context) {
            if (node.type !== 'CallExpression' || !node.arguments.length) {
              return;
            }
            const name = getFunctionName(node.callee);
            if (
              !name ||
              !(
                context.getVarFromScope(name) ||
                functions.some(pattern =>
                  pattern.startsWith('*.')
                    ? name.endsWith(pattern.slice(1))
                    : name === pattern,
                )
              )
            ) {
              return;
            }
            const argument = node.arguments[0].expression;
            if (!isStaticTranslationKey(argument)) {
              const line = currentCode
                .slice(0, argument.span.start)
                .split('\n').length;
              errors.push(
                `${currentFile}:${line}: translation key must use literals; dynamic keys cannot be checked`,
              );
            }
          },
        },
      ],
    },
    undefined,
    fileErrors,
  );
  errors.push(
    ...fileErrors.map(file => `${file}: translation extraction failed`),
  );
  const results = await getTranslations(allKeys, objectKeys, config);
  errors.push(
    ...results.flatMap(({newTranslations, existingTranslations}) =>
      Object.keys(newTranslations)
        .filter(key => !Object.hasOwn(existingTranslations, key))
        .map(
          key =>
            `en: ${JSON.stringify(
              key,
            )}: used in code but missing; run yarn translation:extract`,
        ),
    ),
  );
  return errors;
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
  result.errors.unshift(...formatErrors, ...(await checkSourceTranslations()));
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

module.exports = {checkTranslations, checkSourceTranslations};
if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
