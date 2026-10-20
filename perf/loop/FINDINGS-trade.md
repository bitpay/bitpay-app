# Buy / Sell / Swap loop — findings

Second instance of the self-healing loop (`LOOP.md`), on the screens opened
from Home's Buy, Sell and Swap buttons. Branch `perf/buy-sell-swap`, based on
`perf/self-healing` at `54d9d06bb` (R8 on, shipped baseline profile applied
after install). Same device (Motorola one 5G ace, Android 11), same funded
test wallet ($269, 30 wallets), shared through `device-lock.sh`.

Every number is a median of 10 runs of one scenario (first run discarded);
a change counts only beyond 2× the larger noise (see `compare.js`).

## Scenarios (`perf/scenarios/trade_*.yaml`)

| Scenario | Flow | Headline metrics |
|---|---|---|
| `trade-buy` | Home → Buy (opens on the SOL wallet with a preset $200, quotes at once) → wait for the best offer → `$100` pill → wait for the new best offer → back | `BuyCurrencies` span (spinner until the coin list is built), `BuyQuotes` span (quote search → best offer shown) |
| `trade-sell` | Home → Sell → Choose Crypto → Solana Account → SOL → type `.3` (0.3 SOL) → wait for the best offer → back | `SellCurrencies`, `SellQuotes` |
| `trade-swap` | Home → Swap (from SOL) → To: Bitcoin → first BTC wallet → open the amount sheet → back | `SwapCurrencies` (init → supported coins set), `SwapCryptoRoot` transition |

All three also report frames (janky %, p95/p99), JS/UI/render-thread CPU,
PSS, and what the flow loaded (`requests_flow`, `request_kb_flow`,
`actions_flow`, `modules_flow`, `js_heap_mb_peak_flow`, per endpoint).

**Funds safety.** Flows never tap "Continue with …" (provider checkout) or
"Slide to swap". Buy/Sell quotes are read-only (`*GetQuote`,
`*GetSellQuote`). **Swap quotes are not measured**: as soon as Changelly is
the best offer, `SwapCryptoRoot` creates a fixed-rate exchange order at
Changelly (`changellyCreateFixTransaction`, sending the wallet's payout and
refund addresses) — viewing a quote submits data to a provider, so
`trade-swap` stops before an amount is committed.

## Harness added

- `PerfMonitor`: post-settle `activity` snapshots every 2 s (requests,
  actions, modules, heap), diffed per flow by the harness; `spanStart` /
  `spanEnd` for in-screen work, reported as pseudo-screens.
- `flowprofile.sh`: Hermes CPU profile of a Maestro flow (profiling builds
  register a `PERF_JS_PROFILE` broadcast receiver to restart/dump the
  sampler); spans become `jsprofile.js` phases.
- `iterate.sh`: one accepted run per scenario set
  (`state/accepted-<scenarios>.json`); `compare.js` judges per-screen
  transitions and spans (`transition_<screen>_ms`).

## Baselines (`e45bab517`, 10 runs each)

| Scenario | Headline | Frames | Load per flow |
|---|---|---|---|
| trade-buy | BuyCurrencies **3,492 ± 23 ms**; BuyQuotes **6,736 ± 130 ms**; transition 290 ms | janky 2.2%, p95 13, p99 21.5 ms; JS 16.7% | 22 requests, 586 KB (Transak fiat currencies 407 KB ×2, Sardine limits 156 KB ×2) |
| trade-sell | SellCurrencies 460 ms; SellQuotes **5,930 ± 24 ms** | janky 2.6%, p99 23 ms | 5 requests, 269 KB |
| trade-swap | SwapCurrencies **1,305 ± 36 ms** (no network: prefetch cache fresh); transition 455 ms | janky 2.6%, p99 27 ms; JS 10.9% | 2 requests |

## Fixes

| # | Area | Change | Measured | Commit |
|---|---|---|---|---|
| T1 | Swap | Currency logos looked up from a coin+chain index (built once per token map) instead of `Object.values(tokenDataByAddress).find` per currency | SwapCurrencies **1305 → 220 ms (−83%)**, JS thread 10.9 → 8.5% (p<.001) | `15101aac7` |
| T2 | Swap | Supported-token list (~21k symbols) memoised on the token list instead of rebuilt every render | vs a base run in the same process memory mode, 3/3 candidate runs KEEP: SwapCryptoRoot transition **481 → 125 ms (−74%)**, SwapCurrencies 232 → ~115 ms, janky 3.8 → 2.8–3.2%; JS heap growth per Swap visit ~8 → ~2.6 MB | `f3b689630` |
| T3 | Buy, Sell | Best offer picked as soon as the last participating provider finishes (the 3.5 s settle wait stays while any is still quoting, and for re-runs with unchanged flags, e.g. a payment-method change) | **BuyQuotes 6736 → 3230 ms (−52%)**, **SellQuotes 5930 → 2464 ms (−58%)** (p<.001). compare.js REJECT overridden: CPU % rose because the flows got 4–8 s shorter (Buy CPU-seconds fell: process 36.1 → 33.1, JS 8.78 → 8.57); Sell PSS/JS-CPU-s were the high memory mode (unknown 460 vs 196 MB; same mode costs +1.4 JS CPU-s on an unchanged build); Buy request KB was BWS's ramp/assets size | `ea44b8dbf` |
| T4 | Buy, Sell | Buy coin list: the merged token map is built once per init (was: a ~21k-key spread per ERC-20 coin) and both token lookups use the coin+chain index | **BuyCurrencies 3418 → 42 ms (−99%)**, JS heap peak 128 → 92 MB (p<.001); SellCurrencies 484 → 419 ms (p=.005) | `c72a57a89` |

