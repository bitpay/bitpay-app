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
| 8 | Network | BWS request signing reuses the parsed request key (3 EC multiplications → 1); signatures byte-identical | 2.32 → 0.66 ms/signature (V8); JS profile: signing 212 → 84 ms in Home commit → splash | `da4b8b6a0` |
| 9 | Network | External-services/swap-currency prefetch (~0.5 MB) waits until startup settles | requests before first draw 4 → 2 (p<.001) | `1f893f9d0` |
| 10 | Memory | Shop's remote images decode at display size on Android (`resizeMethod="resize"`) | Shop tab native 336 → 202 MB, graphics 180 → 57 MB (−257 MB; memtabs, 3× each) | `e0b8abccb` |
| 11 | Launch | VisionCamera's native modules are created on first use (Scan), not while the React host starts | camera init gone from launch; RN start → JS entry 683 → 661 ms (p=.005); first Scan open unchanged (~0.8 s) | `791ec15b3` |
| 12 | Launch | Cached token lists apply in ~8 ms slices that yield, so app init and routing no longer wait behind 21k tokens | TTFD 2945 → 2474 ms (−471, −16%, p<.001); app-init sync 308 → 1.4 ms; heap at first draw 44 → 32 MB | `d085a7d08` |
| 13 | Frames | Shop mounts gift-card rows as the user scrolls (was: every card at once) | tab switching: worst frame 625 → 186 ms, UI time over budget 1.7 s → 0.78 s (−52%); idle-batch variant rejected (same total work) | `012f5bfa6` |
| 14 | Launch | Native component view configs computed on first use: app wraps 57 eager packages as on-demand + RN `UIManager.js` stops spreading (which invoked every lazy getter) | bundle exec 595 → 405 ms (−32%); RN start → JS entry −188 ms; ~150 ms reappears when Home first renders its components; TTFD −55 ms (n.s.) | `5743a6869` |
| 5 | Frames | …and then a further 5 quiet seconds, so its WebView (Chromium init on the UI thread) no longer lands on the first look at Home | first 8 s: frame time over budget 1438 → 873 ms, long frames 12 → 9 (Perfetto); requests before first draw 5 → 4 | `918236421` |
| 15 | Launch | A balance mismatch that survived a completed populate is stamped (time + snapshot checkpoint); drift-only changes to it are skipped for 6 h, history changes still repopulate | launches > 10.5 s JS CPU 5/40 → 0/20; populates 2/10 → 0/26 launches; worst JS CPU 13.0 → 9.3 s; medians unchanged (tail fix) | `8302b95d7` |
| 16 | Correctness | Live token price replaced by BWS's when > 20% away from a ≤ 30 min old BWS price (aUSDC: Moralis $0.6165 vs BWS $0.9999) | header $262.60 → $268.77; Last Day −4.26% → −0.14%; chart cliff gone; TTFD n.s. | `e710aaacb` |
| 17 | UI | "Some assets not charted" note + sheet listing them; key-row % on the chart's wallet set | sheet's six assets ($135.55) + chart ($133.00) = header ($268.54); key row = chart = −0.22%; TTFD n.s. | see git log |
| 18 | Render | Rate-request sort builds each key once (was: two key builds + ICU localeCompare per comparison) | JS profile: 39 ms → absent in Home commit → splash; V8 bench 1.01 → 0.07 ms; wall-clock NEUTRAL (−40 ms, p=.27) — kept per the profiler-attributed rule | see git log |
| 19 | Launch | **Baseline profile** for startup + main tabs (21,786 methods / 6,072 classes from ART's runtime profile on the test device; `perf/loop/baseline-profile.sh`). simpleperf showed the UI thread mostly in ART's interpreter: the APK shipped only AndroidX's 3.9 KB profile | plain install vs profile applied (as Play does), same APK, 10 runs each: **TTFD 2370 → 1891 ms (−20%)**, JIT CPU 2135 → 90 ms, process CPU 20.9 → 16.2 s, UI CPU −635 ms (all p<.001). Full runtime-profile compile: 2643 → 1832 ms; full AOT 1964 ms | `d41c4754c` |
| 20 | Render | In-memory identifier signatures sorted by code unit (`compareCodeUnits`) instead of ICU `localeCompare` | JS profile: PortfolioBalance:408 28 ms + balanceChartData:213 21 ms → absent; Home render→commit JS 70 → 52 ms; wall-clock NEUTRAL (TTFD −30 ms, p=.09) — kept per the profiler-attributed rule | see git log |

## Candidates (ranked by expected win × confidence)

| ID | Where | Evidence | Status |
|---|---|---|---|
| C1 | Home commit → splash hidden, 613 ms | profile: ~420 ms synchronous React re-renders triggered from mount effects, `bn.js` multiplication | open |
| C2 | `GetPrecision` / `GetName` token-table copies | | **fixed (#3)** |
| C3 | Home first render, 294 ms | profile: render work, 39 ms of it module init (Skia 20 ms) | open |
| C4 | fixed (#12) — Remaining app-init sync work, 303 ms | 4.7 MB token-list JSON parse + loop, still ahead of SUCCESS_APP_INIT | open |
| C5 | RN start → JS entry, 821 ms | 2,716 modules evaluate before index.js runs; `shim.js` → react-native-webassembly pulls in `Image` → UIManager constants (~300 ms, RN core) | research |
| C6 | process start → first ContentProvider, 657 ms | Perfetto: `OpenDexFilesFromOat` 630 ms. ART rejects the app's compiled code on Motorola firmware: the OS adds `com.motorola.androidx.camera.extensions.jar` to every app's class-loader context at a path that differs from dexopt's (`/system/system_ext` vs `/system_ext`). Not fixable from the manifest (tried; the OS adds it implicitly). Runs from 38 MB of raw dex every launch | see C16 |
| C16 | **R8 shrinking** (never enabled before) — now **works** with keep rules for Glide modules and Firebase/ML Kit registrars; smoke flow passes. 20 runs: TTFD 2399 → 2274 ms (−125, p=.006), TTID −22 ms (p=.007); dex 38 → 15 MB, APK 150.7 → 122.4 MB. JIT CPU +300 ms (baseline-profile match, follow-up). Still **opt-in** (`-PenableR8=true`) | **needs QA before default-on**: signing/broadcast, push, Braze, AppsFlyer, WalletConnect, Sumsub, import/backup; Sentry mapping upload |
| C17 | fixed (#11) — Vision Camera initialises `ProcessCameraProvider` + `ExtensionsManager` at launch (its module's init, "as early as possible"); camera thread + `CameraValidator` in the startup trace | only the Scan screen uses the camera | open |
| C18 | Three worklet runtimes (portfolio, rates, analysis) created synchronously during Home's first render | 36–57 ms JS each + a Hermes runtime's memory each | open (architectural) |
| C20 | BWS request signing | fixed (#8) | done |
| C22 | JS CPU per cold start is bimodal: ~6–9 s most runs, ~12 s in 2–3 of 10 | **explained → C24** | done |
| C24 | fixed (#15) — rebasing tokens (Aave aTokens) made launch repopulate over and over: interest moves the live balance, a repopulate cannot reproduce it | `portfolioStaleness.ts` repopulated whenever `deltaAtomic` changed | **fixed (#15)** — design reviewed with Fable (key on the checkpoint, not a boolean). Follow-ups: quarantine retry back-off; scoped-staleness screens use the same decision |
| C23 | Persisted rates are 2.11 MB on the funded wallet (Storage Usage) | read/parse cost each launch | open |
| C25 | (Shop part fixed by #13) Tab switching (nav-tabs, funded wallet): **37% janky frames, p95 150 ms, peak PSS 1.24 GB**; Gift Cards 362 ms, Bills 338 ms, Home 221 ms transitions. Scrolling Home by contrast: 5% janky, p99 24 ms, peak 557 MB | `interaction-baseline.json` | open — next |
| C26 | "Unknown" (anonymous) memory 175–416 MB and session-dependent — largest unexplained PSS category; likely Hermes heaps of the main runtime + three worklet runtimes | memtabs.sh | open |
| C28 | 38 third-party packages still use the legacy eager `ReactPackage` (all modules built at host start) | bounded: RN start → JS entry is 661 ms of which ~615 is bundle exec, so ≲40 ms total; only the camera was heavy (#11) | low |
| C30 | Home commit → splash grew ~150 ms with #14 (prop-setter reflection now runs at first mount on the UI thread). Tried: warm prop setters on main-thread idle — 20 runs: −52 ms, p=.12 → **NEUTRAL, reverted** | | parked |
| C31 | Remaining startup UI-thread jank. Perfetto (3 cold starts each, time over frame budget in the first 6 s): baseline **820 ms**; the long frames around the splash are almost all `Record View#draw()` (225–358 ms), not mounting | **ablations (diagnostic builds, reverted):** skeletons without MaskedView/gradient → 694 ms (draw 198–237); **every `<Svg>` replaced by an empty View → 563 ms (−31%; draw 82–111, −60%)**. Home renders 281 `<Svg>` roots of 37 kinds (counted in a diagnostic build). **Tried:** RNSVG drawing straight onto the hardware canvas instead of its software bitmap → 811 ms, draw unchanged, RenderThread +70–210 ms → reverted: the cost is RNSVG's Java work while drawing, not rasterisation (hit-test regions are lazy, not it) | **halved by #19**: with the baseline profile applied, 820 → **420 ms** over budget, frames > 32 ms 12 → 7, worst frame ~180 → ~115 ms, draw in long frames 87–153 ms. simpleperf (now possible) showed the UI thread had been mostly interpreted. Remaining: re-bisect on compiled code |
| C27 | `SHOP_CATALOG` (gift-card catalog, ~1.1 MB) is persisted in redux-persist and rehydrated on every launch once the user has opened Shop — +51 ms store creation and +4 MB heap at first draw on the test phone, for data only Shop needs | store_kb by slice: 0 → 1107 KB after one Shop visit | **parked — owner decision**: `supportedCardMap` accumulates card configs (likely needed for purchased cards of discontinued brands), so it can't simply stop persisting; dropping the rest makes Shop open on a loader instead of instantly. Gain ≤ 51 ms (~2.7% TTFD). Options: a separate store hydrated after startup settles (needs a migration) |
| C21 | `changelly/getCurrencies` 474 KB at startup | fixed (#9); still re-downloaded once per launch (memory-only cache) — persisting with the 4 h TTL would save the bandwidth | partly done |
| C19 | Big UI-thread frames around the splash: three of 110–270 ms at ~2.0–2.5 s; inside them `Record View#draw()` ≈255 ms over 4 frames and Fabric mount (`animation`) ≈350 ms | Perfetto, current build. **Ablation** (Home chart removed, diagnostic build only): time over frame budget 718–849 → 598–625 ms, so the Skia balance chart costs ~120–150 ms of first-frame jank; the largest frames remain, i.e. Home's own mount | open — chart first-draw is the attributable part |
| C29 | Chromium loads at ~1.5 s on an OkHttp thread: RN's cookie jar initialises WebView `CookieManager` on the first request | by design (Cloudflare challenge shares cookies between WebView and native requests) | won't fix |
| C7 | wallet secrets migration, 184 ms every launch | name suggests a one-time migration | open |
| C8 | SUCCESS_APP_INIT → route, 176 ms | | open |
| C9 | `changelly/getCurrencies` 475 KB POST every launch | `prefetchExternalServicesData` after init | open |
| C10 | LaunchActivity trampoline, 84 ms | also an Android Vitals anti-pattern | open |
| C5b | (fixed #14) UIManager view-config construction at bundle start | | done |
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

## Base change: PR #2461 added

The base originally stacked #2449–#2458 only, so Home still showed the old
Skia spinner (`LoaderSvg.tsx`) instead of the ghost-line loader. #2461 is now
merged into `perf/self-healing-base` (React Compiler conflict resolved in
`.get()/.set()` style; chart tests pass) and the branch rebased onto it.
Baselines from here on include it.

## Bugs found along the way

| ID | What | Evidence | Status |
|---|---|---|---|
| B1 | Home chart range (later run: key row $261.64 while the chart ends in a cliff down to $127 — the excluded wallets read as a crash) $131–133 under a $179 balance; "Last Day +$0.36 (+0.28%)" is computed on the chart's ~$131 base | Headline = all visible wallets (`PortfolioBalance.tsx:308-315`); chart + change = `usePortfolioChartableWallets` subset (`:322-353`, `:611-614`); key-row % = a third set that keeps quarantined wallets (`usePortfolioKeyPercentages.ts:59-80`). Nothing in the UI says wallets were left out. PortfolioDebug on the funded wallet: 28/30 with runtime data, 5 quarantined, 2 invalid history | **fixed (#17)** — labelled as partial; key-row % uses the chart's wallets |
| B2 | Portfolio "Last Day" +0.28% while its only key row shows −0.19% | same cause: the key row counts quarantined wallets the chart drops | **fixed (#17)** — labelled as partial; key-row % uses the chart's wallets |
| B3 | Solana wallet (0.564 SOL) quarantined: reconstructed snapshot differs from live balance by 0.876× | PortfolioDebug | open — history engine |
| B4 | Aave v3 aTokens quarantined: rebasing balances (interest without transfers) can never match a transfer-replay history | PortfolioDebug: aLINK rows 0, "differs by 1x" | open — needs rebasing-token handling |
| B5 | Chainlink (2.90 LINK) and USDC (2.32) on ETH: "invalid history: negative balance after tx …" | PortfolioDebug — tx history is missing inbound transfers | open — BWS history / replay |
| B6 | **The chart's end-of-line cliff is a wrong live price, not excluded wallets.** Arbitrum Aave v3 aUSDC (`0x724dc807…`): Moralis live price **$0.6165**, BWS `v4/fiatrates` **$0.9999** for the same token at the same time. History uses BWS, the live terminal point / header / asset row use Moralis, so the last chart point fell $14.00 → $9.08 and "Last Day" read −4.26% (the whole −$5.65) | temporary diagnostic in a perf build: per-wallet last-step fiat delta (only this wallet moved > $0.03); `buildCurrentRatesByAssetId` → `currentRate 0.616498`; `curl` of both services | **user chose: guard live token prices** — use BWS when Moralis is > 20% off a ≤ 30 min old BWS price — **fixed (#16)** |

## Measurement change (after #19)

From `d41c4754c` the driver applies the shipped baseline profile after
installing (INSTALL_PROFILE broadcast + `compile -m speed-profile`), as Play
does at install. Before that every run measured interpreted code + JIT, so
baselines from before and after are not comparable; the accepted run was
re-taken: **TTFD 2,312 → 1,857 ms** (−20%, p<.001; 20 runs, `ceba3d074`), TTID 422 → 353 ms, JIT CPU 2,030 → 90 ms. `BP_PERF_COMPILE=none` reproduces the old state.

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
