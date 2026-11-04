import {getChartedWalletIds, getUnchartedWallets} from './getUnchartedWallets';

const wallet = (id: string, fiat: number) => ({id, balance: {fiat}} as any);

describe('getUnchartedWallets', () => {
  it('lists wallets with a balance the chart did not draw, largest first', () => {
    const wallets = [
      wallet('btc', 50),
      wallet('sol', 110),
      wallet('link', 3),
      wallet('dust', 0.001),
    ];

    expect(
      getUnchartedWallets({
        wallets,
        chartedWalletIds: new Set(['btc']),
      }).map(w => w.id),
    ).toEqual(['sol', 'link']);
  });

  it('lists nothing while the charted set is unknown', () => {
    expect(getUnchartedWallets({wallets: [wallet('sol', 110)]})).toEqual([]);
  });
});

describe('getChartedWalletIds', () => {
  it('keeps wallets with any non-zero value', () => {
    expect(
      getChartedWalletIds({
        b: [0, 2],
        a: [1, 1],
        empty: [0, 0],
      }),
    ).toEqual(['a', 'b']);
  });

  it('is undefined without a per-wallet breakdown', () => {
    expect(getChartedWalletIds(undefined)).toBeUndefined();
  });
});
