# Performance harness — handoff

**Status:** Android end-to-end working and validated on an emulator. iOS not started.
**Branch:** `perftracking/phase1` (single commit, `a0c54722b`, message "WIP")
**Author:** jwhite@bitpay.com · last worked 2026-08-16

`perf/README.md` is the operator manual — how to run it, what each metric means,
why the design is what it is. **This document is the state-of-play**: what is
finished, what is half-finished, what is deliberately absent, and the specific
traps that already cost time once.

A shareable web version of this document, with the startup breakdown in §3 drawn as
a waterfall, is published at
<https://claude.ai/code/artifact/45f0b3c1-8297-4cab-accb-6da4c3d2ade4> (private
until shared). This file is the source of record.

---

## 1. What this is

A repeatable performance diagnostic that runs against a **built release APK** and
reports startup, navigation, frame, CPU and memory metrics with enough statistics
to distinguish a real regression from device noise.

Two layers:

- **Layer 1 — black box.** Works on any stock release APK, no app changes. Everything
  comes from `adb`: TTID, warm/hot start, `dumpsys gfxinfo` frame percentiles,
  `dumpsys meminfo` PSS, per-thread CPU from `/proc`, artifact size breakdown.
- **Layer 2 — instrumented.** `yarn build:android:perf` produces a **release** build
  (same Hermes bytecode, same minification) with `IS_PERF=true`, which switches on
  `src/perf/PerfMonitor.ts`. Adds TTFD, the JS startup phase breakdown, and
  per-screen navigation timing.

The JS phase breakdown is the point of the whole exercise. It is what turns
"startup is slow" into "rehydration costs 425ms and nav-ready-to-splash-hidden
costs 491ms".

---

## 2. Where the code lives

Everything is on `perftracking/phase1` in one commit. 34 files, ~3,560 lines.

### Harness (host-side, plain Node, no deps)

```
perf/
  cli.js                 entry point — run / baseline / compare / report   (673 lines)
  config.js              app IDs, scenario registry, thresholds, device policy
  collector.js           reassembles chunked in-app payloads out of logcat
  drivers/
    android.js           adb: launch timing, gfxinfo, meminfo, per-thread CPU (691 lines)
    maestro.js           scenario driver — async, so sampling runs concurrently
  analysis/
    stats.js             median, p90, stddev, coefficient of variation
    baseline.js          comparison + the two-signal regression gate
    report.js            self-contained HTML report
  scenarios/*.yaml       Maestro flows (5 scenarios)
  setup/onboard.yaml     one-shot state setup — NOT a measured scenario
  results/               run outputs (gitignored)
  baselines/             per-device-class baselines — DOES NOT EXIST YET, see §6
```

### App-side instrumentation

| File | What it does |
|---|---|
| `src/perf/PerfMonitor.ts` | All marks/measures. Inert unless `IS_PERF=true`. 242 lines. |
| `src/perf/fullyDrawn.ts` | `reportFullyDrawn()` bridge. **Ships enabled in production** — see §5. |
| `android/.../AppPerfModule.java` | Native module: chunks payloads into logcat, calls `Activity.reportFullyDrawn()` |
| `android/.../AppPerfPackage.java` | Registers the module |
| `android/.../MainApplication.kt` | One line — adds `AppPerfPackage()` |
| `scripts/android-perf.sh` | Instrumented release build. The env-file juggling is load-bearing — see §5. |

### Instrumentation call sites

- `index.js` — `bp_js_entry` (first JS statement we control), `bp_store_ready`,
  `bp_store_rehydrated`
- `src/AppInitialization.tsx` — `bp_app_initialized` when the MMKV migration gate opens
- `src/Root.tsx` — `bp_nav_ready` + `startNavigationReporting()` in `onReady`;
  `perfOnNavigationStateChange()` in `onStateChange` (**deliberately not debounced** —
  the existing analytics listener is debounced 300ms, and a transition timer behind
  that debounce measures the debounce); `bp_splash_hidden` + `reportFullyDrawn()` +
  `flushStartup()` in the bootsplash-hide branch
- `src/navigation/tabs/TabsStack.tsx` — `tabBarButtonTestID` on all four tabs
  (Maestro needs them to drive `nav-tabs`)
