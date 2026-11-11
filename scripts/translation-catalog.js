const languages = ['en', 'de', 'es', 'fr', 'ja', 'nl', 'pt', 'ru', 'zh'];

function parseCatalog(raw, label) {
  let catalog;
  try {
    catalog = JSON.parse(raw);
  } catch {
    throw new Error(`${label}: invalid JSON`);
  }
  if (
    !catalog ||
    Array.isArray(catalog) ||
    typeof catalog !== 'object' ||
    Object.values(catalog).some(value => typeof value !== 'string')
  ) {
    throw new Error(`${label}: expected an object with string translations`);
  }
  const stringTokens = raw.match(/"(?:[^"\\]|\\.)*"/g) || [];
  if (stringTokens.length !== Object.keys(catalog).length * 2) {
    throw new Error(`${label}: duplicate translation keys`);
  }
  return catalog;
}

function sortCatalog(catalog) {
  return Object.fromEntries(
    Object.keys(catalog)
      .sort()
      .map(key => [key, catalog[key]]),
  );
}

module.exports = {languages, parseCatalog, sortCatalog};
