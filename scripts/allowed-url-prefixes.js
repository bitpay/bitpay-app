#!/usr/bin/env node
const fs = require('fs');
const dotenv = require('dotenv');

if (!['development', 'production'].includes(process.env.NODE_ENV)) {
  throw 'Please, set NODE_ENV ["development" | "production"]';
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

const developmentAssetsPrefix = 'http://localhost:8081';

const developmentOnlyAllowedUrlPrefixes =
  process.env.NODE_ENV === 'development'
    ? (process.env.ALLOWED_URL_PREFIXES_DEVELOPMENT || '')
        .split(',')
        .concat([developmentAssetsPrefix])
    : [];

const allowedUrlPrefixes = [
  'https://bitpay.com/',
  'https://test.bitpay.com/',
  'https://staging.bitpay.com/',
  'https://bws.bitpay.com/',
  'https://www.coinbase.com/',
  'https://api.coinbase.com/',
  'https://api.1inch.dev/swap/v5.2/',
  'https://api.coingecko.com/api/v3/simple/token_price/',
  'https://checkout.simplexcc.com/',
  'https://sandbox.test-simplexcc.com',
  'https://api.zenledger.io/bitpay/wallets/',
  'https://rest.iad-05.braze.com/',
  'https://sdk.iad-05.braze.com/',
  'https://cloudflare-eth.com/',
  'https://sepolia.infura.io/v3/',
  'https://polygon-rpc.com/',
  'https://polygon-amoy.core.chainstack.com/',
  'https://static.methodfi.com/',
  'https://api.zenledger.io/',
  'https://api.blockcypher.com/v1/',
  'https://api.fullstack.cash/v5/',
  'https://deep-index.moralis.io/api/v2.2/',
  'https://api.bitcore.io/api',
  'https://api-eth.bitcore.io/api',
  'https://api-matic.bitcore.io/api',
  'https://api-arb.bitcore.io/api',
  'https://api-base.bitcore.io/api',
  'https://api-op.bitcore.io/api',
  'https://api-xrp.bitcore.io/api',
  'https://api-sol.bitcore.io/api',
  'https://portal.polygon.technology/bridge',
  'https://bridge.arbitrum.io/',
  'https://bridge.base.org/',
  'https://app.optimism.io/bridge/',
  'https://mainnet.optimism.io/',
  'https://arb1.arbitrum.io/rpc',
  'https://mainnet.base.org/',
  'https://goerli.optimism.io',
  'https://goerli-rollup.arbitrum.io/rpc',
  'https://goerli.base.org',
  'https://verify.walletconnect.com/',
  'https://verify.walletconnect.org/',
  'https://api.etherscan.io/v2/api',
  'https://solana-gateway.moralis.io/account/',
  'https://tokens-data.1inch.io/images/501/',
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
