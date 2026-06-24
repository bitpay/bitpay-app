const {NODE_ENV} = process.env;

const prod = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

const plugins = [
  'babel-plugin-transform-import-meta',
  '@babel/plugin-proposal-export-namespace-from',
  '@babel/plugin-transform-shorthand-properties',
  '@babel/plugin-transform-arrow-functions',
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
