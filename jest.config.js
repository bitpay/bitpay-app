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
    '\\.snap$',
    'node_modules/(?!(@freakycoder|@react-native|react-native|rn-fetch|redux-persist-filesystem|@react-navigation' +
    '|@react-native-community|react-navigation|react-navigation-redux-helpers|@sentry))'
  ],
  'globals': {
    'ts-jest': {
      'tsconfig': 'tsconfig.spec.json',
    },
  },
  'transform': {
    '^.+\\.svg$': 'jest-svg-transformer',
    '^.+\\.jsx$': 'babel-jest',
    '^.+\\.tsx?$': 'ts-jest'
  },
  'testRegex': '(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$',
  'cacheDirectory': '.jest/cache',
};