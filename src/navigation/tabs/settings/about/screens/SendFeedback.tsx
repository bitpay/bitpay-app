import React, {useMemo, useState} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../../contexts';
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
import {AboutScreens, AboutGroupParamList} from '../AboutGroup';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

export type FeedbackRateType = 'love' | 'ok' | 'disappointed' | 'default';

export interface SendFeedbackParamList {
  rate: FeedbackRateType;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    marginTop: 20,
    paddingHorizontal: parseInt(ScreenGutter, 10),
  },
  sendFeedbackEmoji: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginBottom: -25,
  },
  sendFeedbackTitle: {
    marginBottom: 10,
  },
  sendFeedbackParagraph: {
    marginBottom: 30,
  },
  emojisContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 16,
    gap: 32,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 9,
    elevation: 2,
    borderRadius: 12,
  },
  emojiActionContainer: {
    width: '100%',
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emojiAction: {
    width: 44,
    height: 44,
  },
  listItem: {
    marginBottom: 20,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 20,
  },
  leftIconContainer: {
    marginRight: 10,
  },
});

const SendFeedbackTitle = ({
  style,
  ...rest
}: React.ComponentProps<typeof H4>) => {
  const theme = useTheme();
  return (
    <H4
      style={[
        styles.sendFeedbackTitle,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const SendFeedbackParagraph = ({
  style,
  ...rest
}: React.ComponentProps<typeof Paragraph>) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[
        styles.sendFeedbackParagraph,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const EmojiAction = ({
  style,
  ...rest
}: React.ComponentProps<typeof TouchableOpacity>) => (
  <TouchableOpacity style={[styles.emojiAction, style]} {...rest} />
);

const ListItem = ({style, ...rest}: React.ComponentProps<typeof Setting>) => {
  const theme = useTheme();
  return (
    <Setting
      style={[
        styles.listItem,
        {backgroundColor: theme.dark ? LightBlack : White},
        style,
      ]}
      {...rest}
    />
  );
};

const SendFeedback = ({
  route,
}: NativeStackScreenProps<AboutGroupParamList, AboutScreens.SEND_FEEDBACK>) => {
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
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {showEmojis ? (
          <SendFeedbackParagraph>
            {t('How satisfied are you with using BitPay?')}
          </SendFeedbackParagraph>
        ) : (
          <>
            <View style={styles.sendFeedbackEmoji}>
              {rateApp && rateApp === 'love' ? (
                <HearFace width={36} height={36} />
              ) : null}
              {rateApp && rateApp === 'ok' ? (
                <Smile width={36} height={36} />
              ) : null}
              {rateApp && rateApp === 'disappointed' ? (
                <Speechless width={36} height={36} />
              ) : null}
            </View>
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
                  <View style={styles.leftIconContainer}>{item.leftIcon}</View>

                  <SettingTitle>{item.description}</SettingTitle>
                  {item.rightIcon}
                </ListItem>
              ))
          : null}
        {showEmojis ? (
          <View
            style={[
              styles.emojisContainer,
              {backgroundColor: theme.dark ? LightBlack : White},
            ]}>
            <View style={styles.emojiActionContainer}>
              <EmojiAction onPress={() => chooseRateApp('disappointed')}>
                <Speechless width={44} height={44} />
              </EmojiAction>
              <EmojiAction onPress={() => chooseRateApp('ok')}>
                <Smile width={44} height={44} />
              </EmojiAction>

              <EmojiAction onPress={() => chooseRateApp('love')}>
                <HearFace width={44} height={44} />
              </EmojiAction>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SendFeedback;
