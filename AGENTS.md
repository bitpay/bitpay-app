# Repository Working Notes

## Android development setup

- Run `yarn set:dev` before building or launching the Android development app. It applies the repository's development URL allowlist and loopback networking overrides.
- Do not run `yarn reset:dev` during an active development or device-verification session. Reset only when preparing a production-style tree, and never use it to discard unrelated user changes.
- Keep Metro, Sepolia RPC proxies, and emulator/device forwarding bound to loopback. Do not expose development services to the LAN.

## Build output

- Redirect long compilation output to a temporary log file.
- On success, report only the command result and relevant artifact path; do not read or paste the full log.
- On failure, inspect only the smallest useful tail or search for the actual error, expanding the inspected range only when needed.

## Screenshot verification

- Android debug builds must allow screenshots so UI changes can be verified. The debug activity explicitly clears `FLAG_SECURE`; do not remove that debug-only exception while visual verification is required.
- Keep production screenshot protection unchanged. Never weaken the production build merely to make development screenshots work.

## Vultisig verification

- Use the unmodified `main` branch of `vultisig-sdk` when the task calls for SDK behavior. Record the exact SDK commit used.
- This Secure Vault implementation was verified against the clean SDK `main`
  commit `ec6c810e81798b8dab7d004c931f2ecc1b859bd2` from the sibling
  `../vultisig-sdk` checkout. Build and pack `@vultisig/sdk` there, redirecting
  build output to a temporary log, then install that packed artifact locally;
  do not patch generated SDK files in this app.
- A three-device Secure Vault proof requires three isolated app/device stores, matching vault IDs, distinct local party IDs, and on-chain Sepolia evidence for the signed transaction.
- Clearly distinguish physical phones from emulator instances in the handoff.
