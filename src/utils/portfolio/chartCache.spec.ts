import {buildBalanceChartScopeId, getSortedUniqueWalletIds} from './chartCache';

describe('chart scope identity helpers', () => {
  it('sorts and dedupes wallet ids', () => {
    expect(
      getSortedUniqueWalletIds(['wallet-b', '', 'wallet-a', 'wallet-b']),
    ).toEqual(['wallet-a', 'wallet-b']);
  });

  it('builds stable scope ids from identity inputs', () => {
    expect(
      buildBalanceChartScopeId({
        walletIds: ['wallet-b', 'wallet-a'],
        quoteCurrency: 'usd',
        balanceOffset: '5' as any,
        scopeIdentityKey: 'balance_history_chart:89',
      }),
    ).toBe('balance_history_chart:89|USD|5|wallet-a,wallet-b');
  });
});
