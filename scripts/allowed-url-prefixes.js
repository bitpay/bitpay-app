#!/usr/bin/env node
const fs = require('fs');
const dotenv = require('dotenv');

if (!['development', 'production'].includes(process.env.NODE_ENV)) {
  console.log('Please, set NODE_ENV ["development" | "production"]');
  return;
}

const envPath = `${__dirname}/../.env.${process.env.NODE_ENV}`;
const result = dotenv.config({path: envPath});

if (result.error) {
  throw result.error;
}

const isReset = !!process.argv[2];

const xcodeProjectPath = `${__dirname}/../ios/BitPayApp.xcodeproj/project.pbxproj`;
const androidManifestPath = `${__dirname}/../android/app/src/main/AndroidManifest.xml`;
const xcodeProjectContent = fs.readFileSync(xcodeProjectPath, 'utf8');
const androidManifestContent = fs.readFileSync(androidManifestPath, 'utf8');

const developmentOnlyAllowedUrlPrefixes =
  process.env.NODE_ENV === 'development'
    ? (process.env.ALLOWED_URL_PREFIXES_DEVELOPMENT || '').split(',')
    : [];

const allowedUrlPrefixes = [
  'https://bitpay.com',
  'https://test.bitpay.com',
  'https://staging.bitpay.com',
  'https://bws.bitpay.com',
  'https://www.coinbase.com',
  'https://api.1inch.io/v4.0/',
  'https://api.coingecko.com/api/v3/simple/token_price/',
  'https://checkout.simplexcc.com',
  'https://sandbox.test-simplexcc.com',
  'https://api.testwyre.com',
  'https://api.sendwyre.com',
  'https://api.zenledger.io/bitpay/wallets/',
  'https://rest.iad-05.braze.com',
  'https://sdk.iad-05.braze.com',
  'https://cloudflare-eth.com/',
  'https://polygon-rpc.com/',
  'https://matic-mumbai.chainstacklabs.com',
].concat(developmentOnlyAllowedUrlPrefixes);

const allowedUrlPrefixString = allowedUrlPrefixes.join(',');

let replaceArgs = ['ALLOWED-URL-PREFIXES-REPLACE-ME', allowedUrlPrefixString];

if (isReset) {
  replaceArgs = [replaceArgs[1], replaceArgs[0]];
}

fs.writeFileSync(
  xcodeProjectPath,
  xcodeProjectContent.replaceAll(...replaceArgs),
);

fs.writeFileSync(
  androidManifestPath,
  androidManifestContent.replaceAll(...replaceArgs),
);

console.log(
  `${process.env.NODE_ENV.toUpperCase()} Allowed URL prefixes successfully ${
    isReset ? 're' : ''
  }set.`,
);
