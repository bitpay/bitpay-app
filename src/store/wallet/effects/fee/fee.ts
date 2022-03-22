import {Network} from '../../../../constants';
import {Wallet} from '../../wallet.models';
import {GetEstimatedTxSize} from '../../utils/wallet';

export enum FeeLevels {
  URGENT = 'urgent',
  PRIORITY = 'priority',
  NORMAL = 'normal',
  ECONOMY = 'economy',
  SUPER_ECONOMY = 'superEconomy',
}

export interface Fee {
  feePerKb: number;
  level: string;
  nbBlocks: number;
}

const removeLowFeeLevels = (feeLevels: Fee[]) => {
  const removeLevels = ['economy', 'superEconomy'];
  return feeLevels.filter(({level}) => !removeLevels.includes(level));
};

export const getFeeRatePerKb = ({
  wallet,
  feeLevel,
}: {
  wallet: Wallet;
  feeLevel: string;
}): Promise<number> => {
  return new Promise(async (resolve, reject) => {
    const {credentials} = wallet;
    try {
      // get fee levels
      const feeLevels = await getFeeLevels({
        wallet,
        network: credentials.network,
      });

      // find fee level based on setting
      const fee = feeLevels.find(_feeLevel => _feeLevel.level === feeLevel);

      if (!fee) {
        return reject();
      }

      resolve(fee.feePerKb);
    } catch (err) {
      reject(err);
    }
  });
};

export const getFeeLevels = ({
  wallet,
  network,
}: {
  wallet: Wallet;
  network: Network;
}): Promise<Fee[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      wallet.getFeeLevels(
        wallet.currencyAbbreviation.toUpperCase(),
        network,
        (err: Error, feeLevels: Fee[]) => {
          if (err) {
            return reject(err);
          }

          if (wallet.currencyAbbreviation === 'eth') {
            feeLevels = removeLowFeeLevels(feeLevels);
          }

          resolve(feeLevels);
        },
      );
    } catch (err) {
      reject(err);
    }
  });
};

export const GetMinFee = (wallet: Wallet, nbOutputs?: number): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      const feePerKb = await getFeeRatePerKb({wallet, feeLevel: 'normal'});
      const lowLevelRate: string = (feePerKb / 1000).toFixed(0);
      const size = GetEstimatedTxSize(wallet, nbOutputs);
      return resolve(size * parseInt(lowLevelRate, 10));
    } catch (e) {
      return reject(e);
    }
  });
};
