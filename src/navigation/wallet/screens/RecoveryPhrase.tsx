import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
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
  WIDTH,
} from '../../../components/styled/Containers';
import * as Progress from 'react-native-progress';
import {Air, BitPay, ProgressBlue} from '../../../styles/colors';
import Carousel, {ICarouselInstance} from 'react-native-reanimated-carousel';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import {Platform, TouchableOpacity} from 'react-native';
import haptic from '../../../components/haptic-feedback/haptic';
import {useDispatch} from 'react-redux';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {Key} from '../../../store/wallet/wallet.models';
import {WalletStackParamList} from '../WalletStack';
import {backupRedirect} from './Backup';
import {StackScreenProps} from '@react-navigation/stack';
import {useAppSelector} from '../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import Back from '../../../components/back/Back';
import throttle from 'lodash.throttle';
import {IS_ANDROID} from '../../../constants';

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

const renderItem = ({item: word}: {item: string}) => {
  return (
    <WordContainer>
      <H2>{word}</H2>
    </WordContainer>
  );
};

const RecoveryPhrase: React.FC<RecoveryPhraseScreenProps> = ({route}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {params} = route;
  const walletTermsAccepted = useAppSelector(
    ({WALLET}) => WALLET.walletTermsAccepted,
  );
  const {words, context, key} = params;

  useAndroidBackHandler(() => true);
  const ref = useRef<ICarouselInstance>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const onPressHeaderBack = () => {
    if (!ref.current || ref.current.getCurrentIndex() === 0) {
      navigation.goBack();
    } else {
      ref.current?.prev();
    }
  };
  const onPressHeaderBackRef = useRef(onPressHeaderBack);
  onPressHeaderBackRef.current = onPressHeaderBack;

  const onPressHeaderCancel = () => {
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
  };
  const onPressHeaderCancelRef = useRef(onPressHeaderCancel);
  onPressHeaderCancelRef.current = onPressHeaderCancel;

  const headerTitle = useMemo(() => {
    return () => <HeaderTitle>{t('Recovery Phrase')}</HeaderTitle>;
  }, [t]);

  const headerLeft = useMemo(() => {
    return () => (
      <TouchableOpacity
        style={{marginLeft: IS_ANDROID ? 10 : 0}}
        activeOpacity={ActiveOpacity}
        onPress={onPressHeaderBackRef.current}>
        <Back opacity={1} />
      </TouchableOpacity>
    );
  }, []);

  const headerRight = useMemo(() => {
    return () => (
      <HeaderRightContainer>
        <Button
          accessibilityLabel="cancel-button"
          buttonType={'pill'}
          onPress={onPressHeaderCancelRef.current}>
          {t('Cancel')}
        </Button>
      </HeaderRightContainer>
    );
  }, [t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle,
      headerLeft,
      headerRight,
    });
  }, [navigation, headerTitle, headerLeft, headerRight]);

  const next = () => {
    if (activeSlideIndex === words.length - 1) {
      navigation.navigate(context === 'onboarding' ? 'Onboarding' : 'Wallet', {
        screen: 'VerifyPhrase',
        params: {...params, walletTermsAccepted},
      });
    } else {
      ref.current?.next();
    }
  };

  const throttleOnActiveSlideChange = useMemo(
    () =>
      throttle((index: number) => {
        setActiveSlideIndex(Math.round(index));
      }, 300),
    [],
  );

  return (
    <RecoveryPhraseContainer accessibilityLabel="recovery-phrase-view">
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
          loop={false}
          vertical={false}
          mode={'horizontal-stack'}
          modeConfig={{
            snapDirection: 'left',
            stackInterval: 25,
            scaleInterval: 0.08,
            showLength: 3,
          }}
          width={Math.round(WIDTH)}
          height={Math.round(WIDTH) / 2}
          autoPlay={false}
          data={words}
          ref={ref}
          scrollAnimationDuration={1000}
          enabled={false}
          onProgressChange={(_, index) => {
            if (Math.round(index) !== activeSlideIndex) {
              throttleOnActiveSlideChange(index);
            }
          }}
          renderItem={renderItem}
        />
        <CountTracker>
          <CountText>
            {activeSlideIndex + 1}/{words.length}
          </CountText>
        </CountTracker>
        <CtaContainer accessibilityLabel="cta-container">
          <Button
            accessibilityLabel="next-button"
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