Regression check on the main loop's interaction scenario: `nav-tabs`, base
`54d9d06bb` APK vs HEAD `c72a57a89` APK (all four fixes + the trade
instrumentation, incl. the 2 s post-settle activity snapshots), 10 runs
each: **NEUTRAL** — no metric moved beyond noise.

## Candidates

| ID | Where | Evidence | Status |
|---|---|---|---|
| TC1 | Swap: `tokenOptions` (~21k symbols) rebuilt on every `SwapCryptoRoot` render | flow profile: 895 ms JS per flow in the render body after init (picker, wallet pick, amount sheet) | **fixed (T2)** — first judged REJECT on PSS +100 MB / janky +0.5 / peak CPU; all three were the process memory mode (below) |
| TC2 | Buy/Sell: best offer chosen 3,500 ms after the last provider-state change, even when every provider has answered | `externalServicesOfferSelector` effects; Swap's selector already picks as soon as all exchanges finish | **fixed (T3)** |
| TC3 | Buy/Sell: 2,000 ms debounce before quoting, also for a single pill tap | same file, `immediateQuote ? 0 : 2000`; after T3 it is ~60% of BuyQuotes (3.2 s) | open — expected −2 s on a pill tap; keep the debounce for keypad typing |
| TC4 | Buy init: per ERC-20 coin, `Object.values({...BitpaySupportedTokens, ...tokenDataByAddress}).find`; `getLogoUri` scans every token | flow profile: 1,911 ms synchronous in the coin-list map (1,052 spread+find, 412 getLogoUri) | **fixed (T4)** |
| TC5 | Buy: Transak fiat currencies (407 KB), Sardine limits (156 KB), Ramp assets (3–287 KB) re-downloaded on every quote round | activity profile: same endpoints ×2 per flow (one per quote round) | open — cache per session with a TTL; mostly bandwidth, the requests run in parallel with the quotes |
| TC6 | `BuyAndSellRoot`: `tokenOptions` rebuilt on every render (every keypad digit) | same pattern as TC1 (T2 cut Swap's transition by 74%) | open — next |
| TC7 | Swap opens on the "To" `GlobalSelect`: ~150 ms JS per open (`GlobalSelect.tsx:1131-1142`, account-list signatures) | flow profile, "end SwapCryptoRoot → start Home" phase | open |
| TC8 | JS heap grows ~8 MB per Swap visit on the base build (84 → 156 MB over 10 visits); ~2.6 MB after T2 | per-iteration `js_heap_mb_peak_flow` | open — check for retained closures after T2 |

## Measurement notes

- **Process memory mode.** The app's "Unknown" memory (dumpsys meminfo) is
  ~136 MB in some cold launches and ~290 MB (once ~470 MB) in others, for
  both base and candidate builds, before any trade screen is opened (4
  launches of each). Interaction scenarios serve all 10 iterations from one
  process, so each run is a single draw: the high mode alone moved base
  trade-swap PSS 695 → 817 MB, janky 2.5 → 3.75%, peak CPU 107 → 182%.
  Runs now record `unknown_mb_start` (context only, never judged); compare
  PSS/jank only between runs in the same mode.
- **CPU percentages are rates.** A fix that shortens the flow raises
  `*_cpu_pct` for the same work; judge CPU by percent × `visible_ms`
  (CPU-seconds) when the flow length changes.
- **Server-side sizes drift.** BWS `ramp/assets` answered 3 KB during one
  baseline and 287 KB later (same request count), moving `request_kb_flow`
  by ±284 KB.

## Parked — needs a decision

- **Swap quotes create Changelly orders.** Showing a Swap quote whose best
  offer is Changelly immediately calls `changellyCreateFixTransaction` (the
  `selectedOffer` effect in `SwapCryptoRoot`), registering a fixed-rate
  order with the wallet's payout and refund addresses before the user has
  committed. Not measured here for that reason; whether orders should be
  created only on "Slide to swap" (with the fixed rate fetched separately)
  is a product/provider decision.
- **Indistinguishable BTC wallets in "Select Wallet to Deposit to".** For
  UTXO chains `buildAccountList` names the account after the wallet
  (`walletName`, here "Bitcoin" for all three of the key's BTC wallets) and
  `AccountListRow` shows only "BTC" beneath it, so the three rows read
  "Bitcoin BTC 0.00" ×3 (screenshot: `x-swap-1.png` in the session scratch
  dir). Selection works (verified with adb taps). Same on both platforms —
  a labelling gap, not an Android layout bug; what to show (account index,
  address type) is a product call.

## Observations

- Home's LINK row shows empty placeholder pills instead of a day change
  (the wallet perf/loop/FINDINGS.md lists under B5, invalid history) — main-loop
  scope.
- An earlier Maestro tap at 61% height in the BTC wallet sheet hit the
  backdrop and closed it — looked like a selection bug, was the flow; the
  flow taps the first row at 73%.
