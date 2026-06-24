module.exports = {
  preset: 'react-native',
  resolver: 'react-native-worklets/jest/resolver',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: [
    '<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js',
    '<rootDir>/test/setup.js',
  ],
  transformIgnorePatterns: [
    '\\.snap$',
    'node_modules/(?!(@walletconnect/react-native-compat|@freakycoder|@react-native|react-native|(react-native(-.*))|\@react-navigation|(react-navigation(-.*))|\@sentry|uuid|victory|(victory(-.*))|lodash-es))',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'ts-jest',
    '^.+\\.svg$': 'jest-transform-stub',
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  cacheDirectory: '.jest/cache',
  setupFilesAfterEnv: ['<rootDir>/test/afterEnv.ts'],
  moduleNameMapper: {
    '\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/test/mock.js',
    '\\.(css|less)$': '<rootDir>/test/mock.js',
    '@/(.*)': '<rootDir>/src/$1',
    '@test/(.*)': '<rootDir>/test/$1',
    // Redirect bare styled-components to the native version (some files import
    // 'styled-components' instead of 'styled-components/native', which breaks in tests)
    '^styled-components$': '<rootDir>/node_modules/styled-components/native/dist/styled-components.native.cjs.js',
    // Force ESM-only crypto packages to CJS builds
    '^uuid$': require.resolve('uuid'),
    '^paillier-bigint$': '<rootDir>/node_modules/paillier-bigint/dist/cjs/index.node.cjs',
    '^bigint-crypto-utils$': '<rootDir>/node_modules/bigint-crypto-utils/dist/cjs/index.node.cjs',
    '^@env$': '<rootDir>/test/mock.js',
  },
  roots: ['<rootDir>/src/'],
  collectCoverageFrom: [
    'src/utils/**/*.{ts,tsx}',
    'src/store/**/*.{ts,tsx}',
    'src/components/**/*.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx,js}',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
  ],
  coverageReporters: ['text-summary', 'lcov', 'json-summary'],
};
