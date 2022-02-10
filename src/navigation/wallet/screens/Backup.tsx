import React, {useLayoutEffect} from 'react';
import styled from 'styled-components/native';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {
  CtaContainer,
  HeaderRightContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import {useDispatch, useSelector} from 'react-redux';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {OnboardingImage} from '../../onboarding/components/Containers';
import haptic from '../../../components/haptic-feedback/haptic';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {WalletStackParamList} from '../WalletStack';
import {Key} from '../../../store/wallet/wallet.models';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {StackActions} from '@react-navigation/native';
import {RootState} from '../../../store';
import {StackScreenProps} from '@react-navigation/stack';
const BackupImage = {
  light: require('../../../../assets/img/onboarding/light/backup.png'),
  dark: require('../../../../assets/img/onboarding/dark/backup.png'),
};

type BackupScreenProps = StackScreenProps<WalletStackParamList, 'BackupKey'>;

export type BackupParamList = {
  context: 'onboarding' | 'createNewKey';
  key: Key;
};

const BackupContainer = styled.SafeAreaView`
  flex: 1;
  align-items: center;
`;

export const navigateToTermsOrOverview = ({
  context,
  navigation,
  walletTermsAccepted,
  key,
}: {
  context: string | undefined;
  navigation: NavigationProp<any>;
  walletTermsAccepted: boolean;
  key?: Key;
}) => {
  if (context === 'onboarding') {
    navigation.navigate('Onboarding', {
      screen: 'TermsOfUse',
    });
  } else if (context === 'home') {
    navigation.navigate('Tabs', {screen: 'Home'});
  } else if (context === 'keySettings') {
    navigation.dispatch(
      StackActions.replace('Wallet', {
        screen: 'KeySettings',
        params: {key},
      }),
    );
  } else if (!walletTermsAccepted) {
    navigation.navigate('Wallet', {
      screen: 'TermsOfUse',
      params: {key},
    });
  } else {
    navigation.dispatch(
      StackActions.replace('Wallet', {
        screen: 'KeyOverview',
        params: {key},
      }),
    );
  }
};

const BackupScreen: React.FC<BackupScreenProps> = ({route}) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const walletTermsAccepted = useSelector(
    ({WALLET}: RootState) => WALLET.walletTermsAccepted,
  );

  const {context, key} = route.params;

  const gotoBackup = () => {
    const {id, mnemonic} = key.properties;
    navigation.navigate(context === 'onboarding' ? 'Onboarding' : 'Wallet', {
      screen: 'RecoveryPhrase',
      params: {
        keyId: id,
        words: mnemonic.trim().split(' '),
        walletTermsAccepted,
        ...route.params,
      },
    });
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerLeft: () => null,
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            buttonType={'pill'}
            onPress={async () => {
              haptic('impactLight');
              dispatch(
                showBottomNotificationModal({
                  type: 'warning',
                  title: 'Are you sure?',
                  message:
                    'You will not be able to add funds to your wallet until you backup your recovery phrase.',
                  enableBackdropDismiss: true,
                  actions: [
                    {
                      text: 'BACKUP YOUR KEY',
                      action: gotoBackup,
                      primary: true,
                    },
                    {
                      text: 'LATER',
                      action: () =>
                        navigateToTermsOrOverview({
                          context,
                          navigation,
                          walletTermsAccepted,
                          key,
                        }),
                    },
                  ],
                }),
              );
            }}>
            Skip
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation]);

  useAndroidBackHandler(() => true);
  const themeType = useThemeType();

  return (
    <BackupContainer>
      <OnboardingImage source={BackupImage[themeType]} />
      <TitleContainer>
        <TextAlign align={'center'}>
          <H3>Would you like to backup your key?</H3>
        </TextAlign>
      </TitleContainer>
      <TextContainer>
        <TextAlign align={'center'}>
          <Paragraph>
            If you delete the BitPay app or lose your device, you'll need your
            recovery phrase regain access to your funds.
          </Paragraph>
        </TextAlign>
      </TextContainer>
      <CtaContainer>
        <Button buttonStyle={'primary'} onPress={gotoBackup}>
          Backup your Recovery Phrase
        </Button>
      </CtaContainer>
    </BackupContainer>
  );
};

export default BackupScreen;
