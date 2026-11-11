import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {BaseText} from '../../../components/styled/Text';
import {useBackupColors} from '../../../components/backup/colors';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {OnboardingGroupParamList, OnboardingScreens} from '../OnboardingGroup';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {
  cancelOnboardingKeyCreation,
  startOnboardingKeyCreation,
} from '../../../store/app/onboardingKey.effects';
import {RestoreOrImportSheet} from '../../wallet/components/RestoreOrImportSheet';
import DropCrypto from '../../../../assets/img/onboarding/drop-crypto.svg';

type OnboardingStartScreenProps = NativeStackScreenProps<
  OnboardingGroupParamList,
  OnboardingScreens.ONBOARDING_START
>;

const styles = StyleSheet.create({
  container: {flex: 1, paddingHorizontal: 12, paddingBottom: 12},
  art: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artImage: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '100%',
    aspectRatio: 338 / 346,
  },
  copy: {gap: 10, paddingHorizontal: 12, paddingBottom: 30},
  title: {fontSize: 25, lineHeight: 34, fontWeight: '700', textAlign: 'center'},
  description: {fontSize: 16, lineHeight: 25, textAlign: 'center'},
  actions: {gap: 12},
});

const OnboardingStart = ({navigation}: OnboardingStartScreenProps) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const colors = useBackupColors();
  const onboardingKeyStatus = useAppSelector(
    ({APP}) => APP.onboardingKeyStatus,
  );
  const hasKeys = useAppSelector(
    ({WALLET}) => Object.keys(WALLET.keys).length > 0,
  );
  const [importSheetVisible, setImportSheetVisible] = useState(false);

  const preventAndroidBack = useCallback(() => true, []);
  useAndroidBackHandler(preventAndroidBack);

  const onCreateKeyPress = () => {
    haptic('impactLight');
    dispatch(
      Analytics.track('Clicked Create New Key', {context: 'onboarding'}),
    );
    if (
      onboardingKeyStatus === 'failed' ||
      (onboardingKeyStatus === 'idle' && !hasKeys)
    ) {
      dispatch(startOnboardingKeyCreation());
    }
    navigation.navigate('Pin');
  };

  const onImportPress = () => {
    haptic('impactLight');
    dispatch(Analytics.track('Clicked Import Key', {context: 'onboarding'}));
    dispatch(
      Analytics.track('Clicked I already have a Key', {context: 'onboarding'}),
    );
    dispatch(cancelOnboardingKeyCreation());
    setImportSheetVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} testID="onboarding-start-view">
      <View style={styles.art}>
        <View style={styles.artImage}>
          <DropCrypto width="100%" height="100%" />
        </View>
      </View>
      <View style={styles.copy}>
        <BaseText accessibilityRole="header" style={styles.title}>
          {t('Your crypto, your keys')}
        </BaseText>
        <BaseText style={[styles.description, {color: colors.textDescription}]}>
          {t(
            'Buy, swap and spend crypto in one app. Only you can get to your funds.',
          )}
        </BaseText>
      </View>
      <View style={styles.actions} testID="cta-container">
        <Button testID="create-a-key-button" onPress={onCreateKeyPress}>
          {t('Create a Key')}
        </Button>
        <Button
          testID="i-already-have-a-key-button"
          buttonStyle={'secondary'}
          onPress={onImportPress}>
          {t('I Already Have a Key')}
        </Button>
      </View>
      <RestoreOrImportSheet
        isVisible={importSheetVisible}
        onClose={() => setImportSheetVisible(false)}
        context={'onboarding'}
      />
    </SafeAreaView>
  );
};

export default OnboardingStart;
