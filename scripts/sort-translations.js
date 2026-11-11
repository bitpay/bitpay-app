const fs = require('node:fs');
const path = require('node:path');
const {languages, parseCatalog, sortCatalog} = require('./translation-catalog');

function main() {
  const catalogs = languages.map(lang => {
    const file = path.join(__dirname, '../locales', lang, 'translation.json');
    const catalog = parseCatalog(fs.readFileSync(file, 'utf8'), file);
    return {file, catalog: sortCatalog(catalog)};
  });
  for (const {file, catalog} of catalogs) {
    fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
