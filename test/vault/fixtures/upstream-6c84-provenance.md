# Synthetic upstream secrets snapshots

Source: `bitpay/bitpay-app` at exactly `6c84ecc4c0bee99d599449a29f2c6447f451478a`.
The first and second `flushPersistor()` outputs were captured from its real
`getStore()`, Redux Persist transforms, wallet reducers and
`migrateWalletSecrets()` effect. `intermediate` is the first flush, before
backup removal/flagging; `completed` is the second flush, after the flag.
The original 14.32 fixture files are unchanged.

All credentials and session data are synthetic. MMKV (by instance id), RNFS,
Keychain and unrelated services were mocked. Wallet-client/key constructors are
boundary doubles; the persistence transforms and secrets lifecycle are real.
These fixtures do not establish native or physical-device behavior.

To recapture, create a clean worktree at the exact source commit, install its
committed dependencies with `yarn install --frozen-lockfile`, and copy the
adjacent `capture-upstream.spec.ts.txt` to `src/store/capture-upstream.spec.ts`
in that worktree. Run:

```sh
BIP02_CAPTURE_PATH=/tmp/upstream-secrets.json yarn test:ci --runInBand --runTestsByPath src/store/capture-upstream.spec.ts
```

Remove only that temporary test afterwards. Do not run this generator against
the integrated writer: it intentionally captures the original CBC writer.
The output varies with encryption randomness and initial reducer timestamps;
its decoded secret categories and first/second-flush roles are deterministic.

Captured file SHA-256: `05e448210f820df2ec471f8be19cb2f07d212a75fbbb732254527e9c63968711`.
