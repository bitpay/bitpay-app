import {Network} from '../../../../constants';
import {FeeOptions, Wallet} from '../../wallet.models';
import {GetEstimatedTxSize} from '../../utils/wallet';
import {BwcProvider} from '../../../../lib/bwc';
const BWC = BwcProvider.getInstance();
import {t} from 'i18next';
import {SUPPORTED_EVM_COINS} from '../../../../constants/currencies';

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

export const GetFeeOptions = (chain: string): FeeOptions => {
  const isEvmOrToken = SUPPORTED_EVM_COINS.includes(chain);
  return {
    urgent: isEvmOrToken ? t('High') : t('Urgent'),
    priority: isEvmOrToken ? t('Average') : t('Priority'),
    normal: isEvmOrToken ? t('Low') : t('Normal'),
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
  feeLevel: string | undefined;
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

          if (
            SUPPORTED_EVM_COINS.includes(wallet.credentials.coin) ||
            !!wallet.credentials.token
          ) {
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

        if (SUPPORTED_EVM_COINS.includes(currencyAbbreviation.toLowerCase())) {
          feeLevels = removeLowFeeLevels(feeLevels);
        }

        return resolve(feeLevels);
      },
    );
  });
};
