import {Effect} from '../../../index';
import {
  Wallet,
  Rates,
  Key,
  WalletBalance,
  WalletStatus,
  Recipient,
} from '../../wallet.models';
import {
  failedUpdateAllKeysAndBalances,
  failedUpdateKeyTotalBalance,
  failedUpdateWalletBalance,
  setWalletRefreshing,
  successUpdateAllKeysAndBalances,
  successUpdateKeyTotalBalance,
  successUpdateWalletBalance,
  updatePortfolioBalance,
} from '../../wallet.actions';
import {
  findWalletById,
  formatCryptoAmount,
  isCacheKeyStale,
  toFiat,
} from '../../utils/wallet';
import {Network} from '../../../../constants';
import {BALANCE_CACHE_DURATION} from '../../../../constants/wallet';
import {DeviceEventEmitter} from 'react-native';
import {DeviceEmitterEvents} from '../../../../constants/device-emitter-events';

/*
 * post broadcasting of payment
 * poll for updated balance -> update balance for: wallet, key, portfolio and local recipient wallet if applicable
 * */
export const waitForTargetAmountAndUpdateWallet =
  ({
    key,
    wallet,
    targetAmount,
    recipient,
  }: {
    key: Key;
    wallet: Wallet;
    targetAmount: number;
    recipient: Recipient;
  }): Effect =>
  async (dispatch, getState) => {
    try {
      // set loading (for UI spinner on wallet details as well as keyOverview
      dispatch(
        setWalletRefreshing({
          keyId: key.id,
          walletId: wallet.id,
          isRefreshing: true,
        }),
      );

      let retry = 0;

      // wait for expected balance
      const interval = setInterval(() => {
        console.log('waiting for target balance', retry);
        retry++;

        if (retry > 5) {
          // balance not met - todo handle this
          dispatch(
            setWalletRefreshing({
              keyId: key.id,
              walletId: wallet.id,
              isRefreshing: false,
            }),
          );
          clearInterval(interval);
          return;
        }

        const {
          credentials: {token, multisigEthInfo},
        } = wallet;

        wallet.getStatus(
          {
            tokenAddress: token ? token.address : null,
            multisigContractAddress: multisigEthInfo
              ? multisigEthInfo.multisigContractAddress
              : null,
          },
          async (err: Error, status: WalletStatus) => {
            if (err) {
              console.error(err);
            }
            const {totalAmount} = status.balance;
            // expected amount - update balance
            if (totalAmount === targetAmount) {
              dispatch(startUpdateWalletBalance({key, wallet}));

              // update recipient balance if local
              const {walletId, keyId} = recipient;
              if (walletId && keyId) {
                const {
                  WALLET: {keys},
                } = getState();
                const recipientKey = keys[keyId];
                const recipientWallet = findWalletById(key.wallets, walletId);
                if (recipientKey && recipientWallet) {
                  await dispatch(
                    startUpdateWalletBalance({
                      key: recipientKey,
                      wallet: recipientWallet,
                    }),
                  );
                  console.log('updated recipient wallet');
                }
              }
              DeviceEventEmitter.emit(
                DeviceEmitterEvents.WALLET_UPDATE_COMPLETE,
              );
              await dispatch(updatePortfolioBalance());

              clearInterval(interval);
            }
          },
        );
      }, 5000);
    } catch (err) {
      console.error(err);
    }
  };

export const startUpdateWalletBalance =
  ({key, wallet}: {key: Key; wallet: Wallet}): Effect =>
  async (dispatch, getState) => {
    return new Promise<WalletBalance | void>(async (resolve, reject) => {
      if (!key || !wallet) {
        return reject();
      }

      try {
        const {
          WALLET: {rates, balanceCacheKey},
        } = getState();

        const {
          id,
          currencyAbbreviation,
          credentials: {network},
        } = wallet;

        if (!isCacheKeyStale(balanceCacheKey[id], BALANCE_CACHE_DURATION)) {
          console.log(`Wallet: ${id} - skipping balance update`);
          return resolve();
        }

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
        dispatch(
          failedUpdateWalletBalance({
            keyId: key.id,
            walletId: wallet.id,
          }),
        );
        reject(err);
      }
    });
  };

export const startUpdateAllWalletBalancesForKey =
  (key: Key): Effect =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const {
          WALLET: {rates, balanceCacheKey},
        } = getState();

        if (!isCacheKeyStale(balanceCacheKey[key.id], BALANCE_CACHE_DURATION)) {
          console.log(`Key: ${key.id} - skipping balance update`);
          return resolve();
        }

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
        const {
          WALLET: {keys, balanceCacheKey},
        } = getState();

        if (!isCacheKeyStale(balanceCacheKey.all, BALANCE_CACHE_DURATION)) {
          console.log('All: skipping balance update');
          return resolve();
        }

        await Promise.all(
          Object.values(keys).map(key => {
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
        twoStep: true,
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
            sat: totalAmount,
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
