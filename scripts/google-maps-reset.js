#!/usr/bin/env node
const fs = require('fs');
const dotenv = require('dotenv');

(() => {
  if (!['development', 'production'].includes(process.env.NODE_ENV)) {
    console.log('Please set NODE_ENV ["development" | "production"]');
    return;
  }

  const envPath = `${__dirname}/../.env.${process.env.NODE_ENV}`;
  const result = dotenv.config({path: envPath});

  if (result.error) {
    throw result.error;
  }

  if (process.env.GOOGLE_MAPS_API_KEY) {
    const androidManifestPath = `${__dirname}/../android/app/src/main/AndroidManifest.xml`;
    let androidManifestContent = fs.readFileSync(androidManifestPath, 'utf-8');

    androidManifestContent = androidManifestContent.replace(
      process.env.GOOGLE_MAPS_API_KEY,
      'GOOGLE_MAPS_API_KEY_REPLACE_ME',
    );

    fs.writeFileSync(androidManifestPath, androidManifestContent);
  }

  console.log(
    `${process.env.NODE_ENV.toUpperCase()} Google Maps API key successfully updated.`,
  );
})();
