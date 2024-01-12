import React from 'react';
import styled from 'styled-components/native';
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

const FeedbackContainer = styled.View`
  margin: 20px 16px 0 16px;
  display: flex;
  flex-direction: column;
  padding: 25px 16px 16px 16px;
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  box-shadow: 0px 1px 9px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
`;

const FeedbackParagraph = styled(Paragraph)`
  margin-bottom: 30px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const FeedbackHeader = styled.View`
  display: flex;
  flex-direction: row;
  margin-bottom: 20px;
  justify-content: space-between;
`;

const FeedbackTitleContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const FeedbackCloseContainer = styled.TouchableOpacity`
  display: flex;
  align-items: flex-end;
  justify-content: center;
  text-align: right;
  width: 44px;
  height; 44px;
`;

const FeedbackTitle = styled(H4)`
  margin-left: 8px;
  font-weight: 500;
  font-size: 20px;
  line-height: 30px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const EmojisContainer = styled.View`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const EmojiActionContainer = styled.View`
  width: 100%;
  margin-bottom: 20px;
  padding: 0 20px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

const EmojiAction = styled.TouchableOpacity`
  width: 44px;
  height: 44px;
`;

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
        <FeedbackCloseContainer onPress={() => rateApp('default')}>
          <Close width={18} height={18} />
        </FeedbackCloseContainer>
      </FeedbackHeader>
      <FeedbackParagraph>
        {t('How satisfied are you with using BitPay?')}
      </FeedbackParagraph>
      <EmojisContainer>
        <EmojiActionContainer>
          <EmojiAction onPress={() => rateApp('disappointed')}>
            <Speechless width={44} height={44} />
          </EmojiAction>
          <EmojiAction onPress={() => rateApp('ok')}>
            <Smile width={44} height={44} />
          </EmojiAction>
          <EmojiAction onPress={() => rateApp('love')}>
            <HearFace width={44} height={44} />
          </EmojiAction>
        </EmojiActionContainer>
      </EmojisContainer>
    </FeedbackContainer>
  );
};

export default FeedbackCard;
