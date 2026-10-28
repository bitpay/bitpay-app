/**
 * Statistics for the harness.
 *
 * The guiding rule: a single run is an anecdote. Everything here exists so the
 * report can distinguish a real change from device noise, and can say "I don't
 * trust this number" instead of quietly reporting a precise-looking median.
 */

function median(values) {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Nearest-rank percentile — no interpolation, so results stay on real samples. */
function percentile(values, p) {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);

  return sorted[Math.min(Math.max(rank - 1, 0), sorted.length - 1)];
}

function mean(values) {
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : null;
}

/** Sample standard deviation (n-1). */
function stddev(values) {
  if (values.length < 2) {
    return 0;
  }

  const m = mean(values);
  const variance =
    values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);

  return Math.sqrt(variance);
}

const round = (n, dp = 2) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? null
    : Number(n.toFixed(dp));

/**
 * Summarize a metric's samples.
 *
 * `cov` (coefficient of variation = stddev/mean) is the reliability signal:
 * it makes spread comparable across metrics with wildly different units, so
 * one threshold can flag an untrustworthy startup time and an untrustworthy
 * memory reading alike.
 */
function summarize(rawValues, {maxCov = 0.15} = {}) {
  const values = (rawValues || []).filter(v => Number.isFinite(v));

  if (!values.length) {
    return {
      values: [],
      count: 0,
      median: null,
      mean: null,
      p90: null,
      min: null,
      max: null,
      stddev: null,
      cov: null,
      reliable: null,
    };
  }

  const m = mean(values);
  const sd = stddev(values);
  const cov = m ? sd / m : 0;

  return {
    values: values.map(v => round(v)),
    count: values.length,
    median: round(median(values)),
    mean: round(m),
    p90: round(percentile(values, 90)),
    min: round(Math.min(...values)),
    max: round(Math.max(...values)),
    stddev: round(sd),
    cov: round(cov, 3),
    // A single sample has no spread to measure — that is unknown, not reliable.
    reliable: values.length < 2 ? null : cov <= maxCov,
  };
}

/**
 * Collect per-run metric objects into summarized metric series.
 * Input:  [{ttid_ms: 900}, {ttid_ms: 950}]
 * Output: {ttid_ms: {median, p90, stddev, cov, ...}}
 */
function summarizeRuns(runs, opts) {
  const keys = new Set();
  runs.forEach(run =>
    Object.keys(run || {}).forEach(k => {
      if (Number.isFinite(run[k])) {
        keys.add(k);
      }
    }),
  );

  const out = {};
  keys.forEach(key => {
    out[key] = summarize(runs.map(r => (r ? r[key] : null)), opts);
  });

  return out;
}

module.exports = {
  median,
  percentile,
  mean,
  stddev,
  summarize,
  summarizeRuns,
  round,
};
