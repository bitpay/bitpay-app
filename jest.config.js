module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: [
    '<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js',
    '<rootDir>/test/setup.js',
  ],
  transformIgnorePatterns: [
    '\\.snap$',
    'node_modules/(?!(@freakycoder|@react-native|react-native|(react-native(-.*))|@react-navigation|(react-navigation(-.*))|victory|(victory(-.*))))',
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.spec.json',
    },
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
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
  },
  roots: ['<rootDir>/src/'],
};
