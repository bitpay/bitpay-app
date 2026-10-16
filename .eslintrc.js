module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    'react-native/no-inline-styles': 0,
    // `void promise;` marks a deliberately unawaited promise.
    'no-void': ['warn', {allowAsStatement: true}],
  },
  env: {
    jest: true,
  },
  ignorePatterns: ['android/*', 'ios/*'],
};
