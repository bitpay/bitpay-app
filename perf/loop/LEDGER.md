# Self-healing loop — ledger

Device: **Motorola one 5G ace** (Android 11, arm64, 5.5 GB), onboarded test
wallet. Every number is a median of 10 cold starts of `startup-load`; a change
counts only beyond 2× the larger stddev. Base: `upstream/develop` + open perf
PRs #2449–#2458 (see LOOP.md).

## Starting point (accepted run `176b156e8`)

TTFD (splash hidden) **3,852 ms** · TTID 1,262 ms · 3,844 modules / 760 ms of
module init before first draw · JS heap 44 → 52 MB · 5 requests, 512 KB.

| Phase | ms |
|---|---:|
| process start → first ContentProvider | 657 |
| Application.onCreate | 150 |
| LaunchActivity trampoline | 84 |
| MainActivity.onCreate (bundle hash 40) | 132 |
| RN start → JS entry (Hermes bundle exec 663) | 821 |
| store create + rehydrate | 165 |
| wallet secrets migration | 184 |
| wallet secrets → app init success | 354 |
| app init success → StartupGate routes | 176 |
| Home first render → commit | 294 |
| Home commit → splash hidden | 613 |

## Fixes

| # | Area | Change | Measured | Commit |
|---|---|---|---|---|
| 1 | UI | Bottom-notification actions back to bottom-left / bottom-right (a wrapping row, not a column) | layout — both platforms | `d2c871925` |
| 2 | Launch | Token-list entries share per-chain config instead of rebuilding it for each of ~21k tokens | app-init phase 354 → 303 ms (−51); JS heap −6 MB | `61aece25c` |
| 3 | Render | `GetPrecision`/`GetName` look tokens up directly instead of copying three token tables (~21k entries) per call | 6.4 ms → 0.00004 ms per call (benchmark); neutral on this wallet, which holds no token wallets | `3632ff4b1` |
| 4 | Launch | MoonPay embedded check (session request, x25519 keys, invisible WebView) waits for startup to settle | route phase 168 → 91 ms (−77, p<.001); TTFD median 3913 → 3697 ms (−217, p=.016) | `e7e0c4735` |
| 6 | Launch | Stop binding the OEM camera-extensions jar: on Motorola, ART rejected the app's compiled code on every launch ("Found duplicate classes, falling back to extracting from APK") | TTFD 3673 → 2521 ms (−1151, −31%); JS entry −944 ms. New installs immediately; existing installs after the next reboot | `778e7b2fe` |
| 7 | Render | Remember sorted wallet-id lists (localeCompare/ICU sort repeated every Home render) | Home first render 397 → 359 ms (−38, p=.003), funded wallet | `1b3ee0bbe` |
| 5 | Frames | …and then a further 5 quiet seconds, so its WebView (Chromium init on the UI thread) no longer lands on the first look at Home | first 8 s: frame time over budget 1438 → 873 ms, long frames 12 → 9 (Perfetto); requests before first draw 5 → 4 | `918236421` |

## Candidates (ranked by expected win × confidence)

