module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    'react-native/no-inline-styles': 0,
  },
  env: {
    jest: true,
  },
  ignorePatterns: ['android/*', 'ios/*'],
};
