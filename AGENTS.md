# Repository Working Notes

## Android development setup

- Run `yarn set:dev` before building or launching the Android development app. It applies the repository's development URL allowlist and loopback networking overrides.
- Do not run `yarn reset:dev` during an active development or device-verification session. Reset only when preparing a production-style tree, and never use it to discard unrelated user changes.
- Keep Metro, local Vultisig services, RPC proxies, and emulator/device forwarding bound to loopback. Do not expose development services to the LAN.

## Disposable development environment

- This repository, its emulator app data, and its local Docker services are exclusively for development and testing. Wallets, keys, passwords, verification codes, test accounts, local service data, and all funds used here are disposable and have no monetary value.
- Do not introduce, request, or use mainnet funds or other valuable credentials in this environment. Never extend the disposable-data assumption to live/mainnet systems, unrelated host data, source history, branches, or remotes.
- It is acceptable to clear the BitPay development app's data and remove the local Vultisig Docker volumes when a clean reproducible test requires it. State what will be reset, scope the deletion to this app/stack, and leave source code and Git history intact.
- When the user wants to perform wallet creation themselves, hand over a clean first-run app and empty local Vultisig state. Do not leave a wallet created by an earlier automated verification run.

## Build output

- Redirect long compilation output to a temporary log file.
- On success, report only the command result and relevant artifact path; do not read or paste the full log.
- On failure, inspect only the smallest useful tail or search for the actual error, expanding the inspected range only when needed.

## Screenshot verification

- Screenshots and screen capture must remain allowed in every build configuration so the app can be visually verified.
- Do not add `FLAG_SECURE` or any other screenshot-blocking policy to the Android app.

## Vultisig verification

- The Fast Vault integration must use Vultisig only for MPC key generation and signing. BitPay remains responsible for wallet metadata, address management, UTXO selection, fee estimation, transaction proposal construction, sighash calculation, and broadcasting. Vultisig receives BitPay's digest and existing derivation path and returns a signature.
- Build the local VultiServer and relay through `yarn vultisig:local:build`. The build script must verify clean, unmodified official `upstream/main` sources from the sibling `vultiserver-main` and `vultisig-relay-main` worktrees. Record the exact commits used.
- The local stack must not send email. Use the reserved non-deliverable address expected by the upstream API and obtain verification codes only from the `verification-code-logger` Docker service.
- Cold Android debug/WASM keygen can exceed VultiServer's upstream one-minute relay-completion wait. The local worker build adapter extends only that wait to three minutes while leaving the official checkout clean; its source-shape guard must keep passing.
- The app must wait for server-side keygen completion before showing verification. Never provide or accept a code unless the logger or matching Redis verification record exists.
- When testing an SDK change, verify the exact `@vultisig/sdk` source resolved by this app. A sibling checkout does not affect Metro automatically; use the package reference pinned in `package.json` and record its commit.
- Before a user-led Android test, apply `yarn set:dev`, ensure Metro and the local stack are healthy, and configure `adb reverse` for ports `8081`, `8670`, and `8671`.
- Service health checks alone are not an end-to-end receipt. Confirm that the app starts in the intended clean state, existing BitPay screens still render, no stale Vultisig wallet remains, and the Assets section is not stuck on loading placeholders.
- Testnet-only balances may have a nonzero coin balance without a fiat allocation key. They must not leave the existing Assets section in an endless activation skeleton; keep the focused `assetRowLoading` regression test passing.
- Completion for the Fast Vault flow requires a real Bitcoin Testnet4 transaction signed through Vultisig and broadcast through BitPay, with the transaction ID recorded. A build, a created vault, or healthy endpoints alone are insufficient.
