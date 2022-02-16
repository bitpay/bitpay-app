import {Effect} from '../../../index';
import {
  Wallet,
  Rates,
  Key,
  WalletBalance,
  WalletStatus,
} from '../../wallet.models';
import {startGetRates} from '../rates/rates';
import {
  failedUpdateAllKeysAndBalances,
  failedUpdateKeyTotalBalance,
  failedUpdateWalletBalance,
  successUpdateAllKeysAndBalances,
  successUpdateKeyTotalBalance,
  successUpdateWalletBalance,
} from '../../wallet.actions';
import {formatCryptoAmount, isCacheKeyStale, toFiat} from '../../utils/wallet';
import {Network} from '../../../../constants';
import {BALANCE_CACHE_DURATION} from '../../../../constants/wallet';

export const startUpdateWalletBalance =
  ({key, wallet}: {key: Key; wallet: Wallet}): Effect =>
  async (dispatch, getState) => {
    return new Promise<WalletBalance | void>(async (resolve, reject) => {
      if (!key || !wallet) {
        return reject();
      }

      try {
        const {WALLET} = getState();

        const {
          id,
          currencyAbbreviation,
          credentials: {network},
        } = wallet;

        if (
          !isCacheKeyStale(WALLET.balanceCacheKey[id], BALANCE_CACHE_DURATION)
        ) {
          console.log(`Wallet: ${id} - skipping balance update`);
          return resolve();
        }

        const rates = await dispatch<Promise<Rates>>(startGetRates());
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
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const {WALLET} = getState();

        if (
          !isCacheKeyStale(
            WALLET.balanceCacheKey[key.id],
            BALANCE_CACHE_DURATION,
          )
        ) {
          console.log(`Key: ${key.id} - skipping balance update`);
          return resolve();
        }
        const rates = await dispatch<Promise<Rates>>(startGetRates());

        const balances = await Promise.all(
          key.wallets.map(async wallet => {
            return new Promise<WalletBalance>(async resolve2 => {

              const balance = await updateWalletBalance({wallet, rates});
              dispatch(
                successUpdateWalletBalance({
                  keyId: key.id,
                  walletId: wallet.id,
                  balance,
                }),
              );
              console.log(
                `Wallet: ${wallet.currencyAbbreviation} ${wallet.id} - balance updated`,
              );
              resolve2(balance);
            });
          }),
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

        if (
          !isCacheKeyStale(WALLET.balanceCacheKey.all, BALANCE_CACHE_DURATION)
        ) {
          console.log('All: skipping balance update');
          return resolve();
        }

        await Promise.all(
          Object.values(WALLET.keys).map(key => {
            dispatch(startUpdateAllWalletBalancesForKey(key));
          }),
        );
        dispatch(successUpdateAllKeysAndBalances());
        resolve();
      } catch (err) {
        dispatch(failedUpdateAllKeysAndBalances());
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
  return new Promise(async resolve => {
    const {
      currencyAbbreviation,
      balance: lastKnownBalance,
      credentials: {network, token, multisigEthInfo},
    } = wallet;

    wallet.getStatus(
      {
        tokenAddress: token ? token.address : null,
        multisigContractAddress: multisigEthInfo
          ? multisigEthInfo.multisigContractAddress
          : null,
      },
      (err: Error, status: WalletStatus) => {
        if (err) {
          return resolve(lastKnownBalance);
        }
        try {
          const {totalAmount} = status.balance;

          const newBalance = {
            crypto: formatCryptoAmount(totalAmount, currencyAbbreviation),
            fiat:
              network === Network.mainnet
                ? toFiat(totalAmount, 'USD', currencyAbbreviation, rates)
                : 0,
          };

          console.log(newBalance);

          resolve(newBalance);
        } catch (err2) {
          resolve(lastKnownBalance);
        }
      },
    );
  });
};
