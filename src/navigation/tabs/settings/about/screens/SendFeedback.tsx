import React, {useMemo, useState} from 'react';
import styled, {useTheme} from 'styled-components/native';
import {
  ScreenGutter,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {H4, Paragraph} from '../../../../../components/styled/Text';
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
import {useAppDispatch} from '../../../../../utils/hooks';
import {BoxShadow} from '../../../home/components/Styled';
import Rate, {AndroidMarket} from 'react-native-rate';
import {useTranslation} from 'react-i18next';
import {APP_VERSION} from '../../../../../constants/config';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AboutStackParamList} from '../AboutStack';

export type FeedbackRateType = 'love' | 'ok' | 'disappointed' | 'default';

export interface SendFeedbackParamList {
  rate: FeedbackRateType;
}

const SendFeedbackContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollContainer = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
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
  padding: 0 20px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

const EmojiAction = styled.TouchableOpacity`
  width: 44px;
  height: 44px;
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

const SendFeedback = ({
  route,
}: NativeStackScreenProps<AboutStackParamList, 'SendFeedback'>) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const {rate} = route.params || {};
  const [showEmojis, setShowEmojis] = useState(false);
  const [rateApp, setRateApp] = useState<FeedbackRateType>(rate || 'default');

  const rateAppStore = () => {
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
  };

  const feedbackList = [
    {
      key: 1,
      onPress: () => {
        setShowEmojis(true);
      },
      description: t('Write a Review'),
      leftIcon: <Start width={20} height={20} />,
      rightIcon: <AngleRight />,
      showOn: ['default'],
    },
    {
      key: 2,
      onPress: () => {
        rateAppStore();
      },
      description: t('Write a Review'),
      leftIcon: <Start width={20} height={20} />,
      rightIcon: <AngleRight />,
      showOn: ['love'],
    },
    {
      key: 3,
      onPress: () => dispatch(shareApp()),
      description: t('Share with Friends'),
      leftIcon: <ShareSvg width={20} height={20} />,
      rightIcon: <AngleRight />,
      showOn: ['love'],
    },
    {
      key: 4,
      onPress: () => dispatch(openUrlWithInAppBrowser(URL.LEAVE_FEEDBACK)),
      description: t('Leave Feedback'),
      leftIcon: <Feature width={20} height={20} />,
      rightIcon: <AngleRight />,
      showOn: ['ok', 'disappointed', 'default'],
    },
    {
      key: 5,
      onPress: () => {
        dispatch(openUrlWithInAppBrowser(URL.REQUEST_FEATURE));
      },
      description: t('Request a Feature'),
      leftIcon: <ShareSvg width={20} height={20} />,
      rightIcon: <LinkSvg />,
      showOn: ['ok', 'default'],
    },
    {
      key: 6,
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
      <ScrollContainer>
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
              <EmojiAction onPress={() => chooseRateApp('disappointed')}>
                <Speechless width={44} height={44} />
              </EmojiAction>
              <EmojiAction onPress={() => chooseRateApp('ok')}>
                <Smile width={44} height={44} />
              </EmojiAction>

              <EmojiAction onPress={() => chooseRateApp('love')}>
                <HearFace width={44} height={44} />
              </EmojiAction>
            </EmojiActionContainer>
          </EmojisContainer>
        ) : null}
      </ScrollContainer>
    </SendFeedbackContainer>
  );
};

export default SendFeedback;
