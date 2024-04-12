import {getFeeRatePerKb} from '../../../store/wallet/effects/fee/fee';
import {getSendMaxInfo} from '../../../store/wallet/effects/send/send';
import {SendMaxInfo, Wallet} from '../../../store/wallet/wallet.models';

export const getSendMaxData = (
  wallet: Wallet,
): Promise<SendMaxInfo | undefined> => {
  return new Promise(async (resolve, reject) => {
    if (!wallet) {
      return resolve(undefined);
    }
    try {
      const feeLevel = ['btc', 'eth', 'matic'].includes(wallet.chain)
        ? 'priority'
        : 'normal';

      const feeRate = await getFeeRatePerKb({
        wallet,
        feeLevel,
      });

      const res = await getSendMaxInfo({
        wallet: wallet,
        opts: {
          feePerKb: feeRate,
          excludeUnconfirmedUtxos: true, // Do not use unconfirmed UTXOs
          returnInputs: true,
        },
      });
      return resolve(res);
    } catch (err) {
      return reject(err);
    }
  });
};
