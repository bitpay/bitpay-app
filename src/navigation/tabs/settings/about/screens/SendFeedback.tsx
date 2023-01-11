import React from 'react';
import styled, {useTheme} from 'styled-components/native';
import {
  ScreenGutter,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {Paragraph} from '../../../../../components/styled/Text';
import {LightBlack, SlateDark, White} from '../../../../../styles/colors';
import AngleRight from '../../../../../../assets/img/angle-right.svg';
import LinkSvg from '../../../../../../assets/img/link.svg';
import Bug from '../../../../../../assets/img/settings/feedback/bug.svg';
import Start from '../../../../../../assets/img/settings/feedback/star.svg';
import Feature from '../../../../../../assets/img/settings/feedback/feature.svg';
import ShareSvg from '../../../../../../assets/img/settings/feedback/share.svg';
import {
  openUrlWithInAppBrowser,
  shareApp,
} from '../../../../../store/app/app.effects';
import {URL} from '../../../../../constants';
import {useAppDispatch} from '../../../../../utils/hooks';
import {BoxShadow} from '../../../home/components/Styled';
import Rate, {AndroidMarket} from 'react-native-rate';
import {useTranslation} from 'react-i18next';

const SendFeedbackContainer = styled.SafeAreaView`
  flex: 1;
  margin: 20px ${ScreenGutter};
`;

const SendFeedbackParagraph = styled(Paragraph)`
  margin-bottom: 30px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
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
const SendFeedback = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
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
    },
    {
      key: 2,
      onPress: () => dispatch(shareApp()),
      description: t('Share with Friends'),
      leftIcon: <ShareSvg width={20} height={20} />,
      rightIcon: <AngleRight />,
    },
    {
      key: 3,
      onPress: () => {
        dispatch(openUrlWithInAppBrowser(URL.REQUEST_FEATURE));
      },
      description: t('Request a Feature'),
      leftIcon: <Feature width={20} height={20} />,
      rightIcon: <LinkSvg />,
    },
    {
      key: 4,
      onPress: () => {
        dispatch(openUrlWithInAppBrowser(URL.REPORT_ISSUE));
      },
      description: t('Report an Issue'),
      leftIcon: <Bug width={20} height={20} />,
      rightIcon: <LinkSvg />,
    },
  ];

  return (
    <SendFeedbackContainer>
      <SendFeedbackParagraph>
        {t(
          'We’re always listening for ways we can improve your experience. Feel free to leave us a review in the app store or request a new feature. Also, let us know if you experience any technical issues.',
        )}
      </SendFeedbackParagraph>

      {feedbackList.map(item => (
        <ListItem
          key={item.key}
          onPress={item.onPress}
          style={theme.dark ? null : BoxShadow}>
          <LeftIconContainer>{item.leftIcon}</LeftIconContainer>

          <SettingTitle>{item.description}</SettingTitle>
          {item.rightIcon}
        </ListItem>
      ))}
    </SendFeedbackContainer>
  );
};

export default SendFeedback;
