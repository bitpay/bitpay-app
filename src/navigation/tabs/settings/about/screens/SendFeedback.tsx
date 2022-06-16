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
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {URL} from '../../../../../constants';
import {useAppDispatch} from '../../../../../utils/hooks';
import {BoxShadow} from '../../../home/components/Styled';
import {Platform, Share} from 'react-native';
import {APP_NAME, DOWNLOAD_BITPAY_URL} from '../../../../../constants/config';
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
  const share = async () => {
    try {
      let message = t(
        'Spend and control your cryptocurrency by downloading the app.',
        {APP_NAME},
      );

      if (Platform.OS !== 'ios') {
        message = `${message} ${DOWNLOAD_BITPAY_URL}`;
      }
      await Share.share({message, url: DOWNLOAD_BITPAY_URL});
    } catch (e) {}
  };
  const feedbackList = [
    {
      key: 1,
      onPress: () => {
        //    TODO: Update me
      },
      description: t('Write a Review'),
      leftIcon: <Start width={20} height={20} />,
      rightIcon: <AngleRight />,
    },
    {
      key: 2,
      onPress: () => share(),
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

  if (!__DEV__) {
    feedbackList.shift();
  }

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
