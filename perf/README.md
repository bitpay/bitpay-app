# Performance harness

Runs a repeatable performance diagnostic against a **built artifact** (an APK)
and reports startup, navigation, frame, CPU and memory metrics with enough
statistics to tell a real regression from device noise.

```bash
# Full run against a release APK
yarn perf:run --artifact android/app/build/outputs/apk/release/app-release.apk

# Just startup, 20 iterations, on a specific device
yarn perf:run --artifact ./app.apk --scenarios startup-cold --runs 20 --device 4A1B2C3D

# Promote a run to the baseline for its device class
yarn perf:baseline --from perf/results/android-2026-08-14T10-12-33-000Z.json

# Compare two stored runs
yarn perf:compare perf/baselines/android-device-pixel-6a.json perf/results/latest.json
```

Every run writes a JSON file and a self-contained HTML report to `perf/results/`.

---

## Prerequisites

| Tool | Required? | Install |
|---|---|---|
| `adb` (Android platform-tools) | **yes** | Android Studio, or `brew install android-platform-tools` |
| `maestro` | **yes** | `curl -Ls "https://get.maestro.mobile.dev" \| bash` |
| Node | **≥20** | the repo's `.node-version` pins 22 |

**Device state precondition:** every scenario asserts on
`portfolio-balance-toggle`, i.e. the Home screen of an **onboarded wallet**. On
a fresh install the app sits in onboarding and every scenario times out. Get the
device into a logged-in state first — `.maestro/flows/onboarding_to_home.yaml`
does exactly that and can be run once by hand.

---

## The two layers

### Layer 1 — black box (any release APK, no app changes)

Works on a stock artifact. Everything comes from `adb`:

- **TTID** (time to initial display) — from the ActivityTaskManager `Displayed`
  log line
- **Warm and hot start** timings
- **Frame statistics** — janky frame %, frame-time p50/p90/p95/p99 from
  `dumpsys gfxinfo`
- **Memory** — PSS, Java heap, native heap sampled through the scenario
- **CPU** — total, plus the JS thread and UI thread broken out separately
- **Artifact size** — APK, JS bundle, native libs, assets

### Layer 2 — instrumented (`IS_PERF` builds)

Build with `yarn build:android:perf` — a **release** build (same Hermes
bytecode, same minification) with `src/perf/PerfMonitor.ts` switched on. Adds:

- **TTFD** (time to fully drawn) — the moment the bootsplash is dismissed and a
  navigable screen is up, i.e. real time-to-interactive
- **JS startup phase breakdown** — native launch → Hermes bundle exec → JS entry
  → store constructed → redux-persist rehydrated → MMKV migration → nav ready →
  splash hidden. This is what turns "startup is slow" into "rehydration is slow".
- **Per-screen navigation timing**, attributed by route name

The instrumented app emits its marks **through logcat**, chunked by the
`AppPerf` native module and reassembled by `perf/collector.js`.

