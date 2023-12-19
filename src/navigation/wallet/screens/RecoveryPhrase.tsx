import React, {useLayoutEffect, useMemo, useRef} from 'react';
import styled from 'styled-components/native';
import {
  BaseText,
  HeaderTitle,
  HeaderSubtitle,
  Paragraph,
} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';
import {useNavigation} from '@react-navigation/native';
import {
  ActiveOpacity,
  CtaContainerAbsolute,
} from '../../../components/styled/Containers';
import {
  Caution,
  Caution25,
  Caution60,
  Grey,
  LightBlack,
  Slate,
  SlateDark,
} from '../../../styles/colors';
import {Platform, TouchableOpacity} from 'react-native';
import haptic from '../../../components/haptic-feedback/haptic';
import {useDispatch} from 'react-redux';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {Key} from '../../../store/wallet/wallet.models';
import {WalletStackParamList} from '../WalletStack';
import {backupRedirect} from './Backup';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAppSelector} from '../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import Back from '../../../components/back/Back';
import {IS_ANDROID} from '../../../constants';

type RecoveryPhraseScreenProps = NativeStackScreenProps<
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

const RecoveryPhraseContainer = styled.SafeAreaView`
  flex: 1;
`;

const RecoveryContainer = styled.ScrollView`
  padding: 20px 15px;
`;

const WordPairContainer = styled.View`
  margin: 30px 15px 15px 20px;
`;

const WordPairLine = styled.View`
  flex-direction: row;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom-color: ${({theme}) => (theme.dark ? SlateDark : Grey)};
  border-bottom-width: 1px;
`;

const WordPairColumn = styled.View`
  flex: 1;
  flex-direction: row;
  line-height: 24px;
  letter-spacing: 0.5px;
`;

const WordText = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
`;

const WordTextIndex = styled(BaseText)`
  margin-right: 20px;
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? SlateDark : Slate)};
`;

const WarningMessageContainer = styled.View`
  flex-direction: column;
  align-items: center;
  background-color: ${({theme: {dark}}) => (dark ? Caution25 : Caution25)};
  border-radius: 8px;
  padding: 10px;
  width: 100%;
`;

const WarningMessageTitleContainer = styled.View`
  flex-direction: row;
  align-items: center;
`;

const WarningMessageDescContainer = styled.View`
  flex: 1;
  margin-top: 5px;
`;

const WarningMessageTextContainer = styled.View`
  flex: 1;
  margin-top: 5px;
`;

const WarningMessageTitle = styled(HeaderSubtitle)`
  color: ${({theme: {dark}}) => (dark ? Caution : Caution60)};
`;

const WarningMessageText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? Caution60 : Caution)};
`;

const ParagraphRecovery = styled(Paragraph)`
  color: ${({theme: {dark}}) => (dark ? SlateDark : LightBlack)};
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

  const renderWordPairs = () => {
    const wordPairs = [];

    for (let i = 0; i < words.length - 6; i++) {
      const word1 = words[i];
      const word2 = words[i + 6];

      const pair = (
        <WordPairLine key={i}>
          <WordPairColumn>
            <WordTextIndex>{i + 1}.</WordTextIndex>
            <WordText>{word1}</WordText>
          </WordPairColumn>
          <WordPairColumn>
            <WordTextIndex>{i + 7}.</WordTextIndex>
            <WordText>{word2}</WordText>
          </WordPairColumn>
        </WordPairLine>
      );

      wordPairs.push(pair);
    }

    return wordPairs;
  };

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
        onPress={onPressHeaderCancelRef.current}>
        <Back opacity={1} />
      </TouchableOpacity>
    );
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle,
      headerLeft,
    });
  }, [navigation, headerTitle, headerLeft]);

  const next = () => {
    navigation.navigate(context === 'onboarding' ? 'Onboarding' : 'Wallet', {
      screen: 'VerifyPhrase',
      params: {...params, walletTermsAccepted},
    });
  };

  return (
    <RecoveryPhraseContainer accessibilityLabel="recovery-phrase-view">
      <RecoveryContainer>
        <WarningMessageContainer>
          <WarningMessageTitleContainer>
            <WarningMessageTitle>{t('CONFIDENTIAL')}</WarningMessageTitle>
          </WarningMessageTitleContainer>
          <WarningMessageDescContainer>
            <ParagraphRecovery>
              {t('Your 12-word recovery phrase')}
            </ParagraphRecovery>
          </WarningMessageDescContainer>
          <WarningMessageTextContainer>
            <WarningMessageText>
              {t('Store Securely - Never share')}
            </WarningMessageText>
          </WarningMessageTextContainer>
        </WarningMessageContainer>

        <WordPairContainer>{renderWordPairs()}</WordPairContainer>
      </RecoveryContainer>
      <CtaContainerAbsolute accessibilityLabel="cta-container">
        <Button
          accessibilityLabel="next-button"
          buttonStyle={'primary'}
          debounceTime={Platform.OS === 'android' ? 200 : 0}
          onPress={next}>
          {t('Verify')}
        </Button>
      </CtaContainerAbsolute>
    </RecoveryPhraseContainer>
  );
};

export default RecoveryPhrase;
