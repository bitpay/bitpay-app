const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const {withSentryConfig} = require('@sentry/react-native/metro');

const {
  resolver: {sourceExts, assetExts},
} = getDefaultConfig();

const SHIM_PATH = path.resolve(__dirname, 'shims/silence-dkls-web.js');
const REAL_SILENCE_PATH = path.resolve(
  __dirname,
  'node_modules/@silencelaboratories/dkls-wasm-ll-web/dkls-wasm-ll-web.js'
);
const SILENCE_WASM_PATH = path.resolve(
  __dirname,
  'node_modules/@silencelaboratories/dkls-wasm-ll-web/dkls-wasm-ll-web_bg.wasm'
);

const ALIASES = {
  tslib: path.resolve(__dirname, 'node_modules/tslib/tslib.es6.js'),
  crypto: require.resolve('react-native-quick-crypto'),
  bitauth: path.resolve(
    __dirname,
    'node_modules/bitauth/lib/bitauth-node.js',
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

  if (
    moduleName === '@silencelaboratories/dkls-wasm-ll-web' ||
    moduleName.startsWith('@silencelaboratories/dkls-wasm-ll-web/')
  ) {
    moduleName = SHIM_PATH;
  }

  if (moduleName === '@@silence-original') moduleName = REAL_SILENCE_PATH;
  if (moduleName === '@@silence-wasm')     moduleName = SILENCE_WASM_PATH;

  return context.resolveRequest(
    context,
    ALIASES[moduleName] ?? moduleName,
    platform,
  );
};

// Perf builds (scripts/android-perf.sh) add a module-initialisation timer and
// record the module id -> path map so the harness can name what loaded. The
// script writes IS_PERF=true into the env files for the duration of the build;
// every other build gets exactly the config above.
const isPerfBuild = (() => {
  if (process.env.BP_PERF_BUILD === '1') {
    return true;
  }
  try {
    const envFile =
      process.env.NODE_ENV === 'production'
        ? '.env.production'
        : '.env.development';
    return /^IS_PERF=true$/m.test(
      require('fs').readFileSync(path.join(__dirname, envFile), 'utf8'),
    );
  } catch {
    return false;
  }
})();

if (isPerfBuild) {
  const fs = require('fs');
  const defaults = getDefaultConfig(__dirname);
  const MODULE_MAP_PATH = path.join(__dirname, 'perf/build/module-map.json');

  config.serializer = {
    getPolyfills: options => [
      ...defaults.serializer.getPolyfills(options),
      path.join(__dirname, 'perf/runtime/module-timer.js'),
    ],
    // Same sequential ids as Metro's default factory, but remembered so the
    // map can be written when bundling finishes.
    createModuleIdFactory: () => {
      const ids = new Map();
      process.once('exit', () => {
        const byId = {};
        ids.forEach((id, file) => {
          byId[id] = path.relative(__dirname, file);
        });
        fs.mkdirSync(path.dirname(MODULE_MAP_PATH), {recursive: true});
        fs.writeFileSync(MODULE_MAP_PATH, JSON.stringify(byId));
      });
      return file => {
        if (!ids.has(file)) {
          ids.set(file, ids.size);
        }
        return ids.get(file);
      };
    },
  };
}

module.exports = withSentryConfig(
  mergeConfig(getDefaultConfig(__dirname), config),
);
