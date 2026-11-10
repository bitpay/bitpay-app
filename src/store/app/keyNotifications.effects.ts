import type {Effect} from '../index';
import {
  unSubscribeEmailNotifications,
  unSubscribePushNotifications,
} from './app.effects';

export const unsubscribeKeyNotifications =
  (keyId: string): Effect<void> =>
  (dispatch, getState) => {
    const {
      APP: {notificationsAccepted, emailNotifications, brazeEid},
      WALLET: {keys},
    } = getState();
    (keys[keyId]?.wallets || [])
      .filter(
        wallet =>
          !wallet.credentials.token &&
          wallet.credentials.isComplete() &&
          !wallet.pendingTssSession,
      )
      .forEach(walletClient => {
        if (notificationsAccepted && brazeEid) {
          dispatch(unSubscribePushNotifications(walletClient, brazeEid));
        }
        if (emailNotifications.accepted && emailNotifications.email) {
          dispatch(unSubscribeEmailNotifications(walletClient));
        }
      });
  };
