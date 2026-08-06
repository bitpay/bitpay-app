const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const {withSentryConfig} = require('@sentry/react-native/metro');

const {
  resolver: {sourceExts, assetExts},
} = getDefaultConfig();

const SHIM_PATH = path.resolve(__dirname, 'shims/silence-dkls-web.js');
const FS_PROMISES_SHIM = path.resolve(__dirname, 'shims/fs-promises.js');
const REAL_SILENCE_PATH = path.resolve(
  __dirname,
  'node_modules/@silencelaboratories/dkls-wasm-ll-web/dkls-wasm-ll-web.js'
);
const SILENCE_WASM_PATH = path.resolve(
  __dirname,
  'node_modules/@silencelaboratories/dkls-wasm-ll-web/dkls-wasm-ll-web_bg.wasm'
);
const SEVEN_ZIP_SHIM = path.resolve(
  __dirname,
  'shims/vultisig-rn-assets.js',
);

const ALIASES = {
  tslib: path.resolve(__dirname, 'node_modules/tslib/tslib.es6.js'),
  crypto: require.resolve('react-native-quick-crypto'),
  http: require.resolve('@tradle/react-native-http'),
  https: require.resolve('https-browserify'),
  os: require.resolve('react-native-os'),
  path: require.resolve('path-browserify'),
  fs: require.resolve('react-native-level-fs'),
  stream: require.resolve('stream-browserify'),
  _stream_transform: require.resolve('readable-stream/transform'),
  _stream_readable: require.resolve('readable-stream/readable'),
  _stream_writable: require.resolve('readable-stream/writable'),
  _stream_duplex: require.resolve('readable-stream/duplex'),
  _stream_passthrough: require.resolve('readable-stream/passthrough'),
  vm: require.resolve('vm-browserify'),
  'fs/promises': FS_PROMISES_SHIM,
  'react-native-fast-pbkdf2': path.resolve(
    __dirname,
    'shims/react-native-fast-pbkdf2.js',
  ),
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
    alias: {
      '@silencelaboratories/dkls-wasm-ll-web': SHIM_PATH,
      '@@silence-original': REAL_SILENCE_PATH,
      '@@silence-wasm': SILENCE_WASM_PATH,
      ...ALIASES,
    },
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

  if (moduleName === '7z-wasm') moduleName = SEVEN_ZIP_SHIM;

  if (
    moduleName === '@silencelaboratories/dkls-wasm-ll-web' ||
    moduleName.startsWith('@silencelaboratories/dkls-wasm-ll-web/')
  ) {
    moduleName = SHIM_PATH;
  }

  if (moduleName === '@@silence-original') moduleName = REAL_SILENCE_PATH;
  if (moduleName === '@@silence-wasm')     moduleName = SILENCE_WASM_PATH;
  if (moduleName === 'fs/promises') moduleName = FS_PROMISES_SHIM;
  if (moduleName === 'react-native-fast-pbkdf2') {
    moduleName = ALIASES['react-native-fast-pbkdf2'];
  }

  return context.resolveRequest(
    context,
    ALIASES[moduleName] ?? moduleName,
    platform,
  );
};

module.exports = withSentryConfig(
  mergeConfig(getDefaultConfig(__dirname), config),
);
