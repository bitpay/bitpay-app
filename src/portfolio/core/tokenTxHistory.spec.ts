import {
  buildTokenWalletTxHistoryContextFromCredentials,
  normalizeTokenWalletTxHistoryPage,
  prepareTokenWalletTxHistoryRow,
} from './tokenTxHistory';

describe('tokenTxHistory', () => {
  it('filters token effects by contract and received wallet address', () => {
    const prepared = prepareTokenWalletTxHistoryRow({
      tx: {
        action: 'received',
        effects: [
          {
            contractAddress: '0xToken',
            to: '0xReceiver',
            amount: '1500000',
          },
          {
            contractAddress: '0xToken',
            to: '0xSomeoneElse',
            amount: '2500000',
          },
          {
            contractAddress: '0xOtherToken',
            to: '0xReceiver',
            amount: '999999',
          },
        ],
      } as any,
      context: {
        tokenAddress: '0xtoken',
        receiveAddress: '0xreceiver',
        chain: 'matic',
        currencyAbbreviation: 'usdc.e',
      },
    });

    expect(prepared?.effectAmountAtomic).toBe('1500000');
    expect(prepared?.tx.coin).toBe('usdc.e');
    expect(prepared?.tx.chain).toBe('matic');
    expect(prepared?.tx.effects).toEqual([
      {
        contractAddress: '0xToken',
        to: '0xReceiver',
        amount: '1500000',
      },
    ]);
  });

  it('keeps legacy token txs with empty effects arrays', () => {
    const page = normalizeTokenWalletTxHistoryPage({
      txs: [
        {
          action: 'received',
          amount: '42',
          effects: [],
        } as any,
      ],
      context: {
        tokenAddress: '0xToken',
        receiveAddress: '0xReceiver',
        chain: 'matic',
        currencyAbbreviation: 'usdc.e',
      },
    });

    expect(page).toEqual([
      {
        action: 'received',
        amount: '42',
        effects: [],
        coin: 'usdc.e',
        chain: 'matic',
      },
    ]);
  });

  it('builds token wallet history context from stored credentials', () => {
    expect(
      buildTokenWalletTxHistoryContextFromCredentials({
        chain: 'matic',
        coin: 'usdc.e',
        receiveAddress: '0xReceiver',
        token: {address: '0xToken', symbol: 'usdc.e'},
      } as any),
    ).toEqual({
      tokenAddress: '0xToken',
      receiveAddress: '0xReceiver',
      chain: 'matic',
      currencyAbbreviation: 'usdc.e',
    });
  });
});
