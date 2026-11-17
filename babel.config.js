const path = require('path');

const {NODE_ENV} = process.env;

const prod = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

// React Compiler is being rolled out incrementally: only files under these
// directories (relative to the project root, forward slashes, trailing slash)
// are compiled. To widen the rollout, add a directory here AND to
// REACT_COMPILER_DIRS in .eslintrc.js so the compiler lint rules are enforced
// as errors there too.
const REACT_COMPILER_DIRS = ['src/components/list/', 'src/navigation/wallet/'];

const isReactCompilerSource = filename => {
  if (!filename) {
    return false;
  }
  // Babel usually passes an absolute path; normalise to a project-relative,
  // forward-slash path so the prefixes above match on every OS.
  const relative = path
    .relative(__dirname, path.resolve(filename))
    .split(path.sep)
    .join('/');
  if (
    relative.startsWith('../') ||
    path.isAbsolute(relative) ||
    relative.split('/').includes('node_modules')
  ) {
    return false;
  }
  return REACT_COMPILER_DIRS.some(dir => relative.startsWith(dir));
};

const plugins = [
  // Must run first so it sees the original source. Default options target
  // React 19 (imports `react/compiler-runtime`).
  ['babel-plugin-react-compiler', {sources: isReactCompilerSource}],
  'babel-plugin-transform-import-meta',
  '@babel/plugin-proposal-export-namespace-from',
  '@babel/plugin-transform-shorthand-properties',
  '@babel/plugin-proposal-optional-chaining',
  '@babel/plugin-proposal-nullish-coalescing-operator',
  '@babel/plugin-transform-template-literals',
  // In test env, @env is handled by Jest's moduleNameMapper so the dotenv
  // babel plugin is skipped (it requires .env files that are gitignored).
  ...(!isTest
    ? [
        [
          'module:react-native-dotenv',
          {
            moduleName: '@env',
            path: prod ? '.env.production' : '.env.development',
            safe: true,
            allowUndefined: true,
          },
        ],
      ]
    : []),
  [
    'module-resolver',
    {
      root: ['./src'],
      extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
      alias: {
        '@components': './src/components',
      },
    },
  ],
];

if (prod) {
  plugins.push('transform-remove-console');
}

plugins.push('react-native-worklets/plugin');

module.exports = {
  presets: [
    'module:@react-native/babel-preset',
    'module:@babel/preset-typescript',
  ],
  plugins,
};
