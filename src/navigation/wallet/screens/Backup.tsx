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
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {OnboardingImage} from '../../onboarding/components/Containers';
import haptic from '../../../components/haptic-feedback/haptic';
import {showBottomNotificationModal} from '../../../store/app/app.actions';

const BackupContainer = styled.SafeAreaView`
  flex: 1;
  align-items: center;
`;

const BackupImage = {
  light: require('../../../../assets/img/onboarding/light/backup.png'),
  dark: require('../../../../assets/img/onboarding/dark/backup.png'),
};

const BackupScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

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
                      action: rootState => {
                        const key = Object.values(rootState.WALLET.keys)[0];
                        const {id, mnemonic} = key.properties;
                        navigation.navigate('Onboarding', {
                          screen: 'RecoveryPhrase',
                          params: {
                            keyId: id,
                            words: mnemonic.trim().split(' '),
                            isOnboarding: true,
                          },
                        });
                      },
                      primary: true,
                    },
                    {
                      text: 'LATER',
                      action: () =>
                        navigation.navigate('Onboarding', {
                          screen: 'TermsOfUse',
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
  });

  useAndroidBackHandler(() => true);
  const themeType = useThemeType();
  const keys = useSelector(({WALLET}: RootState) => WALLET.keys);
  const {id, mnemonic} = Object.values(keys)[0].properties;
  const gotoBackup = () =>
    navigation.navigate('Onboarding', {
      screen: 'RecoveryPhrase',
      params: {
        keyId: id,
        words: mnemonic.trim().split(' '),
        isOnboarding: true,
      },
    });

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