Not over HTTP, which was the obvious first design and does not work here: this
app's release builds forbid cleartext traffic to localhost
(`android/app/src/main/res/xml/network_security_config.xml`) *and* reject any
URL outside the manifest allowlist (`AllowedUrlPrefixInterceptor`, installed on
RN's OkHttp client in `MainApplication.kt`). A local sink would require
weakening both — a bad trade for instrumentation. Logcat needs no permissions,
no network, and is already being polled for the framework's timing lines.

`reportFullyDrawn()` is the one exception to the gating: it ships **enabled in
production**. It is a public Android API meant for exactly this, costs nothing,
and without it Play Console startup vitals measure the splash screen rather than
a usable app.

---

## Why the numbers are trustworthy

**Ten runs, not one.** Default `--runs 10` with the first iteration discarded
(it warms dex/ART and page caches). Reports median, p90, stddev and the
coefficient of variation.

**It admits when it doesn't know.** Any metric whose coefficient of variation
exceeds 15% is labelled `unreliable` in the report instead of being presented as
a precise median.

**The regression gate needs two independent signals.** A metric fails only when
the median moves past its tolerance **and** the move exceeds 2× the measured
noise. A single noisy device cannot fail your build — which is the only way a
perf gate stays credible enough that people don't start ignoring it.

**Device state is normalized.** Animations disabled, screen kept awake,
keyguard dismissed, battery and thermal status checked before starting. A run
on a thermally-throttled device aborts rather than publishing slow numbers.
Original settings are restored afterwards, including on failure.

**Device classes never mix.** Baselines are stored per device class
(`android-emulator-<model>.json` / `android-device-<model>.json`) and the gate
refuses to compare across them. Emulator and physical-device medians are
different quantities that happen to share a unit.

---

## A real caveat about this app's startup

The manifest launcher is `.LaunchActivity`, a **trampoline** that immediately
starts `.MainActivity` and finishes. Two consequences:

1. `am start -W` TotalTime describes the trampoline, not the app. The harness
   records it as `am_total_time_ms` for reference and takes TTID from the
   logcat `Displayed .../.MainActivity` line instead.
2. Trampoline activities are a startup anti-pattern that Android Vitals
   penalizes. Removing it — by making `MainActivity` the launcher and moving the
   back-stack check into it — is worth investigating on its own merits.

---

## Scenarios

Defined in `perf/config.js`, driven by Maestro flows in `perf/scenarios/`.

| Scenario | What it measures |
|---|---|
| `startup-cold` | Force-stopped process → first frame → fully drawn |
| `startup-load` | Cold start held until the app settles, plus what loaded on the way: modules initialised, requests, Redux actions, JS heap, persisted-store size, per-thread CPU. **The performance loop gates on this one.** |
| `startup-cold-fresh` | Cold start with the app's data cleared — only for onboarding-path work; it wipes the wallet |
| `startup-warm` | Process killed while backgrounded, caches still warm |
| `startup-hot` | Resume from background — **no TTID**, see below |
| `nav-tabs` | Tab-to-tab transitions, frames, CPU |
| `scroll-home` | Scroll jank on the home surface |

> **Startup flows must never contain `launchApp`.** The harness performs the
> launch itself via the real LAUNCHER intent so it can read the framework's
> timing. A `launchApp` in the flow launches the app a second time and makes
> every startup number meaningless.

On **hot start**: resuming never re-creates the activity, so the framework emits
no `Displayed` line and there is no TTID to read. The harness knows this and
skips the wait rather than stalling; the scenario reports ActivityManager resume
timing and the wall clock to a visible element. A `ttid_ms` of "not collected"
there is correct, not a failure.

Adding a scenario: write the flow in `perf/scenarios/`, register it in the
`SCENARIOS` map in `perf/config.js`, and add thresholds for any new metric keys
to `THRESHOLDS` in the same file.

---

## Layout

```
perf/
  cli.js                 entry point — run / baseline / compare / report
  config.js              app IDs, scenarios, thresholds, device prep policy
  collector.js           reassembles chunked in-app payloads from logcat; load profile
  drivers/
    android.js           adb: install (+ baseline profile), launch timing, gfxinfo,
                         meminfo, per-thread CPU
    maestro.js           scenario driver (async, so sampling runs concurrently)
  analysis/
    stats.js             median, p90, stddev, coefficient of variation
    baseline.js          comparison and the two-signal regression gate
    phases.js            startup phase durations from the marks
    report.js            self-contained HTML report
  runtime/module-timer.js  Metro polyfill timing each module's first evaluation
  scenarios/*.yaml       Maestro flows
  setup/onboard.yaml     imports the test wallet (needs SEED, see below)
  smoke/                 read-only pass over every main screen (R8 / keep-rule checks)
  loop/                  the performance loop: iterate, compare, profile, notes
    LOOP.md              the loop's procedure and decision rules
    FINDINGS.md          every candidate, fix and measurement, with numbers
  parity/                iOS/Android layout comparator (parked)
  baselines/*.json       committed, one per device class
  results/               run outputs (gitignored)
  loop/state/            accepted runs, traces, profiles (gitignored)
```

App-side pieces, all inert outside perf builds:

| Where | What |
|---|---|
| `src/perf/PerfMonitor.ts` | JS marks, load profile, action counts; returns early unless `IS_PERF` |
| `android/app/src/perf/java/.../PerfMarks.kt` | native marks; compiled only with `-PperfBuild=true` (a no-op in `src/noperf/java` otherwise) |
| `android/app/src/main/java/.../AppPerfModule.java` | the logcat transport (`emit`), JS profile dump in profiling builds |
| `metro.config.js` | adds `runtime/module-timer.js` and the module id map only when `BP_PERF_BUILD=1` |
| `react-native.config.js` | links `react-native-performance` on Android only when `BP_PERF_BUILD=1` |

## Building a perf APK

```bash
yarn build:android:perf          # instrumented release APK, arm64, ~3 min incremental
BP_PERF_PROFILE=1 yarn build:android:perf   # + Hermes sampling profiler from the first module
PERF_GRADLE_ARGS=-PenableR8=false yarn build:android:perf   # measure without R8
```

`scripts/android-perf.sh` builds a **release** variant (Hermes bytecode, R8, same
code paths) with these differences, all reverted when it exits:

- `IS_PERF=true` in both env files (restored by a trap — see Troubleshooting);
- `-PperfBuild=true`: screenshots allowed (no `FLAG_SECURE`), `<profileable
  android:shell="true">` so simpleperf can sample Java, and the perf-only native
  code compiled in;
- signed with the repo's **debug keystore**. Gradle refuses `perfBuild=true` with
  any other keystore, so a perf build can never be signed for Play;
- Sentry upload disabled (perf bundles must never be attributed to a release);
- the JS bundle and React Native's autolinking cache are cleared, so a change in
  `node_modules` or in what is linked always reaches the APK.

## Running against the funded test wallet

Startup numbers depend heavily on what the wallet holds, so the loop measures an
**onboarded, funded test wallet** on a dedicated phone:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
maestro test -e SEED="$(cat ~/.bitpay-perf/seed.txt)" perf/setup/onboard.yaml
```

- The seed lives outside the repo (`~/.bitpay-perf/seed.txt`, mode 600). Use a
  wallet that exists only for testing; never commit or log it, never put it in
  CI secrets.
- `onboard.yaml` requires `SEED` and fails without it (an earlier version fell back
  to a public phrase and measured an empty wallet for hours).
- Perf builds share the debug signature, so `adb install -r` keeps the wallet
  between iterations. Never uninstall the app or clear its data on that phone.
- Flows are read-only: they open screens and back out. Nothing in `perf/` may
  confirm, sign or broadcast a transaction, or submit anything to a provider.

`yarn perf:run` installs the APK and then applies its **baseline profile** the way
Play does at install (ProfileInstaller broadcast, then `cmd package compile -m
speed-profile`), followed by one priming launch. Without that, `adb install`
leaves startup code interpreted — a state no Play user is in. `BP_PERF_COMPILE=none`
measures the bare `adb install` state; `BP_PERF_SKIP_INSTALL=1` measures whatever is
installed as it is (e.g. after a manual `cmd package compile`).

## The performance loop

`perf/loop/` turns the harness into a find → diagnose → fix → measure loop. The
procedure and decision rules are in [`loop/LOOP.md`](loop/LOOP.md); the record of
every candidate, fix, rejected attempt and measurement is
[`loop/FINDINGS.md`](loop/FINDINGS.md).

```bash
perf/loop/iterate.sh --target splash_hidden_ms --runs 20   # build, measure, verdict
perf/loop/iterate.sh --no-build --accept                     # promote the current run
```

`iterate.sh` builds the working tree, runs `startup-load` (or `--scenarios`), and
compares against the accepted run with `loop/compare.js`:

- noise is MAD-based; a **target** metric must clear p < .01 (Mann–Whitney) or
  move by more than 2× noise; every **other** metric must clear both 2× noise and
  p < .001 before it counts as a regression (so ~50 metrics don't produce chance
  failures — identical builds compare NEUTRAL);
- absolute timeline positions are shown but never judged on their own; phase
  durations are;
- snapshots taken at TTFD (`*_ttfd` heap, modules, requests…) are judged only
  when the same metric at settle agrees, because they move whenever TTFD moves;
- exit code: 0 KEEP, 2 NEUTRAL, 1 REJECT.

Device state drifts over a long session (caches fill, the phone warms up). When a
result is close or surprising, re-measure back to back — build both APKs and
alternate batches (A/B/A/B) rather than comparing with a run from hours ago.

## Finding out why

| Tool | Answers |
|---|---|
| `node perf/loop/profile.js <run.json>` | what loaded: slowest modules by phase, requests, actions, store size by slice |
| `perf/loop/jsprofile.sh` | symbolicated Hermes CPU profile per startup phase (profiling build) |
| `perf/loop/systrace.sh` + `systrace-report.js` | Perfetto: UI / JS / RenderThread time, frames over budget, long frames |
| simpleperf (perf builds are `profileable`) | Java/native stacks on the UI thread — e.g. interpreted vs compiled code |
| `perf/loop/memtabs.sh`, `tabtrace.sh` | memory by category per tab; per-tab frame traces |
| `perf/smoke/run.sh` | a read-only pass over every main screen, then app exceptions from logcat |
| `perf/loop/r8-try.sh` | build with R8 and run the smoke pass |

Diagnostic builds (an ablation, a temporary log line) are fine, but revert them
before measuring the change you mean to keep, and confirm the screen still shows
what you think with a screenshot — an ablation that breaks the screen measures
nothing.

## Baseline profile

`android/app/src/main/baseline-prof.txt` lists the startup and main-tab code ART
should compile at install. Regenerate it after large changes to startup code:

```bash
yarn build:android:perf && yarn perf:run --artifact <apk> --scenarios startup-load,nav-tabs,scroll-home
perf/loop/baseline-profile.sh     # dumps ART's runtime profile, converts it, writes baseline-prof.txt
```

Review the diff before committing; rules for methods that no longer exist are
ignored by the build.

## Two loops, one phone

`iterate.sh`, `jsprofile.sh` and `systrace.sh` hold `~/.bitpay-perf/device.lock`
for their whole run, so two loops (or two people) can share the test phone. Wrap
any other device command with `perf/loop/device-lock.sh <command…>`
(`BP_LOCK_LABEL` names the holder). Maestro allows one session at a time.

## Troubleshooting

- **Instrumentation missing, or `IS_PERF=true` left behind.** `android-perf.sh`
  writes `IS_PERF=true` to both env files (babel picks the file from `NODE_ENV`
  at bundle time) and restores them on `EXIT INT TERM`, using absolute paths. If
  a build is killed hard, check `.env.production` before the next production build.
- **A `node_modules` patch didn't take effect.** Gradle skips the bundle task when
  only `node_modules` changed; the perf script deletes the bundle output to force
  it. For a normal build, delete `android/app/build/generated/assets` yourself.
- **The first iterations after install fail to bring the app up.** The first launch
  after `cmd package compile` loads the new code; the driver primes one launch, so
  this should only show up if you install by hand.
- **Black screenshots.** Release builds set `FLAG_SECURE`; only perf builds allow
  capture. Camera previews never appear in captures.
- **The screen dozes or locks between runs.** Runs keep it awake (`svc power stayon
  usb`); for manual work: `adb shell input keyevent KEYCODE_WAKEUP && adb shell wm
  dismiss-keyguard`.
- **Numbers from before and after a measurement change are not comparable** — e.g.
  runs before the baseline profile was applied at install measured interpreted
  code. `FINDINGS.md` records each such change; re-take the accepted run after one.
- **`visible_ms` is not gated** — it is dominated by Maestro's own driver start.
  `ttid_ms` and `splash_hidden_ms` (TTFD) are the startup metrics to judge.

## CI

Nothing here runs in CI yet. Three options, in the order they're worth doing:

1. **Emulator smoke on every PR.** Clone `.github/workflows/e2e-android.yml`
   (it already boots an emulator with animations off), build the release variant
   with R8, onboard an *empty testnet* wallet and run `perf/smoke/smoke.yaml`.
   Catches keep-rule and reflection crashes; emulator timings are too noisy to
   gate on.
2. **A self-hosted runner with a dedicated phone** (nightly, and on PRs labelled
   `perf`) running `iterate.sh --no-build` against the accepted run. This is the
   setup the loop uses; the funded test wallet and its seed stay on that machine.
3. **Jetpack Macrobenchmark on Firebase Test Lab** for standard startup numbers on
   real devices, and to generate `baseline-prof.txt` in CI instead of from one phone.

## Not yet implemented

**iOS.** `--platform ios` exits with a message rather than pretending. There is
no `am start -W` equivalent, so cold launch needs either a small XCUITest target
using `XCTApplicationLaunchMetric` or `xcrun xctrace record --template 'App
Launch'`. The mark-collection layer needs an iOS transport too — `PerfMonitor`
emits through the Android-only `AppPerf` native module and no-ops on iOS; the
equivalent there is `os_log` read via `xcrun simctl spawn booted log stream`.

**Flashlight.** Evaluated and deliberately not wired in. It would add FPS and a
JS-thread FPS estimate, but `dumpsys gfxinfo` already provides the jank
percentage and frame-time percentiles that matter, and per-thread CPU is
collected directly from `/proc`. Adding it as a second orchestrator (it runs its
own `maestro test` command) would roughly double run time for a marginal metric.
Revisit if JS-thread FPS specifically becomes the question.

**CI gating.** See [CI](#ci) above.