| ID | Where | Evidence | Status |
|---|---|---|---|
| C1 | Home commit → splash hidden, 613 ms | profile: ~420 ms synchronous React re-renders triggered from mount effects, `bn.js` multiplication | open |
| C2 | `GetPrecision` / `GetName` token-table copies | | **fixed (#3)** |
| C3 | Home first render, 294 ms | profile: render work, 39 ms of it module init (Skia 20 ms) | open |
| C4 | Remaining app-init sync work, 303 ms | 4.7 MB token-list JSON parse + loop, still ahead of SUCCESS_APP_INIT | open |
| C5 | RN start → JS entry, 821 ms | 2,716 modules evaluate before index.js runs; `shim.js` → react-native-webassembly pulls in `Image` → UIManager constants (~300 ms, RN core) | research |
| C6 | process start → first ContentProvider, 657 ms | Perfetto: `OpenDexFilesFromOat` 630 ms. ART rejects the app's compiled code on Motorola firmware: the OS adds `com.motorola.androidx.camera.extensions.jar` to every app's class-loader context at a path that differs from dexopt's (`/system/system_ext` vs `/system_ext`). Not fixable from the manifest (tried; the OS adds it implicitly). Runs from 38 MB of raw dex every launch | see C16 |
| C16 | **R8 shrinking has never been enabled** (`enableProguardInReleaseBuilds = false` since the initial commit) | dex 38 MB / 15 files → 15 MB / 2 files, APK 150.7 → 128.3 MB. First attempt (`-PenableR8=true`): blank screen, ML Kit registrars stripped. Needs keep rules per SDK and full QA | **needs your call — own PR** |
| C17 | Vision Camera initialises `ProcessCameraProvider` + `ExtensionsManager` at launch (its module's init, "as early as possible"); camera thread + `CameraValidator` in the startup trace | only the Scan screen uses the camera | open |
| C18 | Three worklet runtimes (portfolio, rates, analysis) created synchronously during Home's first render | 36–57 ms JS each + a Hermes runtime's memory each | open (architectural) |
| C20 | BWS request signing re-derives and re-validates the request public key on every request (3 EC multiplications instead of 1) | profile: `signMessage` ~212 ms JS in Home commit → splash; patch makes signatures identical and 3.5× faster | **measuring** |
| C22 | JS CPU per cold start is bimodal: ~6–9 s most runs, ~12 s in 2–3 of 10 | `js_cpu_ms_settled` values | open |
| C23 | Persisted rates are 2.11 MB on the funded wallet (Storage Usage) | read/parse cost each launch | open |
| C21 | `changelly/getCurrencies` 474 KB and `wallets/all` 107 KB at startup on the funded wallet | load profile | open |
| C19 | Big Fabric mount frames around and after the splash (180–350 ms `Choreographer#doFrame/animation`) | Perfetto; RN release builds emit no sections, so needs RN systrace markers to attribute | open |
| C7 | wallet secrets migration, 184 ms every launch | name suggests a one-time migration | open |
| C8 | SUCCESS_APP_INIT → route, 176 ms | | open |
| C9 | `changelly/getCurrencies` 475 KB POST every launch | `prefetchExternalServicesData` after init | open |
| C10 | LaunchActivity trampoline, 84 ms | also an Android Vitals anti-pattern | open |
| C11 | After first draw: `GlobalSelect` render 105 ms, noble-curves and AES work | post-TTFD jank | open |
| C12 | Bundle integrity check, 40 ms | security control — only a neutral-guarantee change | low |
| C13 | Four confirm screens keep `'use no memo'` whose stated reason (Ledger transport refs) left with #2456 | React Compiler could now compile them | open |

## Test wallet

Until 14:35 every run used the **public onboarding phrase** (an empty wallet):
a Maestro flow-level `env:` default overrode `-e SEED`. Fixes 1–6 were
measured A/B on that wallet, so their deltas stand, but funded paths were not
exercised. Since `cd06f38dc` the flow requires the seed and the device holds
the funded test wallet (**$179, 30 wallets incl. USDC**), and the accepted
baseline was re-taken on it: TTFD **3,350 ms**, TTID 724 ms.

## Bugs found along the way

| ID | What | Evidence | Status |
|---|---|---|---|
| B1 | Home chart range $131–133 under a $179 balance; "Last Day +$0.36 (+0.28%)" is computed on the chart's ~$131 base | Headline = all visible wallets (`PortfolioBalance.tsx:308-315`); chart + change = `usePortfolioChartableWallets` subset (`:322-353`, `:611-614`); key-row % = a third set that keeps quarantined wallets (`usePortfolioKeyPercentages.ts:59-80`). Nothing in the UI says wallets were left out. PortfolioDebug on the funded wallet: 28/30 with runtime data, 5 quarantined, 2 invalid history | **needs product call** (presentation) |
| B2 | Portfolio "Last Day" +0.28% while its only key row shows −0.19% | same cause: the key row counts quarantined wallets the chart drops | **needs product call** |
| B3 | Solana wallet (0.564 SOL) quarantined: reconstructed snapshot differs from live balance by 0.876× | PortfolioDebug | open — history engine |
| B4 | Aave v3 aTokens quarantined: rebasing balances (interest without transfers) can never match a transfer-replay history | PortfolioDebug: aLINK rows 0, "differs by 1x" | open — needs rebasing-token handling |
| B5 | Chainlink (2.90 LINK) and USDC (2.32) on ETH: "invalid history: negative balance after tx …" | PortfolioDebug — tx history is missing inbound transfers | open — BWS history / replay |

## Harness built during the loop

- Perf builds: debug-keystore signed, arm64-only (~2.5 min incremental), no
  Sentry upload, screenshots allowed (`PERF_BUILD` gates FLAG_SECURE).
- Fixed a launch crash in every IS_PERF build: RN 0.87 removed
  `InteractionManager`.
- Load profile: modules initialised (Metro polyfill), requests by endpoint,
  actions by type, Hermes heap, store bytes per slice; module cost bucketed by
  startup phase.
- Native and JS sub-phase marks; phase durations as gated metrics.
- Symbolicated Hermes CPU profiles per startup phase (`jsprofile.sh`).
- `iterate.sh` / `compare.js`: build → measure → KEEP / NEUTRAL / REJECT,
  with MAD-based noise, a Mann–Whitney rank test, and a stricter threshold for
  non-target metrics (identical builds compare NEUTRAL). `merge-runs.js` pools
  runs when 10 cannot decide.
