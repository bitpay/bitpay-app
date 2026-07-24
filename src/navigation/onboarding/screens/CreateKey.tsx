import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useLayoutEffect, useCallback} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import {useTheme} from '../../../contexts';
import {OnboardingImage} from '../components/Containers';
import {isNarrowHeight, WIDTH} from '../../../components/styled/Containers';
import {Action, SlateDark, Slate30, White} from '../../../styles/colors';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {OnboardingGroupParamList, OnboardingScreens} from '../OnboardingGroup';
import {useTranslation} from 'react-i18next';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {startCreateKey} from '../../../store/wallet/effects';
import {getBaseKeyCreationCoinsAndTokens} from '../../../constants/currencies';
import {
  setHomeCarouselConfig,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {sleep} from '../../../utils/helper-methods';
import {useOngoingProcess} from '../../../contexts';
import {logManager} from '../../../managers/LogManager';
import {Analytics} from '../../../store/analytics/analytics.effects';
const styles = StyleSheet.create({
  createKeyContainer: {
    flex: 1,
    alignItems: 'stretch',
  },
  imageContainer: {
    marginVertical: 10,
    marginHorizontal: 0,
    display: 'flex',
    justifyContent: 'center',
  },
  titleContainer: {
    width: WIDTH * 0.75,
  },
  titleText: {
    fontSize: 25,
    fontStyle: 'normal',
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center',
  },
  textContainer: {
    marginTop: 10,
    padding: 10,
    width: WIDTH * 0.9,
  },
  bodyText: {
    fontSize: 16,
    fontStyle: 'normal',
    lineHeight: 25,
    letterSpacing: 0,
    textAlign: 'center',
  },
  ctaContainer: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: 'stretch',
    flexDirection: 'column',
    marginTop: 30,
  },
  actionContainer: {
    marginVertical: 5,
    marginHorizontal: 0,
  },
  primaryButton: {
    height: 63,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Action,
    backgroundColor: Action,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '500',
    color: White,
  },
  secondaryButton: {
    height: 63,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Action,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '500',
  },
});

const KeyImage = {
  light: (
    <OnboardingImage
      style={{
        width: isNarrowHeight ? 142 : 212,
        height: isNarrowHeight ? 165 : 247,
      }}
      source={require('../../../../assets/img/onboarding/light/create-wallet.png')}
    />
  ),
  dark: (
    <OnboardingImage
      style={{
        width: isNarrowHeight ? 126 : 189,
        height: isNarrowHeight ? 165 : 247,
      }}
      source={require('../../../../assets/img/onboarding/dark/create-wallet.png')}
    />
  ),
};

const CreateOrImportKey = ({
  navigation,
}: NativeStackScreenProps<
  OnboardingGroupParamList,
  OnboardingScreens.CREATE_KEY
>) => {
  const {t} = useTranslation();
  const themeType = useThemeType();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const isImportLedgerModalVisible = useAppSelector(
    ({APP}) => APP.isImportLedgerModalVisible,
  );
  const keys = useAppSelector(({WALLET}) => WALLET.keys);

  useAndroidBackHandler(() => true);

  const showErrorModal = (e: string) => {
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: t('Something went wrong'),
        message: e,
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('OK'),
            action: () => {},
            primary: true,
          },
        ],
      }),
    );
  };

  const onCreateKeyPress = useCallback(async () => {
    try {
      const context = 'onboarding';

      showOngoingProcess('CREATING_KEY');
      await sleep(500);

      const createdKey = await dispatch(
        startCreateKey(getBaseKeyCreationCoinsAndTokens(), context),
      );

      dispatch(setHomeCarouselConfig({id: createdKey.id, show: true}));
      hideOngoingProcess();

      dispatch(Analytics.track('Clicked Create New Key', {context}));
      navigation.navigate('BackupKey', {
        context,
        key: createdKey,
      });
    } catch (err: any) {
      const errstring =
        err instanceof Error ? err.message : JSON.stringify(err);

      logManager.error(`Error creating key: ${errstring}`);
      hideOngoingProcess();
      await sleep(500);
      showErrorModal(errstring);
    }
  }, [
    dispatch,
    navigation,
    showOngoingProcess,
    hideOngoingProcess,
    showErrorModal,
  ]);

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerLeft: () => null,
    });
  }, [navigation, t]);

  useEffect(() => {
    if (!isImportLedgerModalVisible && Object.values(keys).length > 0) {
      navigation.navigate('TermsOfUse');
    }
  }, [isImportLedgerModalVisible]);

  const textColor = theme.colors.text;
  const bodyColor = theme.dark ? Slate30 : SlateDark;
  const secondaryTextColor = theme.dark ? theme.colors.text : Action;

  return (
    <SafeAreaView style={styles.createKeyContainer} testID="create-key-view">
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
        }}>
        <View style={styles.imageContainer}>{KeyImage[themeType]}</View>
        <View style={styles.titleContainer}>
          <Text style={[styles.titleText, {color: textColor}]}>
            {t('Create a key or import an existing key')}
          </Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.bodyText, {color: bodyColor}]}>
            {t(
              "Store your assets safely and securely with BitPay's self-custody app.",
            )}
          </Text>
        </View>
        <View testID="cta-container" style={styles.ctaContainer}>
          <View style={styles.actionContainer}>
            <TouchableOpacity
              testID="create-a-key-button"
              accessibilityLabel="Create a key"
              onPress={onCreateKeyPress}
              style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{t('Create a Key')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionContainer}>
            <TouchableOpacity
              testID="i-already-have-a-key-button"
              accessibilityLabel="I already have a key"
              onPress={() => {
                dispatch(
                  Analytics.track('Clicked Import Key', {
                    context: 'onboarding',
                  }),
                );
                dispatch(
                  Analytics.track('Clicked I already have a Key', {
                    context: 'onboarding',
                  }),
                );
                navigation.navigate('Import', {
                  context: 'onboarding',
                });
              }}
              style={styles.secondaryButton}>
              <Text
                style={[
                  styles.secondaryButtonText,
                  {color: secondaryTextColor},
                ]}>
                {t('I already have a Key')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateOrImportKey;