- `src/navigation/tabs/home/HomeRoot.tsx` — `testID="home-scroll-view"` for `scroll-home`

Wiring changes only. No behaviour changed in any of these files.

---

## 3. Numbers already collected

Seven runs are stored (see §6 — they live in the *other* worktree, not on the branch).
The one that matters is `android-2026-08-14T19-44-03-047Z.json`: instrumented build,
5 runs (2 discarded), `startup-cold-fresh`, emulator `sdk_gphone64_arm64` / Android 12.

| Metric | Median | p90 | CoV |
|---|---:|---:|---:|
| `ttid_ms` (first draw) | 275 | 312 | 0.095 |
| `ttfd_ms` (**real time-to-interactive**) | 2076 | 2146 | 0.03 |
| `native_launch_end_ms` | 21 | 22 | 0.074 |
| `js_bundle_exec_ms` (Hermes bundle eval) | 507 | 599 | 0.084 |
| `js_entry_ms` | 842 | 970 | 0.072 |
| `store_ready_ms` | 926 | 1044 | 0.070 |
| `rehydrate_ms` (redux-persist + crypto transform) | 933 | 1066 | 0.075 |
| `app_init_ms` (MMKV migration gate opens) | 1192 | 1345 | 0.097 |
| `nav_ready_ms` | 1492 | 1655 | 0.063 |
| `splash_hidden_ms` | 1983 | 2074 | 0.028 |
| `peak_pss_mb` | 266.5 | 278.5 | 0.023 |
| `js_thread_cpu_pct` | 2.4 | 2.5 | 0.035 |

Static, from the APK: `apk_size_bytes` 281.5 MB (universal, all ABIs),
`bundle_size_bytes` 29.6 MB, `native_libs_bytes` 200.5 MB, `assets_bytes` 30.5 MB.

**What the phase breakdown already tells you** — the interesting gaps, in order:

1. **`nav_ready_ms` → `splash_hidden_ms`: ~491ms.** Between navigation reporting
   ready and the splash actually coming down. Largest single unexplained gap.
2. **`app_init_ms` → `nav_ready_ms`: ~300ms.** Navigation container construction.
3. **`rehydrate_ms` → `app_init_ms`: ~259ms.** The MMKV migration itself, which gates
   the whole tree behind it.
4. **`js_entry_ms` → `store_ready_ms`: ~84ms**, and rehydration only ~7ms past that.
   redux-persist rehydration and its crypto transform were the *assumed* culprit
   going in; measured, they are ~91ms of a 2076ms TTFD. Do not spend time there on
   the strength of folklore.
5. **`js_bundle_exec_ms` 507ms** on a 29.6 MB bundle, plus ~335ms from bundle-exec-end
   to `js_entry`. Bundle size is the lever.

**Caveats that must travel with these figures:** emulator, so valid for
same-machine A/B only, never as absolute numbers. `janky_frames_pct` reads 0
regardless of actual jank because emulator GPU timing is unavailable (SwiftShader) —
the harness detects this, warns, and reports `janky_frames_legacy_pct` instead,
which showed **84% legacy-janky frames on `nav-tabs`**. Also worth noting: `nav-tabs`
`BillsHome` transition median 7.5s and `Gift Cards` 3.5s — those are real and large,
but the CoV on `BillsHome` is 0.354, i.e. flagged unreliable at 4 runs.

---

## 4. Trust model (why these numbers are defensible)

Understand this before changing thresholds — it is the reason the gate is
credible enough not to be ignored.

- **10 runs by default**, first iteration always discarded (warms dex/ART + page cache).
- **Every metric carries its own noise.** median, p90, stddev, CoV. Any metric with
  CoV > 0.15 is printed as `unreliable` rather than as a precise median.
- **The gate requires two independent signals.** A metric fails only when the median
  moves past its tolerance **and** the move exceeds 2× the measured noise. One noisy
  device cannot fail a build.
- **Device state is normalized** — animations off, screen awake, keyguard dismissed,
  battery ≥30%, and the run **aborts** rather than publishing numbers from a
  thermally-throttled device. Originals restored in a `finally`, including on failure.
- **Device classes never mix.** Baselines are per class
  (`android-emulator-<model>.json` / `android-device-<model>.json`) and the gate
  refuses cross-class comparison. Emulator and physical medians are different
  quantities that share a unit.

