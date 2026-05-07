import type {WalletSummary} from '../types';

export function getAssetIdFromWallet(
  wallet: Pick<
    WalletSummary,
    'chain' | 'currencyAbbreviation' | 'tokenAddress'
  >,
): string {
  'worklet';

  const chain = (wallet.chain || '').toLowerCase();
  const coin = (wallet.currencyAbbreviation || '').toLowerCase();
  if (wallet.tokenAddress) {
    return `${chain}:${coin}:${wallet.tokenAddress.toLowerCase()}`;
  }
  return `${chain}:${coin}`;
}
