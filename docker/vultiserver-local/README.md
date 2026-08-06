# Local VultiServer for BitPay

This stack runs the official, unmodified `upstream/main` VultiServer and
Vultisig relay sources from the sibling `vultiserver-main` and
`vultisig-relay-main` worktrees. `build.sh` refuses dirty or non-main sources.

The local worker is a build-time replacement for the upstream worker entrypoint.
It registers all MPC handlers but does not register or consume either email
handler or the `vultisigner:email` queue. The Docker network is internal, so the
worker also has no internet egress. The upstream API rejects an empty legacy
email field, so the app supplies `local-verification@vultisig.invalid`, a
reserved non-deliverable placeholder that is never processed by an email
worker.

The build also changes the worker's relay completion wait from one minute to
three minutes without modifying the official checkout. Cold debug/WASM keygen
on Android can exceed the upstream one-minute wait even though both MPC parties
finish successfully. The build verifies the exact upstream source line before
applying this local-only adapter and fails on upstream drift.

Verification codes are printed by the `verification-code-logger` service:

```sh
yarn vultisig:local:logs
```

The app waits for server-side keygen completion before showing the verification
screen. If no code is logged, treat creation as failed rather than inventing or
accepting a code.

The only host ports are loopback-bound:

- VultiServer API: `127.0.0.1:8670`
- Vultisig relay edge: `127.0.0.1:8671`

The relay edge buffers the official relay's small completion response and
closes the HTTP connection. This avoids a React Native Android response-body
stall over `adb reverse`; the worker talks directly to the official relay on
the internal Docker network.

## Run the stack

Check out the official repositories beside this BitPay checkout as
`../vultiserver-main` and `../vultisig-relay-main`, add their official remotes
as `upstream`, and leave both worktrees on a clean `upstream/main` commit. The
build script refuses any other source state.

```sh
yarn vultisig:local:build
yarn vultisig:local:up
yarn vultisig:local:logs
```

For an Android emulator, apply BitPay's development networking overrides and
forward the loopback-only services:

```sh
yarn set:dev
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8670 tcp:8670
adb reverse tcp:8671 tcp:8671
```

Use `yarn vultisig:local:down` to stop the stack. Run `yarn reset:dev` when the
development session is over and the checkout should return to production-style
network settings.

## Verified flow

The Android integration was exercised end to end on Bitcoin Testnet4. BitPay
selected the UTXO, estimated the fee, constructed and published the proposal,
calculated each input sighash, and broadcast the signed transaction. Vultisig
received only the digest and BitPay-provided derivation path for MPC signing.

Testnet4 transaction:
`006e4b89ff75d8f14398aba3e708c9b0392d2e54c82aefe1e3a406f3560629ca`
