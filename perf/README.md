# Performance harness

Runs a repeatable performance diagnostic against a **built artifact** (an APK)
and reports startup, navigation, frame, CPU and memory metrics with enough
statistics to tell a real regression from device noise.

```bash
# Full run against a release APK
yarn perf:run --artifact android/app/build/outputs/apk/release/app-arm64-v8a-release.apk

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
  collector.js           reassembles chunked in-app payloads from logcat
  drivers/
    android.js           adb: launch timing, gfxinfo, meminfo, per-thread CPU
    maestro.js           scenario driver (async, so sampling runs concurrently)
  analysis/
    stats.js             median, p90, stddev, coefficient of variation
    baseline.js          comparison and the two-signal regression gate
    report.js            self-contained HTML report
  scenarios/*.yaml       Maestro flows
  baselines/*.json       committed, one per device class
  results/               run outputs (gitignored)
```

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

**CI gating.** `.github/workflows/e2e-android.yml` already provisions an
emulator with animations disabled — a perf workflow can clone it, build release
instead of debug, and run `yarn perf:run` against an emulator baseline.
