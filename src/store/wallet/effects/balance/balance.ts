import {Effect} from '../../../index';
import {Wallet, Balance, Rates, Key, WalletBalance} from '../../wallet.models';
import {startGetRates} from '../rates/rates';
import {
  failedUpdateAllKeysAndBalances,
  failedUpdateKeyTotalBalance,
  failedUpdateWalletBalance,
  successUpdateAllKeysAndBalances,
  successUpdateKeyTotalBalance,
  successUpdateWalletBalance,
} from '../../wallet.actions';
import {formatCryptoAmount, toFiat} from '../../utils/wallet';
import {Network} from '../../../../constants';

export const startUpdateWalletBalance =
  ({key, wallet}: {key: Key; wallet: Wallet}): Effect =>
  async (dispatch, getState) => {
    return new Promise<WalletBalance | void>(async (resolve, reject) => {
      if (!key || !wallet) {
        return reject();
      }

      try {
        const {
          id,
          currencyAbbreviation,
          credentials: {network},
        } = wallet;
        const rates = (await dispatch<any>(startGetRates())) as Rates;
        const lastKnownBalance = wallet.balance.fiat;
        const balance = await updateWalletBalance({wallet, rates});

        dispatch(
          successUpdateWalletBalance({
            keyId: key.id,
            walletId: id,
            balance,
          }),
        );
        // if balance has changed update key totalBalance
        if (network === Network.mainnet && balance.fiat !== lastKnownBalance) {
          const wallets = getState().WALLET.keys[key.id].wallets;

          const totalFiatBalance = wallets.reduce(
            (acc, {balance: {fiat}}) => acc + fiat,
            0,
          );

          dispatch(
            successUpdateKeyTotalBalance({
              keyId: key.id,
              totalBalance: totalFiatBalance,
            }),
          );
        }

        console.log(`Updated balance: ${currencyAbbreviation} ${id}`);
        resolve();
      } catch (err) {
        dispatch(failedUpdateWalletBalance());
        reject(err);
      }
    });
  };

export const startUpdateAllWalletBalancesForKey =
  (key: Key): Effect =>
  async dispatch => {
    return new Promise(async (resolve, reject) => {
      try {
        const rates = (await dispatch<any>(startGetRates())) as Rates;

        const balances = await Promise.all(
          key.wallets.map(wallet => updateWalletBalance({wallet, rates})),
        );

        const totalKeyFiatBalance = balances.reduce(
          (acc, {fiat}) => acc + fiat,
          0,
        );

        dispatch(
          successUpdateKeyTotalBalance({
            keyId: key.id,
            totalBalance: totalKeyFiatBalance,
          }),
        );

        resolve();
      } catch (err) {
        dispatch(failedUpdateKeyTotalBalance());
        reject(err);
      }
    });
  };

export const startUpdateAllKeyAndWalletBalances =
  (): Effect => async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const {WALLET} = getState();
        await Promise.all(
          Object.values(WALLET.keys).map(key =>
            dispatch(startUpdateAllWalletBalancesForKey(key)),
          ),
        );
        dispatch(successUpdateAllKeysAndBalances());
        resolve();
      } catch (err) {
        dispatch(failedUpdateAllKeysAndBalances());
        console.log(err);
        reject(err);
      }
    });
  };

const updateWalletBalance = ({
  wallet,
  rates,
}: {
  wallet: Wallet;
  rates: Rates;
}): Promise<WalletBalance> => {
  return new Promise(async (resolve, reject) => {
    const {currencyAbbreviation, balance: lastKnownBalance} = wallet;
    wallet.getBalance({}, (err: Error, balance: Balance) => {
      if (err) {
        return reject(err);
      }

      try {
        const {totalAmount} = balance;
        const newBalance = {
          crypto: formatCryptoAmount(balance.totalAmount, currencyAbbreviation),
          fiat: toFiat(totalAmount, 'USD', currencyAbbreviation, rates),
        };

        resolve(newBalance);
      } catch (err) {
        console.error(err);
        resolve(lastKnownBalance);
      }
    });
  });
};
