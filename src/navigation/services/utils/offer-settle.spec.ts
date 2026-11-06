import {OFFER_SETTLE_MS, offerSettleDelay} from './offer-settle';

describe('offerSettleDelay', () => {
  it('waits while any participating partner is still quoting', () => {
    const last = {current: ''};
    expect(offerSettleDelay([false, null, false], last)).toBe(OFFER_SETTLE_MS);
    expect(offerSettleDelay([true, null, false], last)).toBe(OFFER_SETTLE_MS);
  });

  it('picks at once when the last participating partner finishes', () => {
    const last = {current: ''};
    offerSettleDelay([false, null, false], last);
    offerSettleDelay([true, null, false], last);
    expect(offerSettleDelay([true, null, true], last)).toBe(0);
  });

  it('keeps the wait when the flags did not change (e.g. payment method changed)', () => {
    const last = {current: ''};
    offerSettleDelay([false, null, false], last);
    expect(offerSettleDelay([true, null, true], last)).toBe(0);
    // Same flags, effect re-run for another reason: stale round, full wait.
    expect(offerSettleDelay([true, null, true], last)).toBe(OFFER_SETTLE_MS);
  });

  it('keeps the wait when no partner participates', () => {
    const last = {current: ''};
    expect(offerSettleDelay([null, null, null], last)).toBe(OFFER_SETTLE_MS);
  });
});
