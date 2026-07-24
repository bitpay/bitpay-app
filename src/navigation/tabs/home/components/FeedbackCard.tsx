import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import {useNavigation} from '@react-navigation/native';
import {useAppDispatch} from '../../../../utils/hooks';
import {FeedbackRateType} from '../../settings/about/screens/SendFeedback';
import {H4, Paragraph} from '../../../../components/styled/Text';
import {LightBlack, SlateDark, White} from '../../../../styles/colors';

import HearFace from ' ../../../../../assets/img/settings/feedback/heart-face.svg';
import Smile from '../../../../../assets/img/settings/feedback/smile.svg';
import Speechless from '../../../../../assets/img/settings/feedback/speechless.svg';
import Question from '../../../../../assets/img/settings/feedback/question.svg';
import Close from '../../../../../assets/img/settings/feedback/close.svg';
import {useTranslation} from 'react-i18next';
import {saveUserFeedback} from '../../../../store/app/app.effects';
import {APP_VERSION} from '../../../../constants/config';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const styles = StyleSheet.create({
  feedbackContainer: {
    marginTop: 20,
    marginRight: 16,
    marginBottom: 0,
    marginLeft: 16,
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 25,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 9,
    elevation: 2,
    borderRadius: 12,
  },
  feedbackParagraph: {
    marginBottom: 30,
  },
  feedbackHeader: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  feedbackTitleContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  feedbackCloseContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    textAlign: 'right',
    width: 44,
  },
  feedbackTitle: {
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 20,
    lineHeight: 30,
  },
  emojisContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emojiActionContainer: {
    width: '100%',
    marginBottom: 20,
    paddingVertical: 0,
    paddingHorizontal: 20,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emojiAction: {
    width: 44,
    height: 44,
  },
});

const FeedbackContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.feedbackContainer,
        {backgroundColor: theme.dark ? LightBlack : White},
      ]}>
      {children}
    </View>
  );
};

const FeedbackParagraph: React.FC<React.ComponentProps<typeof Paragraph>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[
        styles.feedbackParagraph,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const FeedbackHeader: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.feedbackHeader}>{children}</View>
);

const FeedbackTitleContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.feedbackTitleContainer}>{children}</View>;

const FeedbackCloseContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.feedbackCloseContainer, style]} {...rest} />
);

const FeedbackTitle: React.FC<React.ComponentProps<typeof H4>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <H4
      style={[
        styles.feedbackTitle,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const EmojisContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.emojisContainer}>{children}</View>;

const EmojiActionContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.emojiActionContainer}>{children}</View>;

const EmojiAction: React.FC<React.ComponentProps<typeof TouchableOpacity>> = ({
  style,
  ...rest
}) => <TouchableOpacity style={[styles.emojiAction, style]} {...rest} />;

const FeedbackCard: React.FC = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const rateApp = (rate: FeedbackRateType) => {
    dispatch(saveUserFeedback(rate, APP_VERSION, true));
    if (rate !== 'default') {
      navigation.navigate('SendFeedback', {rate});
    }
  };

  return (
    <FeedbackContainer>
      <FeedbackHeader>
        <FeedbackTitleContainer>
          <Question width={24} height={24} />
          <FeedbackTitle>{t('Feedback')}</FeedbackTitle>
        </FeedbackTitleContainer>
        <FeedbackCloseContainer
          testID="home-feedback-close-button"
          accessibilityLabel="Close feedback"
          onPress={() => rateApp('default')}>
          <Close width={18} height={18} />
        </FeedbackCloseContainer>
      </FeedbackHeader>
      <FeedbackParagraph>
        {t('How satisfied are you with using BitPay?')}
      </FeedbackParagraph>
      <EmojisContainer>
        <EmojiActionContainer>
          <EmojiAction
            testID="home-feedback-disappointed-button"
            accessibilityLabel="Disappointed"
            onPress={() => rateApp('disappointed')}>
            <Speechless width={44} height={44} />
          </EmojiAction>
          <EmojiAction
            testID="home-feedback-ok-button"
            accessibilityLabel="OK"
            onPress={() => rateApp('ok')}>
            <Smile width={44} height={44} />
          </EmojiAction>
          <EmojiAction
            testID="home-feedback-love-button"
            accessibilityLabel="Love it"
            onPress={() => rateApp('love')}>
            <HearFace width={44} height={44} />
          </EmojiAction>
        </EmojiActionContainer>
      </EmojisContainer>
    </FeedbackContainer>
  );
};

export default FeedbackCard;
