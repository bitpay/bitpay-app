module.exports = {
  project: {
    ios: {},
    android: {}, // grouped into "project"
  },
  assets: ['./assets/fonts/'], // stays the same
  dependencies: {
    // Metro routes this package to the quick-crypto shim; its native package
    // still depends on jcenter and must not be autolinked by Gradle 9.
    'react-native-fast-pbkdf2': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
