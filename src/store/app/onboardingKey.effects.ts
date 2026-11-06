import NetInfo from '@react-native-community/netinfo';
import {t} from 'i18next';
import type {Effect} from '../index';
import type {OnboardingKeyStatus} from './app.models';
import {
  setHomeCarouselConfig,
  setOnboardingKeyStatus,
  showBottomNotificationModal,
} from './app.actions';
import {startCreateKey} from '../wallet/effects/create/create';
import {deleteKey} from '../wallet/wallet.actions';
import {getBaseKeyCreationCoinsAndTokens} from '../../constants/currencies';
import {logManager} from '../../managers/LogManager';
import {showTopToast} from '../../components/backup/TopToast';
import {unsubscribeKeyNotifications} from './keyNotifications.effects';

let currentRequest = 0;
let createdKeyId: string | undefined;
let releaseConnectionWait = () => {};

const waitForConnection = async () => {
  let unsubscribe = () => {};
  await new Promise<void>(resolve => {
    releaseConnectionWait = resolve;
    unsubscribe = NetInfo.addEventListener(({isConnected}) => {
      if (isConnected !== false) {
        resolve();
      }
    });
  });
  unsubscribe();
};

const supersedePendingRequest = (status: OnboardingKeyStatus) => {
  currentRequest++;
  releaseConnectionWait();
  if (status === 'waiting') {
    showTopToast(null);
  }
};

const waitForDeferredSubscriptions = () =>
  new Promise(resolve => setTimeout(resolve, 0));

export const startOnboardingKeyCreation =
  (): Effect<Promise<void>> => async (dispatch, getState) => {
    supersedePendingRequest(getState().APP.onboardingKeyStatus);
    const request = currentRequest;
    createdKeyId = undefined;
    dispatch(setOnboardingKeyStatus('creating'));
    try {
      const {isConnected} = await NetInfo.fetch();
      if (request !== currentRequest) {
        return;
      }
      if (isConnected === false) {
        dispatch(setOnboardingKeyStatus('waiting'));
        showTopToast({
          text: t('Waiting for a connection to finish setting up your key'),
          kind: 'offline',
        });
        await waitForConnection();
        if (request !== currentRequest) {
          return;
        }
        showTopToast(null);
        dispatch(setOnboardingKeyStatus('creating'));
      }
      const key = await dispatch(
        startCreateKey(getBaseKeyCreationCoinsAndTokens(), 'onboarding'),
      );
      if (request !== currentRequest) {
        await waitForDeferredSubscriptions();
        dispatch(unsubscribeKeyNotifications(key.id));
        dispatch(deleteKey({keyId: key.id}));
        return;
      }
      createdKeyId = key.id;
      dispatch(setHomeCarouselConfig({id: key.id, show: true}));
      dispatch(setOnboardingKeyStatus('idle'));
    } catch (err) {
      if (request !== currentRequest) {
        return;
      }
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.error(`Error creating key: ${errMsg}`);
      dispatch(setOnboardingKeyStatus('failed'));
      dispatch(
        showBottomNotificationModal({
          type: 'warning',
          title: t('Something went wrong'),
          message: t(
            'We couldn’t finish setting up your key. Check your connection and try again.',
          ),
          enableBackdropDismiss: false,
          actions: [
            {
              text: t('Try Again'),
              action: () => dispatch(startOnboardingKeyCreation()),
              primary: true,
            },
            {
              text: t('Not Now'),
              action: () => {},
            },
          ],
        }),
      );
    }
  };

export const cancelOnboardingKeyCreation =
  (): Effect<void> => (dispatch, getState) => {
    const {
      APP: {onboardingKeyStatus, homeCarouselConfig},
      WALLET: {keys},
    } = getState();
    supersedePendingRequest(onboardingKeyStatus);
    if (onboardingKeyStatus !== 'idle') {
      dispatch(setOnboardingKeyStatus('idle'));
    }
    if (createdKeyId && keys[createdKeyId]) {
      const keyId = createdKeyId;
      dispatch(unsubscribeKeyNotifications(keyId));
      dispatch(deleteKey({keyId}));
      dispatch(
        setHomeCarouselConfig(
          (homeCarouselConfig || []).filter(item => item.id !== keyId),
        ),
      );
    }
    createdKeyId = undefined;
  };

export const isOnboardingKeyPending = (status: OnboardingKeyStatus) =>
  status === 'creating' || status === 'waiting';

export const showOnboardingKeyPendingToast = () =>
  showTopToast({
    text: t('Still setting up your key…'),
    kind: 'busy',
    durationMs: 1800,
  });
