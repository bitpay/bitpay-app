import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import ReactNativeBiometrics, {BiometryTypes} from 'react-native-biometrics';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {BaseText} from '../../../components/styled/Text';
import {useBackupColors} from '../../../components/backup/colors';
import {BiometricErrorNotification} from '../../../constants/BiometricError';
import {AppActions, AppEffects} from '../../../store/app';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {useAppDispatch, useLogger} from '../../../utils/hooks';
import {OnboardingGroupParamList, OnboardingScreens} from '../OnboardingGroup';
import {useTranslation} from 'react-i18next';
import LockArt from '../../../../assets/img/onboarding/lock.svg';

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 30,
  },
  art: {marginBottom: 14},
  title: {fontSize: 25, lineHeight: 34, fontWeight: '700', textAlign: 'center'},
  description: {fontSize: 16, lineHeight: 25, textAlign: 'center'},
  footer: {paddingHorizontal: 12, paddingTop: 12, gap: 4},
});

const PinScreen = ({
  navigation,
}: NativeStackScreenProps<OnboardingGroupParamList, OnboardingScreens.PIN>) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const colors = useBackupColors();
  const [biometryType, setBiometryType] = useState<string | null>();

  useEffect(() => {
    new ReactNativeBiometrics({allowDeviceCredentials: true})
      .isSensorAvailable()
      .then(({available, biometryType: type}) =>
        setBiometryType(available ? type || null : null),
      )
      .catch(() => setBiometryType(null));
  }, []);

  const onSetPinPress = () => {
    haptic('impactLight');
    dispatch(AppActions.showPinModal({type: 'set', context: 'onboarding'}));
  };

  const onSetBiometricPress = async () => {
    try {
      haptic('impactLight');
      const rnBiometrics = new ReactNativeBiometrics({
        allowDeviceCredentials: true,
      });
      const {available, biometryType: type} =
        await rnBiometrics.isSensorAvailable();
      if (type === BiometryTypes.FaceID) {
        await AppEffects.checkFaceIdPermissions();
      }
      if (available) {
        logger.debug(`[Biometrics] ${type} is supported`);
        dispatch(AppActions.biometricLockActive(true));
        dispatch(AppActions.setPinInteractionDone());
        navigation.navigate('TermsOfUse');
      } else {
        dispatch(
          showBottomNotificationModal(
            BiometricErrorNotification(
              t('Biometric method is not available on this device: {{type}}', {
                type,
              }),
            ),
          ),
        );
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error(`[Biometrics] failed with error: ${errMsg}`);
      dispatch(showBottomNotificationModal(BiometricErrorNotification(errMsg)));
    }
  };

  const enableLabel =
    biometryType === BiometryTypes.FaceID
      ? t('Enable Face ID')
      : biometryType === BiometryTypes.TouchID
      ? t('Enable Touch ID')
      : t('Enable Biometrics');

  return (
    <SafeAreaView
      edges={['bottom']}
      style={styles.container}
      testID="security-view">
      <ScrollView contentContainerStyle={styles.content}>
        <LockArt width={96} height={140} style={styles.art} />
        <BaseText accessibilityRole="header" style={styles.title}>
          {t('Protect your app')}
        </BaseText>
        <BaseText style={[styles.description, {color: colors.textDescription}]}>
          {t(
            'Use your face or fingerprint so only you can open BitPay and approve payments.',
          )}
        </BaseText>
      </ScrollView>
      <View style={styles.footer} testID="cta-container">
        {biometryType === null ? (
          <Button testID="pin-button" onPress={onSetPinPress}>
            {t('Set a PIN')}
          </Button>
        ) : (
          <>
            <Button
              testID="biometric-button"
              disabled={biometryType === undefined}
              onPress={onSetBiometricPress}>
              {enableLabel}
            </Button>
            <Button
              testID="pin-button"
              buttonType={'link'}
              onPress={onSetPinPress}>
              {t('Use a PIN Instead')}
            </Button>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default PinScreen;
