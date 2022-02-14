import React, {ReactChild} from 'react';
import SheetModal from '../base/sheet/SheetModal';
import {BaseText, fontFamily, H4} from '../../styled/Text';
import styled, {css} from 'styled-components/native';
import {useDispatch, useSelector} from 'react-redux';
import {AppActions} from '../../../store/app';
import {RootState} from '../../../store';
import {
  Black,
  LightBlack,
  NotificationPrimary,
  White,
} from '../../../styles/colors';
import haptic from '../../haptic-feedback/haptic';
import {Platform} from 'react-native';
import SuccessSvg from '../../../../assets/img/success.svg';
import InfoSvg from '../../../../assets/img/info.svg';
import WarningSvg from '../../../../assets/img/warning.svg';
import ErrorSvg from '../../../../assets/img/error.svg';
import QuestionSvg from '../../../../assets/img/question.svg';
import {sleep} from '../../../utils/helper-methods';
import {Theme, useTheme} from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';

export interface BottomNotificationConfig {
  type: 'success' | 'info' | 'warning' | 'error' | 'question';
  title: string;
  message: string;
  actions: Array<{
    text: string;
    primary?: boolean;
    action: (rootState: RootState) => any;
  }>;
  message2?: ReactChild;
  enableBackdropDismiss: boolean;
}

const svgProps = {
  width: 25,
  height: 25,
};

const notificationType = {
  success: () => <SuccessSvg {...svgProps} />,
  info: () => <InfoSvg {...svgProps} />,
  warning: () => <WarningSvg {...svgProps} />,
  error: () => <ErrorSvg {...svgProps} />,
  question: () => <QuestionSvg {...svgProps} />,
};

const BottomNotificationContainer = styled.View`
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  padding: 25px;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
`;

const Row = styled.View`
  flex-direction: row;
  align-items: center;
  padding-right: 25px;
`;

const ImageContainer = styled.View`
  margin-right: 10px;
`;

const MessageContainer = styled.View`
  margin: 15px 0 20px 0;
`;

const Hr = styled.View`
  border-bottom-color: #ebebeb;
  border-bottom-width: 1px;
  margin: 20px 0;
`;

const CtaContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  ${({platform}: {platform: string}) =>
    platform === 'ios' &&
    css`
      margin-bottom: 10px;
    `}
`;

const Cta = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: 0.5px;
  text-align: left;
  color: ${({primary, theme: {dark}}: {primary?: boolean; theme: Theme}) =>
    dark ? White : primary ? NotificationPrimary : Black};
  text-decoration: ${({theme: {dark}}) => (dark ? 'underline' : 'none')};
  text-decoration-color: ${White};
`;

const BottomNotification = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const rootState = useSelector((state: RootState) => state);
  const isVisible = useSelector(
    ({APP}: RootState) => APP.showBottomNotificationModal,
  );
  const config = useSelector(
    ({APP}: RootState) => APP.bottomNotificationModalConfig,
  );

  const {type, title, message, actions, enableBackdropDismiss, message2} =
    config || {};

  return (
    <SheetModal
      isVisible={isVisible}
      onBackdropPress={() => {
        if (enableBackdropDismiss) {
          dispatch(AppActions.dismissBottomNotificationModal());
          haptic('impactLight');
        }
      }}>
      <BottomNotificationContainer>
        <Row>
          <ImageContainer>{notificationType[type || 'info']()}</ImageContainer>
          <H4>{title}</H4>
        </Row>
        <MessageContainer>
          {message ? (
            <Markdown
              style={{
                body: {
                  color: theme.colors.text,
                  fontFamily,
                  fontSize: 16,
                  lineHeight: 24,
                },
              }}>
              {message}
            </Markdown>
          ) : null}
        </MessageContainer>
        {message2 ? message2 : null}
        <Hr />
        <CtaContainer platform={Platform.OS}>
          {actions?.map(({primary, action, text}, index) => {
            return (
              <Cta
                key={index}
                suppressHighlighting={true}
                primary={primary}
                onPress={async () => {
                  haptic('impactLight');
                  dispatch(AppActions.dismissBottomNotificationModal());
                  await sleep(0);
                  action(rootState);
                }}>
                {text.toUpperCase()}
              </Cta>
            );
          })}
        </CtaContainer>
      </BottomNotificationContainer>
    </SheetModal>
  );
};

export default BottomNotification;
