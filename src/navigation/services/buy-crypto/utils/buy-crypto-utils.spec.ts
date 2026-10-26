import {getLastPurchaseWalletIdForRequest} from './buy-crypto-utils';
import {LastPurchaseData} from '../../../../store/buy-crypto/buy-crypto.models';

const lastBtcPurchase: LastPurchaseData = {
  coin: 'btc',
  chain: 'btc',
  fiatAmount: 100,
  fiatCurrency: 'USD',
  date: 1760000000000,
  partner: 'moonpay',
  walletId: 'btc-wallet-id',
};

describe('getLastPurchaseWalletIdForRequest', () => {
  it('returns the last purchase wallet when no coin was requested', () => {
    expect(getLastPurchaseWalletIdForRequest(lastBtcPurchase)).toBe(
      'btc-wallet-id',
    );
  });

  it('returns undefined when there is no last purchase', () => {
    expect(getLastPurchaseWalletIdForRequest(undefined, 'xrp', 'xrp')).toBe(
      undefined,
    );
  });

  it('ignores the last purchase when a different coin was requested', () => {
    expect(
      getLastPurchaseWalletIdForRequest(lastBtcPurchase, 'xrp', 'xrp'),
    ).toBe(undefined);
  });

  it('reuses the last purchase when the same coin and chain were requested', () => {
    expect(
      getLastPurchaseWalletIdForRequest(lastBtcPurchase, 'btc', 'btc'),
    ).toBe('btc-wallet-id');
  });

  it('ignores the last purchase when the same coin was requested on another chain', () => {
    const lastUsdcPurchase = {
      ...lastBtcPurchase,
      coin: 'usdc',
      chain: 'eth',
      walletId: 'usdc-eth-wallet-id',
    };
    expect(
      getLastPurchaseWalletIdForRequest(lastUsdcPurchase, 'usdc', 'sol'),
    ).toBe(undefined);
  });

  it('reuses the last purchase when the requested coin has no chain', () => {
    expect(getLastPurchaseWalletIdForRequest(lastBtcPurchase, 'BTC')).toBe(
      'btc-wallet-id',
    );
  });
});
