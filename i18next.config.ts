import {defineConfig} from 'i18next-cli';

export default defineConfig({
  locales: ['en'],
  extract: {
    input: 'src/**/*.{js,jsx,ts,tsx}',
    output: 'locales/{{language}}/{{namespace}}.json',
    defaultNS: 'translation',
    keySeparator: false,
    nsSeparator: false,
    contextSeparator: '_',
    functions: ['t', '*.t'],
    transComponents: ['Trans'],
    removeUnusedKeys: false,
    ignore: ['**/*.spec.tsx', '**/*.spec.ts', 'node_modules/**'],
  },
});
