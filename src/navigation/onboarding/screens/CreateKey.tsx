import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useLayoutEffect, useRef} from 'react';
import {ScrollView} from 'react-native';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import styled from 'styled-components/native';
import {OnboardingImage} from '../components/Containers';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  ActionContainer,
  CtaContainer,
  HeaderRightContainer,
  ImageContainer,
  isNarrowHeight,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {OnboardingGroupParamList, OnboardingScreens} from '../OnboardingGroup';
import {useTranslation} from 'react-i18next';
import {
  useAppDispatch,
  useAppSelector,
  useRequestTrackingPermissionHandler,
} from '../../../utils/hooks';
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

const CreateKeyContainer = styled.SafeAreaView`
  flex: 1;
  align-items: stretch;
`;
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
  const dispatch = useAppDispatch();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const isImportLedgerModalVisible = useAppSelector(
    ({APP}) => APP.isImportLedgerModalVisible,
  );
  const {keys} = useAppSelector(({WALLET}) => WALLET);

  useAndroidBackHandler(() => true);

  const askForTrackingThenNavigate = useRequestTrackingPermissionHandler();

  const onSkipPressRef = useRef(() => {
    haptic('impactLight');
    askForTrackingThenNavigate(() => {
      navigation.navigate('TermsOfUse', {context: 'TOUOnly'});
    });
  });

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
  return (
    <CreateKeyContainer accessibilityLabel="create-key-view">
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
        }}>
        <ImageContainer>{KeyImage[themeType]}</ImageContainer>
        <TitleContainer>
          <TextAlign align={'center'}>
            <H3>{t('Create a key or import an existing key')}</H3>
          </TextAlign>
        </TitleContainer>
        <TextContainer>
          <TextAlign align={'center'}>
            <Paragraph>
              {t(
                "Store your assets safely and securely with BitPay's self-custody app.",
              )}
            </Paragraph>
          </TextAlign>
        </TextContainer>
        <CtaContainer accessibilityLabel="cta-container">
          <ActionContainer>
            <Button
              accessibilityLabel="create-a-key-button"
              buttonStyle={'primary'}
              onPress={async () => {
                try {
                  const context = 'onboarding';
                  showOngoingProcess('CREATING_KEY');
                  const createdKey = await dispatch(
                    startCreateKey(getBaseKeyCreationCoinsAndTokens(), 'onboarding'),
                  );

                  dispatch(
                    setHomeCarouselConfig({id: createdKey.id, show: true}),
                  );
                  hideOngoingProcess();
                  askForTrackingThenNavigate(() => {
                    dispatch(
                      Analytics.track('BitPay App - Clicked Create New Key', {context: 'onboarding'})
                    );
                    navigation.navigate('BackupKey', {
                      context,
                      key: createdKey,
                    });
                  });
                } catch (err: any) {
                  const errstring =
                    err instanceof Error ? err.message : JSON.stringify(err);
                  logManager.error(`Error creating key: ${errstring}`);
                  hideOngoingProcess();
                  await sleep(500);
                  showErrorModal(errstring);
                }
              }}>
              {t('Create a Key')}
            </Button>
          </ActionContainer>
          <ActionContainer>
            <Button
              accessibilityLabel="i-already-have-a-key-button"
              buttonStyle={'secondary'}
              onPress={() => {
                askForTrackingThenNavigate(() => {
                  dispatch(
                    Analytics.track('BitPay App - Clicked Import Key', {context: 'onboarding'})
                  );
                  navigation.navigate('Import', {
                    context: 'onboarding',
                  });
                });
              }}>
              {t('I already have a Key')}
            </Button>
          </ActionContainer>
          {/* <ActionContainer>
            <Button
              buttonStyle={'secondary'}
              onPress={() => {
                dispatch(AppActions.importLedgerModalToggled(true));
              }}>
              {t('Connect your Ledger Nano X')}
            </Button>
          </ActionContainer> */}
        </CtaContainer>
      </ScrollView>
    </CreateKeyContainer>
  );
};

export default CreateOrImportKey;
