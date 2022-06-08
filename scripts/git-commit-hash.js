const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');

function writeToEnv(key, value, path) {
  try {
    // read file
    const text = fs.readFileSync(path, 'utf8');

    // If text available then split from a linebreak to an array
    const ENV_VARS =
      text.length > 0 ? fs.readFileSync(path, 'utf8').split(os.EOL) : [];

    // Get the key index
    const target = ENV_VARS.indexOf(
      ENV_VARS.find(line => {
        return line.match(new RegExp(key));
      }),
    );

    if (target >= 0) {
      // Replace the key value with the new value
      ENV_VARS.splice(target, 1, `${key}='${value.trim()}'`);
    } else {
      // Append key=value
      ENV_VARS.push(`${key}='${value.trim()}'`);
    }

    // Write everything back to the file
    fs.writeFileSync(path, ENV_VARS.join(os.EOL));
  } catch (e) {
    if (e.code === 'ENOENT') {
      // Create file if it doesn't exist
      fs.writeFile(e.path, '', () => {});
      main();
    } else {
      console.log(e);
    }
  }
}

function main() {
  childProcess.exec('git rev-parse --short=7 HEAD', (err, stdout) => {
    writeToEnv('GIT_COMMIT_HASH', stdout, '.env.development');
    writeToEnv('GIT_COMMIT_HASH', stdout, '.env.production');
  });
}

main();
