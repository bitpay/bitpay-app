import {getSinglePreloadCandidate} from './navigationPreload';

describe('getSinglePreloadCandidate', () => {
  const isEligible = (item: {eligible: boolean}) => item.eligible;

  it('returns the only eligible destination', () => {
    const destination = {id: 'wallet-1', eligible: true};

    expect(
      getSinglePreloadCandidate(
        [{id: 'hidden', eligible: false}, destination],
        isEligible,
      ),
    ).toBe(destination);
  });

  it('does not guess when multiple destinations are eligible', () => {
    expect(
      getSinglePreloadCandidate(
        [
          {id: 'wallet-1', eligible: true},
          {id: 'wallet-2', eligible: true},
        ],
        isEligible,
      ),
    ).toBeUndefined();
  });
});
