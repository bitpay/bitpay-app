module.exports = {
  'preset': 'react-native',
  'moduleFileExtensions': [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],
  'transformIgnorePatterns': [
    'node_modules/(?!(@freakycoder|@react-native|react-native|rn-fetch|redux-persist-filesystem|@react-navigation' +
    '|@react-native-community|react-navigation|react-navigation-redux-helpers|@sentry))'
  ],
  'transform': {
    '^.+\\.svg$': 'jest-svg-transformer'
  }
};