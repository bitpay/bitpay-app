// Fails the onboarding flow when no seed was passed, instead of importing
// something else. See the header of onboard.yaml.
if (typeof SEED === 'undefined' || !SEED || SEED.split(' ').length < 12) {
  throw new Error('SEED is missing: run with -e SEED="$(cat ~/.bitpay-perf/seed.txt)"');
}
