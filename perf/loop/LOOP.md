# Self-healing performance loop

A repeatable loop that finds a bottleneck on a real Android device, works out
why, tries fixes until one measurably helps, and commits it. Everything lands
on one branch (`perf/self-healing`), one commit per fix; `LEDGER.md` is the
running record and becomes the PR description.

## Setup (once per device)

```bash
yarn build:android:perf                     # instrumented release APK, ~3 min incremental
adb install -r android/app/build/outputs/apk/release/app-release.apk
maestro test -e SEED="$(cat ~/.bitpay-perf/seed.txt)" perf/setup/onboard.yaml
perf/loop/iterate.sh --no-build --accept    # first accepted run
```

The seed lives outside the repo (`~/.bitpay-perf/seed.txt`, mode 600) and must
be a test-only phrase. Perf builds are signed with the debug keystore, so
`adb install -r` keeps the imported wallet between iterations.

## One iteration

1. **Pick** the top open candidate in `LEDGER.md` (largest expected win ×
   confidence). If none is open, read the latest profile
   (`node perf/loop/profile.js perf/loop/state/accepted.json`) and add the
   biggest unexplained gap, heaviest module, largest request or action storm.
2. **Diagnose before fixing.** If a gap is unexplained, add marks first
   (`perfMark('bp_…')` in JS, `PerfMarks.mark("bp_…")` in Kotlin — both inert
   outside perf builds, and the collector picks up any `bp_*` mark
   automatically) and re-measure. A fix aimed at a guess is not a fix.
3. **Fix** with the smallest change that addresses the measured cause. Run the
   unit tests and lint for touched files.
4. **Measure**: `perf/loop/iterate.sh --target <metric>[,<metric>]`.
   - `KEEP` → commit (one commit per fix, message carries the before/after
     numbers), then promote that run:
     `cp perf/loop/state/run-<stamp>-<sha>-dirty.json perf/loop/state/accepted.json`
     — it measured exactly the tree that was committed.
   - `NEUTRAL` → revert, unless the change is a correctness fix worth keeping
     on its own merits (record it as such).
   - `REJECT` → revert. Try another variant; after three variants, park the
     candidate with what was learned.
5. **Record** in `LEDGER.md`: hypothesis, evidence, each attempt and its
   numbers, the verdict, the commit.

Every five kept fixes, also run `--scenarios nav-tabs,scroll-home` so a startup
win cannot quietly cost interaction smoothness.

## Rules

- **Optimise what exists; do not remove features or sections.** Deferring work
  (lazy-loading, moving work off the critical path) is in scope; deleting a
  capability is not.
- **Never weaken a security control silently.** If a fix touches one (SSL
  pinning, bundle integrity, encryption, FLAG_SECURE), the commit and the
  ledger say exactly what changed and why the guarantee still holds.
- **Production behaviour changes only by the fix itself.** Instrumentation is
  gated on `IS_PERF` / `PERF_BUILD` and must stay inert in production builds.
- **Already covered (base of this branch, do not redo):** #2449 import
  progress delays, #2450 per-key balance errors, #2451 launch balance caching,
  #2452 persist throttle, #2453 lazy locales, #2454 DKLS mount-on-demand, #2455
  card removal, #2456 Ledger removal, #2457 lint, #2458 React Compiler.
- **Trust the noise rule.** A move counts only beyond 2× the larger stddev.
  The harness aborts on thermal throttling; let the phone cool rather than
  rerun hot.
- **Stop and ask** only for: removing a user-visible capability, a security
  trade-off that cannot be made neutral, or anything touching keys, seeds or
  funds handling beyond pure performance.

## UI parity track

Layout regressions between platforms (e.g. bottom-notification actions
stacked instead of left/right) are caught by `perf/parity/`: the same screens
captured on the iOS simulator and the Android device, compared structurally
(element bounds from the view hierarchy) rather than by pixels, with the
screenshots side by side for review.
