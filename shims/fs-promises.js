// Metro-only guard for a Node storage adapter that is unreachable in the
// Vultisig React Native path, which uses native WalletCore storage.
const unsupported = method => () =>
  Promise.reject(
    new Error(
      `fs/promises.${method} is unavailable in React Native; use native storage.`,
    ),
  );

module.exports = {
  readFile: unsupported('readFile'),
  writeFile: unsupported('writeFile'),
  readdir: unsupported('readdir'),
  unlink: unsupported('unlink'),
  mkdir: unsupported('mkdir'),
  access: unsupported('access'),
  stat: unsupported('stat'),
};
