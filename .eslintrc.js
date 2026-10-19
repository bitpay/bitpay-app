// React Compiler lint rules shipped by eslint-plugin-react-hooks v7 (pulled
// in by @react-native/eslint-config). `rules-of-hooks` and `exhaustive-deps`
// are configured by @react-native/eslint-config and are left untouched.
const REACT_COMPILER_RULES = [
  'react-hooks/config',
  'react-hooks/error-boundaries',
  'react-hooks/gating',
  'react-hooks/globals',
  'react-hooks/immutability',
  'react-hooks/incompatible-library',
  'react-hooks/preserve-manual-memoization',
  'react-hooks/purity',
  'react-hooks/refs',
  'react-hooks/set-state-in-effect',
  'react-hooks/set-state-in-render',
  'react-hooks/static-components',
  'react-hooks/unsupported-syntax',
  'react-hooks/use-memo',
  'react-hooks/void-use-memo',
];

const compilerRules = level =>
  Object.fromEntries(REACT_COMPILER_RULES.map(rule => [rule, level]));

// Directories compiled by babel-plugin-react-compiler. Keep in sync with
// REACT_COMPILER_DIRS in babel.config.js; compiler rules are errors here so
// compiled code cannot regress, and warnings everywhere else.
const REACT_COMPILER_DIRS = ['src/components/list/', 'src/navigation/wallet/'];

module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    'react-native/no-inline-styles': 0,
    ...compilerRules('warn'),
  },
  overrides: [
    {
      files: REACT_COMPILER_DIRS.map(dir => `${dir}**/*.{js,jsx,ts,tsx}`),
      rules: compilerRules('error'),
    },
  ],
  env: {
    jest: true,
  },
  ignorePatterns: ['android/*', 'ios/*'],
};
