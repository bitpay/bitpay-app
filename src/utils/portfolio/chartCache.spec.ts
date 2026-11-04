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

describe('getSortedUniqueWalletIds memo', () => {
  const {getSortedUniqueWalletIds: sortIds} = require('./chartCache');

  it('returns the same order on repeat calls, as fresh arrays', () => {
    const input = ['b-0xAbC', 'a', 'b-0xabc', 'a', '', 'B'];
    const first = sortIds(input);
    const second = sortIds(input);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(first).toEqual(
      [...new Set(input.filter(Boolean))].sort((x, y) => x.localeCompare(y)),
    );
  });

  it('does not let a caller mutate later results', () => {
    const out = sortIds(['z', 'y']);
    out.push('mutated');
    expect(sortIds(['z', 'y'])).toEqual(['y', 'z']);
  });
});
