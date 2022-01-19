import {WalletObj} from '../wallet.models';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';

export const buildWalletObj = ({
  walletId,
  walletName,
  coin,
  balance = 0,
  tokens,
}: Credentials & {balance?: number; tokens?: any}): WalletObj => {
  return {
    id: walletId,
    currencyName: walletName,
    currencyAbbreviation: coin,
    balance,
    tokens,
  };
};
