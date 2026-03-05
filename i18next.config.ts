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
    ignore: [
      '**/*.spec.tsx',
      'node_modules/**',
      'src/components/modal/import-ledger-wallet/**',
      'src/components/modal/confirm-hardware-wallet/**',
    ],
  },
  types: {
    input: ['locales/{{language}}/{{namespace}}.json'],
    output: 'src/types/i18next.d.ts',
  },
});
