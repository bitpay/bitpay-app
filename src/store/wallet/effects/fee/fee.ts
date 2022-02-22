import {Network} from '../../../../constants';
import {Wallet} from '../../wallet.models';

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
          resolve(feeLevels);
        },
      );
    } catch (err) {
      reject(err);
    }
  });
};