Thresholds live in `THRESHOLDS` in `perf/config.js` so "what counts as a regression"
is reviewable in a diff.

---

## 5. Six things that will bite you

These are all already-paid costs. Do not re-derive them.

**1. Marks travel over logcat, not HTTP.** The obvious design — POST to a local
sink — does not work in this app's release builds. `network_security_config.xml`
forbids cleartext to localhost, *and* `AllowedUrlPrefixInterceptor` (installed on
RN's OkHttp client in `MainApplication.kt`) rejects any URL outside the manifest
allowlist. Both would have to be weakened for instrumentation, which is a bad
trade. `AppPerfModule.emit()` chunks payloads at 2000 bytes with a sequence number;
`perf/collector.js` reassembles and discards incomplete sets.

**2. The launcher is a trampoline.** The manifest LAUNCHER is `.LaunchActivity`,
which immediately starts `.MainActivity` and finishes. So `am start -W` TotalTime
describes the trampoline, not the app, and understates startup. TTID is read from
the logcat `Displayed <pkg>/.MainActivity` line instead; the `am` value is kept as
`am_total_time_ms` for reference only. Separately: trampoline activities are a
startup anti-pattern Android Vitals penalizes — removing it is worth investigating
on its own merits.

**3. Startup flows must never contain `launchApp`.** The harness performs the launch
itself through the real LAUNCHER intent so it can read the framework's timing line.
A `launchApp` in the flow launches a second time and makes every startup number
meaningless.

**4. `scripts/android-perf.sh` writes `IS_PERF=true` to BOTH env files, uses absolute
paths, and restores on `EXIT INT TERM`.** All three are fixes for real failures.
`babel.config.js` picks the env file from `NODE_ENV` at bundle time and `yarn set:prod`
only exports `NODE_ENV` inside its own subshell, so it never reaches the gradle/metro
process that resolves `@env`. An earlier version used relative paths and ran gradle via
`cd android`, so the restore trap silently found nothing and **left `IS_PERF=true` in
`.env.production` for the next production build**. Failure mode is silent: build
succeeds, instrumentation is simply missing (or shipped).

**5. `reportFullyDrawn()` is intentionally NOT gated behind `IS_PERF`.** It ships in
production. It is a public Android API meant for exactly this, costs nothing, and
without it Play Console startup vitals measure the bootsplash instead of a usable
wallet. Everything else in `src/perf` is inert in production.

**6. `visible_ms` is deliberately not gated.** Measured, it is dominated by Maestro's
own driver startup (~14s), which dwarfs the app's contribution — a real 500ms
regression moves it ~2% and would never trip a threshold. Reported for context only.
`ttid_ms` and `ttfd_ms` are the startup metrics worth gating. Related: `startup-hot`
produces **no TTID at all** — resuming never re-creates the activity so the framework
emits no `Displayed` line. The harness knows and skips the wait; `ttid_ms: not
collected` there is correct, not a bug.

---

## 6. Loose ends in the working tree — read before you start

The work is spread across three places. Consolidating them is step one.

**a. The branch `perftracking/phase1`** holds the complete harness in one commit
titled "WIP". It has **no `perf/baselines/`** — `perf/results/` is gitignored, and no
run has been promoted to a baseline yet. So `yarn perf:run` currently has nothing to
compare against and `--baseline false` is effectively the only mode. First real task:
run on a physical device and `yarn perf:baseline --from <results.json>`.

**b. A stale worktree at `.claude/worktrees/design-md-perf-dashboard`** (locked, based
on `e363703db` from Feb 2025) contains:
- **A restyled `perf/analysis/report.js` — 552 lines vs the branch's 387.** Committed
  there as `35d91e565`, "perf: restyle the HTML report with the Vercel design system".
  This is a real improvement (WCAG AA in both polarities, system font stack so it
  opens from `file://` and in CI artifact viewers, no change to what is collected) and
  it is **not on `perftracking/phase1`**. Port it over.
- **All seven stored runs** (`perf/results/*.json` + `.html`), including the validated
  instrumented run in §3. Gitignored, so they exist only on that disk. Copy anything
  worth keeping out before that worktree is removed.

Every other `perf/*` file in that worktree is byte-identical to the branch.

**c. Uncommitted edits on `release/14.46` are NOT part of this work.** Local debug
scratch — the `AllowedUrlPrefixInterceptor` registration commented out in
`MainApplication.kt`, `RCTSetCustomNSURLSessionConfigurationProvider` commented out in
`AppDelegate.swift`, `x86` dropped from the ABI list, the Xcode scheme flipped to
Release, and a Braze `nil`-safety fix. The two commented-out interceptors are the same
network restrictions described in §5.1, so they look related — they are not the
harness, and the harness does not need them disabled. Revert or land them separately.

---

## 7. Deliberately not done

**iOS.** `--platform ios` exits with a message rather than pretending. Two pieces are
missing: there is no `am start -W` equivalent, so cold launch needs either a small
XCUITest target using `XCTApplicationLaunchMetric` or `xcrun xctrace record --template
'App Launch'`; and the mark-collection transport is Android-only — `PerfMonitor`
emits through the `AppPerf` native module and no-ops on iOS. The iOS equivalent is
`os_log`, read via `xcrun simctl spawn booted log stream`.

**Flashlight.** Evaluated and rejected. It would add FPS and a JS-thread FPS estimate,
but `dumpsys gfxinfo` already gives jank percentage and frame-time percentiles, and
per-thread CPU comes straight from `/proc`. It runs its own `maestro test`, so adding
it as a second orchestrator would roughly double run time for one marginal metric.
Revisit only if JS-thread FPS specifically becomes the question.

**CI gating.** Not wired. `.github/workflows/e2e-android.yml` already provisions an
emulator with animations disabled — a perf workflow can clone it, build release
instead of debug, and run `yarn perf:run` against an emulator baseline. Blocked on (a)
above: there is no committed baseline to gate against.

---

## 8. Getting running from cold

```bash
# 0. prereqs: adb, maestro, node >=20 (.node-version pins 22)
curl -Ls "https://get.maestro.mobile.dev" | bash

# 1. build the instrumented release APK
yarn build:android:perf

# 2. put the device in the state the scenarios assume (once, by hand)
#    every non-fresh scenario asserts on the Home screen of an ONBOARDED wallet;
#    on a fresh install the app sits in onboarding and every scenario times out
maestro test perf/setup/onboard.yaml

# 3. run
yarn perf:run --artifact android/app/build/outputs/apk/release/app-release.apk

# 4. once you trust a run, promote it
yarn perf:baseline --from perf/results/<file>.json
```

Full CLI surface:

```
perf run       --artifact <apk> [--runs N] [--scenarios a,b] [--device serial]
               [--baseline <path>|--baseline false] [--animations on] [--cooldown ms]
perf baseline  --from <results.json>      promote a run to the baseline for its device class
perf compare   <baseline.json> <candidate.json>
perf report    --from <results.json>      regenerate HTML from stored results
```

Scenarios: `startup-cold`, `startup-cold-fresh`, `startup-warm`, `startup-hot`,
`nav-tabs`, `scroll-home`.

Every run writes a JSON file and a self-contained HTML report to `perf/results/`.

Adding a scenario: write the flow in `perf/scenarios/`, register it in `SCENARIOS` in
`perf/config.js`, add thresholds for any new metric keys to `THRESHOLDS` in the same
file.

---

## 9. Suggested order of work

1. **Consolidate.** Port the restyled `report.js` from the stale worktree onto
   `perftracking/phase1`; rescue the stored results; split the unrelated
   `release/14.46` edits out. Give the "WIP" commit a real message.
2. **Establish a physical-device baseline.** Everything measured so far is emulator.
   Run `startup-cold` and `startup-cold-fresh` at the default 10 runs on a real
   device and commit `perf/baselines/android-device-<model>.json`. Without this the
   regression gate is inert.
3. **Attack the measured gaps in the order §3 ranks them** — ~491ms `nav_ready` →
   `splash_hidden`, ~300ms navigation construction, ~259ms MMKV migration, and the
   507ms Hermes bundle eval on a 29.6 MB bundle. The harness now makes all four
   falsifiable; skip rehydration, which measured clean at ~91ms.
4. **Then** CI gating, and iOS as its own project.
