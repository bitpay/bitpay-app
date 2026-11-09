/**
 * How long the offer selector waits after a partner's state changes before
 * it picks the best offer (Buy and Sell).
 *
 * The wait lets a slow partner land before the selection is made. Once every
 * participating partner has finished there is nothing left to wait for, so
 * the offer is picked at once — but only when this run was triggered by a
 * partner finishing: a payment-method change re-runs the selector with the
 * previous round's flags (and offers) still set, and keeps the full wait.
 *
 * `finished` holds one flag per partner: null = not participating,
 * false = quoting, true = finished. `lastKey` remembers the flags of the
 * previous run of the same effect.
 */
export const OFFER_SETTLE_MS = 3500;

export const offerSettleDelay = (
  finished: Array<boolean | null | undefined>,
  lastKey: {current: string},
): number => {
  const key = finished.map(f => String(f)).join();
  const changed = key !== lastKey.current;
  lastKey.current = key;
  const allFinished =
    finished.every(f => f !== false) && finished.some(f => f === true);
  return changed && allFinished ? 0 : OFFER_SETTLE_MS;
};
