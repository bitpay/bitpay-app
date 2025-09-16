const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const {
  resolver: {sourceExts, assetExts},
} = getDefaultConfig();

const ALIASES = {
  tslib: path.resolve(__dirname, 'node_modules/tslib/tslib.es6.js'),
};

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
  },
};

// Ensure Metro resolves to the ES6 build of tslib to avoid '__extends' undefined errors
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Normalize problematic deep imports to public exports for @noble/hashes
  // Some dependencies attempt to import "@noble/hashes/crypto.js", which isn't declared in
  // the package "exports" map. Redirect to the supported subpath export "@noble/hashes/crypto".
  if (
    moduleName === '@noble/hashes/crypto.js' ||
    moduleName === 'crypto-wallet-core/node_modules/@noble/hashes/crypto.js' ||
    // Absolute path variants (top-level & nested)
    /node_modules\/@noble\/hashes\/crypto\.js$/.test(moduleName) ||
    /node_modules\/crypto-wallet-core\/node_modules\/@noble\/hashes\/crypto\.js$/.test(moduleName)
  ) {
    moduleName = '@noble/hashes/crypto';
  }

  // Normalize multiformats deep CJS import to public export subpath
  // e.g., "multiformats/cjs/src/basics.js" -> "multiformats/basics"
  if (
    moduleName === 'multiformats/cjs/src/basics.js' ||
    /node_modules\/multiformats\/cjs\/src\/basics\.js$/.test(moduleName)
  ) {
    moduleName = 'multiformats/basics';
  }

  // rpc-websockets: the package uses conditional exports but doesn't have an
  // android condition; prefer the browser build under RN.
  if (moduleName === 'rpc-websockets') {
    moduleName = 'rpc-websockets/dist/index.browser.mjs';
  }

  return context.resolveRequest(
    context,
    ALIASES[moduleName] ?? moduleName,
    platform,
  );
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
