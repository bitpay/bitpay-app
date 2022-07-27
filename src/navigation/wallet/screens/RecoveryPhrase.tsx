import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
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
  CtaContainer,
  HeaderRightContainer,
  WIDTH,
} from '../../../components/styled/Containers';
import * as Progress from 'react-native-progress';
import {Air, BitPay, ProgressBlue} from '../../../styles/colors';
import Carousel from 'react-native-snap-carousel';
import {sleep} from '../../../utils/helper-methods';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import {Platform} from 'react-native';
import haptic from '../../../components/haptic-feedback/haptic';
import {useDispatch} from 'react-redux';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {Key} from '../../../store/wallet/wallet.models';
import {WalletStackParamList} from '../WalletStack';
import {backupRedirect} from './Backup';
import {StackScreenProps} from '@react-navigation/stack';
import {useAppSelector} from '../../../utils/hooks';
import {useTranslation} from 'react-i18next';

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

const RecoveryPhraseContainer = styled.ScrollView`
  flex: 1;
`;

export const ProgressBarContainer = styled.View`
  padding: 15px 0;
`;

export const BodyContainer = styled.View`
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

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>{t('Recovery Phrase')}</HeaderTitle>,
      headerLeft: () => null,
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            buttonType={'pill'}
            onPress={() => {
              haptic('impactLight');

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

  useAndroidBackHandler(() => true);
  const ref = useRef(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    return navigation.addListener('blur', async () => {
      await sleep(400);
      setActiveSlideIndex(0);
      // @ts-ignore
      ref.current.snapToItem(0);
    });
  }, [navigation]);

  const next = () => {
    if (activeSlideIndex === words.length - 1) {
      navigation.navigate(context === 'onboarding' ? 'Onboarding' : 'Wallet', {
        screen: 'VerifyPhrase',
        params: {...params, walletTermsAccepted},
      });
    } else {
      // @ts-ignore
      ref.current.snapToNext();
    }
  };

  return (
    <RecoveryPhraseContainer>
      <ProgressBarContainer>
        <Progress.Bar
          progress={0.3}
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
        <Carousel
          vertical={false}
          layout={'stack'}
          layoutCardOffset={words.length}
          useExperimentalSnap={true}
          data={words}
          renderItem={({item: word}: {item: string}) => {
            return (
              <WordContainer>
                <H2>{word}</H2>
              </WordContainer>
            );
          }}
          ref={ref}
          sliderWidth={WIDTH}
          itemWidth={Math.round(WIDTH)}
          onScrollIndexChanged={(index: number) => {
            setActiveSlideIndex(index);
          }}
          scrollEnabled={false}
          // @ts-ignore
          disableIntervalMomentum={true}
        />
        <CountTracker>
          <CountText>
            {activeSlideIndex + 1}/{words.length}
          </CountText>
        </CountTracker>
        <CtaContainer>
          <Button
            buttonStyle={'primary'}
            debounceTime={Platform.OS === 'android' ? 200 : 0}
            onPress={next}>
            {t('Next')}
          </Button>
        </CtaContainer>
      </BodyContainer>
    </RecoveryPhraseContainer>
  );
};

export default RecoveryPhrase;
