# Android performance loop

A repeatable loop that finds a bottleneck on a real Android device, works out
why, tries fixes until one measurably helps, and commits it. Everything lands
on one branch (`misc-updates`), one commit per fix; `FINDINGS.md` is the
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

1. **Pick** the top open candidate in `FINDINGS.md` (largest expected win ×
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
     on its own merits, or an algorithmic win on a path the test wallet does
     not exercise, proven by a benchmark and an equivalence test that passes
     against the old code too (record which, with the benchmark numbers) —
     or a CPU reduction the JS profiler attributes directly to the change,
     with an equivalence proof, on a phase whose wall-clock is set by
     something else (network, UI thread).
   - `REJECT` → revert. Try another variant; after three variants, park the
     candidate with what was learned.
   - Snapshots taken at TTFD (`*_ttfd`: heap, modules, actions, requests,
     store size, module time) shift whenever TTFD moves relative to
     background work, without that work changing. compare.js marks them
     `(snap)` and ignores them unless the same metric at settle moves the
     same way.
   - Pooling with `merge-runs.js` after an inconclusive batch is optional
     stopping: it raises the false-positive rate a little. Use it to settle a
     close call, say so in the ledger, and don't pool more than once per
     change.
5. **Record** in `FINDINGS.md`: hypothesis, evidence, each attempt and its
   numbers, the verdict, the commit.

Every five kept fixes, also run `--scenarios nav-tabs,scroll-home` so a startup
win cannot quietly cost interaction smoothness.

## Device state drifts — compare back to back

App data on the device changes over a session (visiting Shop persisted a
1.1 MB catalog; interest-bearing tokens change balances; caches fill). A
baseline taken an hour earlier can differ from the candidate for reasons
that have nothing to do with the change. When `store_kb_*`, `phase_store_*`
or heap metrics move on a change that cannot touch them, re-take the
baseline (`iterate.sh --accept` on the base build) immediately before the
candidate, and check `profile.storeBytes` for the slice that grew.

## Ablations: confirm the screen before trusting the number

A diagnostic build that removes a component can also break it, and an error
fallback renders a far lighter screen than the real one — a dramatic "win"
that is really a crash. Take a screenshot of the ablated build at the
measured moment (wake the screen first; the harness restores the stay-awake
setting) and only count the result if the screen is the normal one minus the
removed part. (2026-10-19: forcing the allocation card out of its loading
state "removed" ~600 ms of jank; the full-section ablation showed ~50–100 ms.)

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
  card removal, #2456 Ledger removal, #2457 lint, #2458 React Compiler, #2461 chart ghost-line
  loader (added later; the old Skia spinner had still been measured until then).
- **Trust the noise rule.** A move counts only beyond 2× the larger stddev.
  The harness aborts on thermal throttling; let the phone cool rather than
  rerun hot.
- **Stop and ask** only for: removing a user-visible capability, a security
  trade-off that cannot be made neutral, or anything touching keys, seeds or
  funds handling beyond pure performance.

## UI parity track (parked — Android first)

Layout regressions between platforms (e.g. bottom-notification actions
stacked instead of left/right) are caught by `perf/parity/`: the same screens
captured on the iOS simulator and the Android device, compared structurally
(element bounds from the view hierarchy) rather than by pixels, with the
screenshots side by side for review.
