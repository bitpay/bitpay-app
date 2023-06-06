import React, {useLayoutEffect, useState} from 'react';
import styled from 'styled-components/native';
import {
  BaseText,
  H2,
  HeaderTitle,
  Paragraph,
  TextAlign,
} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';
import {useNavigation} from '@react-navigation/native';
import {
  ActiveOpacity,
  CtaContainer,
  HeaderRightContainer,
} from '../../../components/styled/Containers';
import * as Progress from 'react-native-progress';
import {Air, BitPay, ProgressBlue} from '../../../styles/colors';
import {TouchableOpacity, View} from 'react-native';
import {useDispatch} from 'react-redux';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {Key} from '../../../store/wallet/wallet.models';
import {WalletStackParamList} from '../WalletStack';
import {backupRedirect} from './Backup';
import {StackScreenProps} from '@react-navigation/stack';
import {useAppSelector} from '../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import Back from '../../../components/back/Back';

type RecoveryPhraseScreenProps = StackScreenProps<
  WalletStackParamList,
  'RecoveryPhrase'
>;

export interface RecoveryPhraseParamList {
  keyId: string;
  words: string[];
  context: string;
  key: Key;
  walletTermsAccepted: boolean;
}

const RecoveryPhraseContainer = styled.View`
  flex: 1;
`;

export const ProgressBarContainer = styled.View`
  padding: 15px 0;
`;

export const BodyContainer = styled.ScrollView`
  margin-top: 50px;
`;

export const DirectionsContainer = styled.View`
  padding: 0 10px 10px 10px;
`;

export const WordContainer = styled.View`
  background: ${({theme: {dark}}) => (dark ? BitPay : Air)};
  justify-content: center;
  align-items: center;
  height: 200px;
  margin: 0 30px;
`;

export const CountTracker = styled.View`
  padding: 10px;
  width: 100%;
`;

export const CountText = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px;
  letter-spacing: 0.5px;
  text-align: center;
`;

const RecoveryPhrase: React.FC<RecoveryPhraseScreenProps> = ({route}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {params} = route;
  const walletTermsAccepted = useAppSelector(
    ({WALLET}) => WALLET.walletTermsAccepted,
  );
  const {words, context, key} = params;

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>{t('Recovery Phrase')}</HeaderTitle>,
      headerLeft: () => (
        <TouchableOpacity
          style={{marginLeft: 10}}
          activeOpacity={ActiveOpacity}
          onPress={() => {
            if (activeSlideIndex === 0) {
              navigation.goBack();
            } else {
              setActiveSlideIndex(activeSlideIndex - 1);
            }
          }}>
          <Back opacity={1} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            accessibilityLabel="cancel-button"
            buttonType={'pill'}
            onPress={() => {
              if (context === 'settings') {
                navigation.goBack();
                return;
              }

              dispatch(
                showBottomNotificationModal({
                  type: 'warning',
                  title: t("Don't risk losing your money"),
                  message: t(
                    'Your recovery key is composed of 12 randomly selected words. Take a couple of minutes to carefully write down each word in the order they appear.',
                  ),
                  enableBackdropDismiss: true,
                  actions: [
                    {
                      text: t("I'M SURE"),
                      action: () =>
                        backupRedirect({
                          context,
                          navigation,
                          walletTermsAccepted,
                          key,
                        }),
                      primary: true,
                    },
                  ],
                }),
              );
            }}>
            {t('Cancel')}
          </Button>
        </HeaderRightContainer>
      ),
    });
  });

  const next = () => {
    if (activeSlideIndex === words.length - 1) {
      navigation.navigate('Wallet', {
        screen: 'VerifyPhrase',
        params: {...params, walletTermsAccepted},
      });
    } else {
      setActiveSlideIndex(activeSlideIndex + 1);
    }
  };

  return (
    <RecoveryPhraseContainer accessibilityLabel="recovery-phrase-view">
      <ProgressBarContainer>
        <Progress.Bar
          progress={(activeSlideIndex + 1) / 12}
          width={null}
          color={ProgressBlue}
          unfilledColor={Air}
          borderColor={Air}
          borderWidth={0}
          borderRadius={0}
        />
      </ProgressBarContainer>

      <BodyContainer>
        <DirectionsContainer>
          <TextAlign align={'center'}>
            <Paragraph>{t('Write down each word.')}</Paragraph>
          </TextAlign>
        </DirectionsContainer>
        <View>
          <WordContainer>
            <H2>{words[activeSlideIndex]}</H2>
          </WordContainer>
        </View>
        <CountTracker>
          <CountText>
            {activeSlideIndex + 1}/{words.length}
          </CountText>
        </CountTracker>
        <CtaContainer accessibilityLabel="cta-container">
          <Button
            accessibilityLabel="next-button"
            buttonStyle={'primary'}
            onPress={next}>
            {t('Next')}
          </Button>
        </CtaContainer>
      </BodyContainer>
    </RecoveryPhraseContainer>
  );
};

export default RecoveryPhrase;
