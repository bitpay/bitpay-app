import {
  getAccountDetailsRouteId,
  getKeyOverviewRouteId,
  getWalletDetailsRouteId,
} from './walletRouteIds';

describe('preloadable wallet route ids', () => {
  it('distinguishes key destinations', () => {
    expect(getKeyOverviewRouteId({params: {id: 'key-1'}})).not.toBe(
      getKeyOverviewRouteId({params: {id: 'key-2'}}),
    );
  });

  it('distinguishes key overview contexts', () => {
    expect(getKeyOverviewRouteId({params: {id: 'key-1'}})).not.toBe(
      getKeyOverviewRouteId({
        params: {id: 'key-1', context: 'createNewMultisigKey'},
      }),
    );
  });

  it('distinguishes account destinations', () => {
    expect(
      getAccountDetailsRouteId({
        params: {
          keyId: 'key-1',
          selectedAccountAddress: 'account-1',
        },
      }),
    ).not.toBe(
      getAccountDetailsRouteId({
        params: {
          keyId: 'key-1',
          selectedAccountAddress: 'account-2',
        },
      }),
    );
  });

  it('distinguishes multisig wallet destinations', () => {
    expect(
      getWalletDetailsRouteId({
        params: {walletId: 'wallet-1', copayerId: 'copayer-1'},
      }),
    ).not.toBe(
      getWalletDetailsRouteId({
        params: {walletId: 'wallet-1', copayerId: 'copayer-2'},
      }),
    );
  });
});
