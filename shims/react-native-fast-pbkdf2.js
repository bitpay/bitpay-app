// Gradle-free adapter for @ton/crypto-primitives' React Native entry.
const {pbkdf2: pbkdf2Cb} = require('react-native-quick-crypto');

function derive(passwordB64, saltB64, iterations, keyLen, digest) {
  const password = Buffer.from(passwordB64, 'base64');
  const salt = Buffer.from(saltB64, 'base64');
  const algorithm = String(digest || 'sha-512')
    .replace('-', '')
    .toLowerCase();
  return new Promise((resolve, reject) => {
    pbkdf2Cb(password, salt, iterations, keyLen, algorithm, (err, derived) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(Buffer.from(derived).toString('base64'));
    });
  });
}

Object.defineProperty(module.exports, '__esModule', {value: true});
module.exports.default = {derive};
