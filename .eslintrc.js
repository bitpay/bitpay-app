module.exports = {
  root: true,
  extends: '@react-native-community',
  rules: {
    'react-native/no-inline-styles': 0,
  },
  env: {
    jest: true,
  },
  ignorePatterns: ['android/*', 'ios/*'],
};
