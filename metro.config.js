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
  return context.resolveRequest(
    context,
    ALIASES[moduleName] ?? moduleName,
    platform,
  );
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
