import React, {useEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import Banner from '../../../../components/banner/Banner';
import {AppActions, AppEffects} from '../../../../store/app';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {isTSSKey} from '../../../../store/wallet/effects/tss-send/tss-send';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import type {Effect} from '../../../../store';
import {ongoingProcessManager} from '../../../../managers/OngoingProcessManager';
import {isTransactMenuOpen} from '../../../../components/modal/transact-menu/TransactMenu';

export const BACKUP_NUDGE_DELAY_MS = 2500;

const isAnotherSurfaceOpen = (): Effect<boolean> => (_dispatch, getState) => {
  const {
    showBottomNotificationModal: bottomNotificationVisible,
    activeModalId,
    showPinModal,
    showBiometricModal,
    showKycGetVerifiedModal,
    showKeyMigrationFailureModal,
  } = getState().APP;
  return (
    bottomNotificationVisible ||
    !!activeModalId ||
    showPinModal ||
    showBiometricModal ||
    showKycGetVerifiedModal ||
    showKeyMigrationFailureModal ||
    ongoingProcessManager.getState().isVisible ||
    isTransactMenuOpen()
  );
};

const styles = StyleSheet.create({
  banner: {marginHorizontal: 12, marginTop: -10, marginBottom: 10},
});

const BackupBannerGate = ({active}: {active: boolean}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const onboardingKeyStatus = useAppSelector(
    ({APP}) => APP.onboardingKeyStatus,
  );
  const notificationsInteractionDone = useAppSelector(
    ({APP}) => APP.notificationsInteractionDone,
  );
  const backupNudgeShown = useAppSelector(({APP}) => APP.backupNudgeShown);
  const askingNotificationsRef = useRef(false);
  const nudgePendingRef = useRef(false);

  const keyReady =
    onboardingKeyStatus === 'idle' && Object.keys(keys).length > 0;
  const keyToBackUpId = Object.values(keys).find(
    key => !key.backupComplete && !key.isReadOnly && !isTSSKey(key),
  )?.id;

  useEffect(() => {
    if (
      !active ||
      !keyReady ||
      notificationsInteractionDone ||
      askingNotificationsRef.current
    ) {
      return;
    }
    askingNotificationsRef.current = true;
    AppEffects.requestNotificationsPermissions().then(accepted => {
      dispatch(AppActions.setNotificationsInteractionDone());
      dispatch(AppEffects.setNotifications(accepted));
      dispatch(
        Analytics.track(
          accepted
            ? 'Clicked Allow Notifications'
            : 'Clicked Deny Notifications',
          {context: 'onboarding'},
        ),
      );
    });
  }, [active, dispatch, keyReady, notificationsInteractionDone]);

  useEffect(() => {
    if (
      !keyReady ||
      !notificationsInteractionDone ||
      backupNudgeShown ||
      !keyToBackUpId
    ) {
      nudgePendingRef.current = false;
      return;
    }
    if (!active) {
      return;
    }
    nudgePendingRef.current = true;
    const timer = setTimeout(() => {
      nudgePendingRef.current = false;
      dispatch(AppActions.setBackupNudgeShown());
      if (dispatch(isAnotherSurfaceOpen())) {
        return;
      }
      dispatch(
        Analytics.track('Viewed Backup Prompt', {context: 'onboarding'}),
      );
      dispatch(
        showBottomNotificationModal({
          type: 'info',
          title: t('Back up your recovery phrase'),
          message: t(
            'If you lose this phone, it’s the only way to get your funds back. It only takes a minute.',
          ),
          enableBackdropDismiss: true,
          actions: [
            {
              text: t('Back Up Now'),
              action: () => {
                dispatch(
                  Analytics.track('Clicked Back Up Now', {
                    context: 'onboarding',
                  }),
                );
                navigation.navigate('BackupOnboarding', {
                  keyId: keyToBackUpId,
                });
              },
              primary: true,
            },
            {
              text: t('Not Now'),
              action: () =>
                dispatch(
                  Analytics.track('Dismissed Backup Prompt', {
                    context: 'onboarding',
                  }),
                ),
            },
          ],
        }),
      );
    }, BACKUP_NUDGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [
    active,
    backupNudgeShown,
    dispatch,
    keyReady,
    keyToBackUpId,
    navigation,
    notificationsInteractionDone,
    t,
  ]);

  useEffect(() => {
    if (!active && nudgePendingRef.current) {
      nudgePendingRef.current = false;
      dispatch(AppActions.setBackupNudgeShown());
    }
  }, [active, dispatch]);

  if (!backupNudgeShown || !keyToBackUpId) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Banner
        type={'info'}
        title={t('Back up your recovery phrase')}
        description={t('Needed before you can buy, send or receive.')}
        link={{
          text: t('Back Up Now'),
          onPress: () =>
            navigation.navigate('BackupOnboarding', {keyId: keyToBackUpId}),
        }}
      />
    </View>
  );
};

export default React.memo(BackupBannerGate);
