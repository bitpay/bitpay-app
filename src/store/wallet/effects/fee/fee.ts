import {Network} from '../../../../constants';
import {FeeOptions, Wallet} from '../../wallet.models';
import {GetEstimatedTxSize} from '../../utils/wallet';
import {IsERCToken} from '../../utils/currency';
import {BwcProvider} from '../../../../lib/bwc';
import {Effect} from '../../..';
const BWC = BwcProvider.getInstance();
import {t} from 'i18next';

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

export const GetFeeOptions = (currencyAbbreviation: string): FeeOptions => {
  const isEthOrToken =
    currencyAbbreviation === 'eth' || IsERCToken(currencyAbbreviation);
  return {
    urgent: isEthOrToken ? t('High') : t('Urgent'),
    priority: isEthOrToken ? t('Average') : t('Priority'),
    normal: isEthOrToken ? t('Low') : t('Normal'),
    economy: t('Economy'),
    superEconomy: t('Super Economy'),
    custom: t('Custom'),
  };
};

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
    const {network} = wallet;
    try {
      // get fee levels
      const feeLevels = await getFeeLevels({
        wallet,
        network: network,
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
        wallet.chain,
        network,
        (err: Error, feeLevels: Fee[]) => {
          if (err) {
            return reject(err);
          }

          if (wallet.credentials.coin === 'eth' || !!wallet.credentials.token) {
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

export const GetMinFee = (
  wallet: Wallet,
  nbOutputs?: number,
  nbInputs?: number,
): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      const feePerKb = await getFeeRatePerKb({wallet, feeLevel: 'normal'});
      const lowLevelRate: string = (feePerKb / 1000).toFixed(0);
      const size = GetEstimatedTxSize(wallet, nbOutputs, nbInputs);
      return resolve(size * parseInt(lowLevelRate, 10));
    } catch (e) {
      return reject(e);
    }
  });
};

export const GetBitcoinSpeedUpTxFee = async (
  wallet: Wallet,
  txSize: number,
): Promise<number> => {
  const urgentFee = await getFeeRatePerKb({wallet, feeLevel: 'urgent'});
  // 250 bytes approx. is the minimum size of a tx with 1 input and 1 output
  const averageTxSize = 250;
  const fee = (urgentFee / 1000) * (txSize + averageTxSize);
  return Number(fee.toFixed());
};

export const getFeeLevelsUsingBwcClient = (
  currencyAbbreviation: string,
  network: string,
): Promise<Fee[]> => {
  return new Promise((resolve, reject) => {
    const bwcClient = BWC.getClient();
    bwcClient.getFeeLevels(
      currencyAbbreviation.toLowerCase(),
      network,
      (errLivenet: Error, feeLevels: Fee[]) => {
        if (errLivenet) {
          return reject(t('Could not get dynamic fee'));
        }

        if (currencyAbbreviation.toLowerCase() === 'eth') {
          feeLevels = removeLowFeeLevels(feeLevels);
        }

        return resolve(feeLevels);
      },
    );
  });
};
