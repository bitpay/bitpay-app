const fs = require('fs');

const codeToObscure = /console.warn\(\s*(?=["`]Require cycle:)/;
const obscuredCode = /\(\(\) => \{\}\)\(\s*(?=["`]Require cycle:)/;
const problemFilePath = './node_modules/metro-runtime/src/polyfills/require.js';
const problemFileContent = fs.readFileSync(problemFilePath, 'utf8');

if (codeToObscure.test(problemFileContent)) {
  fs.writeFileSync(
    problemFilePath,
    problemFileContent.replace(codeToObscure, '(() => {})('),
    'utf8',
  );
} else if (!obscuredCode.test(problemFileContent)) {
  throw new Error(`Unable to locate Metro require-cycle warning in ${problemFilePath}`);
}
