import React, {useState} from 'react';
import styled, {useTheme} from 'styled-components/native';
import {
  ScreenGutter,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {H4, Link, Paragraph} from '../../../../../components/styled/Text';
import {LightBlack, SlateDark, White} from '../../../../../styles/colors';
import AngleRight from '../../../../../../assets/img/angle-right.svg';
import LinkSvg from '../../../../../../assets/img/link.svg';
import Bug from '../../../../../../assets/img/settings/feedback/bug.svg';
import Start from '../../../../../../assets/img/settings/feedback/star.svg';
import Feature from '../../../../../../assets/img/settings/feedback/feature.svg';
import ShareSvg from '../../../../../../assets/img/settings/feedback/share.svg';
import HearFace from '../../../../../../assets/img/settings/feedback/heart-face.svg';
import Smile from '../../../../../../assets/img/settings/feedback/smile.svg';
import Speechless from '../../../../../../assets/img/settings/feedback/speechless.svg';
import {
  openUrlWithInAppBrowser,
  saveUserFeedback,
  shareApp,
} from '../../../../../store/app/app.effects';
import {URL} from '../../../../../constants';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {BoxShadow} from '../../../home/components/Styled';
import Rate, {AndroidMarket} from 'react-native-rate';
import {useTranslation} from 'react-i18next';
import {APP_VERSION} from '../../../../../constants/config';

const SendFeedbackContainer = styled.SafeAreaView`
  flex: 1;
  margin: 20px ${ScreenGutter};
`;

const SendFeedbackEmoji = styled.View`
  display: flex;
  flex-direction: row;
  align-self: flex-end;
  margin-bottom: -25px;
`;

const SendFeedbackTitle = styled(H4)`
  margin-bottom: 10px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const SendFeedbackParagraph = styled(Paragraph)`
  margin-bottom: 30px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const EmojisContainer = styled.View`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 25px 16px 25px 16px;
  gap: 32px;
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  box-shadow: 0px 1px 9px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
`;

const EmojiActionContainer = styled.View`
  width: 100%;
  padding: 0 45px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

const EmojiAction = styled.TouchableOpacity`
  width: 44px;
  height: 44px;
`;

const ConfirmRate = styled.TouchableOpacity`
  width: 100%;
  display: flex;
  margin-top: 32px;
  padding-top: 16px;
  border-top-width: 1px;
  border-top-color: ${({theme: {dark}}) => (dark ? White : '#EBEBEB')};
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
`;

const ConfirmRateTitle = styled(Link)`
  text-align: left;
  font-size: 16px;
`;

const ListItem = styled(Setting)`
  margin-bottom: 20px;
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-radius: 12px;
  padding: 5px 20px;
`;

const LeftIconContainer = styled.View`
  margin-right: 10px;
`;

export type FeedbackRateType = 'love' | 'ok' | 'disappointed' | 'default';

const SendFeedback = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const userFeedback = useAppSelector(({APP}) => APP.userFeedback);
  const [showEmojis, setShowEmojis] = useState(false);
  const [preRate, setPreRate] = useState<FeedbackRateType>(
    userFeedback?.rate || 'default',
  );
  const [rateApp, setRateApp] = useState<FeedbackRateType>(
    userFeedback?.rate || 'default',
  );
  const feedbackList = [
    {
      key: 1,
      onPress: () => {
        const options = {
          AppleAppID: '1149581638',
          GooglePackageName: 'com.bitpay.wallet',
          preferredAndroidMarket: AndroidMarket.Google,
          preferInApp: false,
          openAppStoreIfInAppFails: true,
        };

        Rate.rate(options, (success, errorMessage) => {
          if (success) {
            // this technically only tells us if the user successfully went to the Review Page. Whether they actually did anything, we do not know.
          }
          if (errorMessage) {
            // errorMessage comes from the native code. Useful for debugging, but probably not for users to view
            console.log(`Error Rating App: ${errorMessage}`);
          }
        });
      },
      description: t('Write a Review'),
      leftIcon: <Start width={20} height={20} />,
      rightIcon: <AngleRight />,
      showOn: ['love'],
    },
    {
      key: 2,
      onPress: () => dispatch(shareApp()),
      description: t('Share with Friends'),
      leftIcon: <ShareSvg width={20} height={20} />,
      rightIcon: <AngleRight />,
      showOn: ['love'],
    },
    {
      key: 3,
      onPress: () => dispatch(openUrlWithInAppBrowser(URL.LEAVE_FEEDBACK)),
      description: t('Leave Feedback'),
      leftIcon: <Feature width={20} height={20} />,
      rightIcon: <AngleRight />,
      showOn: ['ok', 'disappointed', 'default'],
    },
    {
      key: 4,
      onPress: () => {
        dispatch(openUrlWithInAppBrowser(URL.REQUEST_FEATURE));
      },
      description: t('Request a Feature'),
      leftIcon: <ShareSvg width={20} height={20} />,
      rightIcon: <LinkSvg />,
      showOn: ['ok', 'default'],
    },
    {
      key: 5,
      onPress: () => {
        dispatch(openUrlWithInAppBrowser(URL.REPORT_ISSUE));
      },
      description: t('Report an Issue'),
      leftIcon: <Bug width={20} height={20} />,
      rightIcon: <LinkSvg />,
      showOn: ['disappointed', 'ok', 'default'],
    },
  ];

  const chooseRateApp = (rate: FeedbackRateType) => {
    setShowEmojis(false);
    setRateApp(rate);
    dispatch(saveUserFeedback(rate, APP_VERSION, true));
  };

  return (
    <SendFeedbackContainer>
      {showEmojis ? (
        <SendFeedbackParagraph>
          {t('How satisfied are you with using BitPay?')}
        </SendFeedbackParagraph>
      ) : (
        <>
          <SendFeedbackEmoji>
            {rateApp && rateApp === 'love' ? (
              <HearFace width={36} height={36} />
            ) : null}
            {rateApp && rateApp === 'ok' ? (
              <Smile width={36} height={36} />
            ) : null}
            {rateApp && rateApp === 'disappointed' ? (
              <Speechless width={36} height={36} />
            ) : null}
          </SendFeedbackEmoji>
          <SendFeedbackTitle>
            {rateApp && rateApp === 'love' ? t('Thanks!') : null}
            {rateApp && rateApp === 'ok' ? t('How can we improve?') : null}
            {rateApp && rateApp === 'disappointed' ? 'Ouch!' : null}
          </SendFeedbackTitle>
          <SendFeedbackParagraph>
            {rateApp && rateApp === 'love'
              ? t(
                  "We're always listening for ways we can improve your experience. Feel free to leave us 5 star review in the app store or request a new feature.",
                )
              : null}
            {rateApp && rateApp === 'ok'
              ? t(
                  "We're always listening for ways we can improve your experience. Let us know if you experience any technical issues.",
                )
              : null}
            {rateApp && rateApp === 'disappointed'
              ? t(
                  "There's obviously something we’re doing wrong. Is there anything we could do to improve your experience?",
                )
              : null}
            {rateApp && rateApp === 'default'
              ? t(
                  'We’re always listening for ways we can improve your experience. Feel free to leave us a review in the app store or request a new feature. Also, let us know if you experience any technical issues.',
                )
              : null}
          </SendFeedbackParagraph>
        </>
      )}

      {!showEmojis
        ? feedbackList
            .filter(elem => elem.showOn.includes(rateApp))
            .map(item => (
              <ListItem
                key={item.key}
                onPress={item.onPress}
                style={theme.dark ? null : BoxShadow}>
                <LeftIconContainer>{item.leftIcon}</LeftIconContainer>

                <SettingTitle>{item.description}</SettingTitle>
                {item.rightIcon}
              </ListItem>
            ))
        : null}
      {showEmojis ? (
        <EmojisContainer>
          <EmojiActionContainer>
            <EmojiAction onPress={() => setPreRate('love')}>
              <HearFace
                width={44}
                height={44}
                opacity={
                  preRate === 'love' ? 1 : preRate === 'default' ? 1 : 0.4
                }
              />
            </EmojiAction>
            <EmojiAction onPress={() => setPreRate('ok')}>
              <Smile
                width={44}
                height={44}
                opacity={preRate === 'ok' ? 1 : preRate === 'default' ? 1 : 0.4}
              />
            </EmojiAction>
            <EmojiAction onPress={() => setPreRate('disappointed')}>
              <Speechless
                width={44}
                height={44}
                opacity={
                  preRate === 'disappointed'
                    ? 1
                    : preRate === 'default'
                    ? 1
                    : 0.4
                }
              />
            </EmojiAction>
          </EmojiActionContainer>
          {preRate && preRate !== 'default' ? (
            <ConfirmRate onPress={() => chooseRateApp(preRate)}>
              <ConfirmRateTitle>
                {preRate === 'love' ? t('I love it!') : null}
                {preRate === 'ok' ? t("It's ok for now") : null}
                {preRate === 'disappointed' ? t("I'm disappointed") : null}
              </ConfirmRateTitle>
            </ConfirmRate>
          ) : null}
        </EmojisContainer>
      ) : null}
    </SendFeedbackContainer>
  );
};

export default SendFeedback;
