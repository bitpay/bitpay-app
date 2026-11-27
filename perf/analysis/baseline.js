const fs = require('fs');
const {THRESHOLDS} = require('../config');

/**
 * Baseline comparison and the regression gate.
 *
 * Two rules keep this honest:
 *
 *  1. A metric only fails when the median moves past its tolerance AND the
 *     move exceeds 2x the observed noise. Without the second clause a jittery
 *     device fails builds at random, the harness loses credibility, and people
 *     start ignoring it.
 *
 *  2. Runs from different device classes are never compared. An emulator
 *     median and a physical-device median are different quantities that happen
 *     to share a unit.
 */

/** Fields that must match for two runs to be comparable at all. */
const IDENTITY_FIELDS = ['platform', 'device.model', 'device.isEmulator'];

function get(obj, dottedPath) {
  return dottedPath
    .split('.')
    .reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function checkComparable(candidate, baseline) {
  const mismatches = [];

  IDENTITY_FIELDS.forEach(field => {
    const a = get(candidate.meta, field);
    const b = get(baseline.meta, field);
    if (String(a) !== String(b)) {
      mismatches.push({field, candidate: a, baseline: b});
    }
  });

  return {comparable: mismatches.length === 0, mismatches};
}

/**
 * Compare one metric summary against its baseline.
 * Returns null when the metric has no configured threshold or no baseline —
 * we report it, but it cannot gate the build.
 */
function compareMetric(key, candidate, baseline) {
  const threshold = THRESHOLDS[key];

  if (!threshold || !candidate || !baseline) {
    return null;
  }
  if (candidate.median === null || baseline.median === null) {
    return null;
  }

  const delta = candidate.median - baseline.median;

  // A zero baseline has no percentage to move by. Mapping that to 0% (the
  // obvious-looking guard) would let any regression from zero pass — and zero
  // baselines are common in practice, e.g. janky_frames_pct on an idle
  // scenario, where 0% → 30% is exactly the regression we care about.
  const fromZeroBaseline = baseline.median === 0;
  const pctChange = fromZeroBaseline
    ? delta === 0
      ? 0
      : delta > 0
      ? Infinity
      : -Infinity
    : delta / baseline.median;

  // Worse is bigger for times/memory, smaller for frame rates.
  const worseBy = threshold.direction === 'lower' ? pctChange : -pctChange;

  const noise = Math.max(candidate.stddev || 0, baseline.stddev || 0);
  const exceedsNoise = Math.abs(delta) > noise * 2;
  const exceedsTolerance = worseBy > threshold.tolerance;

  return {
    metric: key,
    candidate: candidate.median,
    baseline: baseline.median,
    delta: Number(delta.toFixed(2)),
    // Infinity is not representable in JSON — report null and let the
    // fromZeroBaseline flag explain why there is no percentage.
    pctChange: Number.isFinite(pctChange)
      ? Number((pctChange * 100).toFixed(1))
      : null,
    fromZeroBaseline,
    tolerancePct: threshold.tolerance * 100,
    direction: threshold.direction,
    noise: Number(noise.toFixed(2)),
    exceedsNoise,
    exceedsTolerance,
    // Both clauses required — see the note at the top of this file.
    regression: exceedsTolerance && exceedsNoise,
    improvement: worseBy < -threshold.tolerance && exceedsNoise,
    /** Flagged but not failed: real-looking move that noise can't rule out. */
    inconclusive: exceedsTolerance && !exceedsNoise,
  };
}

/**
 * Metrics the baseline has but this run does not.
 *
 * Without this, a run whose instrumentation silently failed compares only the
 * metrics it did collect and passes cleanly — the harness would report "no
 * regressions" precisely when it had stopped measuring. Surfaced as a warning
 * rather than a hard failure, since dropping a scenario from `--scenarios` is a
 * legitimate thing to do.
 */
function findMissingMetrics(candidate, baseline) {
  const missing = [];

  Object.entries(baseline.scenarios || {}).forEach(([scenario, baseData]) => {
    const candData = (candidate.scenarios || {})[scenario];

    Object.entries(baseData.metrics || {}).forEach(([key, summary]) => {
      if (!THRESHOLDS[key] || summary.median === null) {
        return;
      }

      const candMetric = candData && (candData.metrics || {})[key];
      if (!candMetric || candMetric.median === null) {
        missing.push({scenario, metric: key, baseline: summary.median});
      }
    });
  });

  return missing;
}

function compare(candidate, baseline) {
  const identity = checkComparable(candidate, baseline);
  const comparisons = [];

  const walk = (candScenarios, baseScenarios) => {
    Object.entries(candScenarios || {}).forEach(([scenario, data]) => {
      const baseData = (baseScenarios || {})[scenario];
      if (!baseData) {
        return;
      }

      Object.entries(data.metrics || {}).forEach(([key, summary]) => {
        const result = compareMetric(
          key,
          summary,
          (baseData.metrics || {})[key],
        );
        if (result) {
          comparisons.push({scenario, ...result});
        }
      });

      Object.entries(data.perScreen || {}).forEach(([screen, metrics]) => {
        Object.entries(metrics).forEach(([key, summary]) => {
          const result = compareMetric(
            key,
            summary,
            ((baseData.perScreen || {})[screen] || {})[key],
          );
          if (result) {
            comparisons.push({scenario, screen, ...result});
          }
        });
      });
    });
  };

  walk(candidate.scenarios, baseline.scenarios);

  // Static artifact metrics are deterministic; compare them with zero noise.
  Object.entries(candidate.static || {}).forEach(([key, value]) => {
    const baseValue = (baseline.static || {})[key];
    if (!Number.isFinite(value) || !Number.isFinite(baseValue)) {
      return;
    }
    const result = compareMetric(
      key,
      {median: value, stddev: 0},
      {median: baseValue, stddev: 0},
    );
    if (result) {
      comparisons.push({scenario: 'static', ...result});
    }
  });

  const regressions = comparisons.filter(c => c.regression);
  const improvements = comparisons.filter(c => c.improvement);
  const inconclusive = comparisons.filter(c => c.inconclusive);

  return {
    identity,
    comparisons,
    regressions,
    improvements,
    inconclusive,
    missing: findMissingMetrics(candidate, baseline),
    // A non-comparable baseline must not silently pass the gate.
    passed: identity.comparable && regressions.length === 0,
  };
}

function load(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function save(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {compare, compareMetric, checkComparable, load, save};
