import {AssetObj} from '../wallet.models';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';

export const buildAssetObj = ({
  walletId,
  walletName,
  coin,
  balance = 0,
  tokens,
}: Credentials & {balance?: number; tokens?: any}): AssetObj => {
  return {
    id: walletId,
    assetName: walletName,
    assetAbbreviation: coin,
    balance,
    tokens,
  };
};
