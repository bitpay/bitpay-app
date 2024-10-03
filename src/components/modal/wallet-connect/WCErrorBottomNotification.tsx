import React, {memo} from 'react';
import {HEIGHT} from '../../styled/Containers';
import {H4, fontFamily} from '../../styled/Text';
import styled from 'styled-components/native';
import SheetModal from '../base/sheet/SheetModal';
import {useTheme} from 'styled-components/native';
import {Platform} from 'react-native';
import {LightBlack, White} from '../../../styles/colors';
import {css} from 'styled-components/native';
import {RootState} from '../../../store';
import SuccessSvg from '../../../../assets/img/success.svg';
import InfoSvg from '../../../../assets/img/info.svg';
import WarningSvg from '../../../../assets/img/warning.svg';
import ErrorSvg from '../../../../assets/img/error.svg';
import QuestionSvg from '../../../../assets/img/question.svg';
import WaitSvg from '../../../../assets/img/wait.svg';
import Markdown from 'react-native-markdown-display';
import haptic from '../../haptic-feedback/haptic';
import {AppActions} from '../../../store/app';
import {sleep} from '../../../utils/helper-methods';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  BottomNotificationCta,
  BottomNotificationHr,
} from '../bottom-notification/BottomNotification';

const svgProps = {
  width: 25,
  height: 25,
};

const notificationType = {
  success: <SuccessSvg {...svgProps} />,
  info: <InfoSvg {...svgProps} />,
  warning: <WarningSvg {...svgProps} />,
  error: <ErrorSvg {...svgProps} />,
  question: <QuestionSvg {...svgProps} />,
  wait: <WaitSvg {...svgProps} />,
};

interface Props {
  isVisible: boolean;
  type: 'success' | 'info' | 'warning' | 'error' | 'question' | 'wait';
  title: string;
  message: string;
  actions: Array<{
    text: string;
    primary?: boolean;
    action: (rootState: RootState) => any;
  }>;
  enableBackdropDismiss: boolean;
  onBackdropDismiss?: () => void;
}

const BottomNotificationContainer = styled.View`
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  padding: 25px;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  max-height: ${HEIGHT - 100}px;
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

const CtaContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  ${({platform}: {platform: string}) =>
    platform === 'ios' &&
    css`
      margin-bottom: 10px;
    `}
`;

const WCErrorBottomNotification = ({
  isVisible,
  type,
  title,
  message,
  actions,
  enableBackdropDismiss,
  onBackdropDismiss,
}: Props) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const rootState = useAppSelector((state: RootState) => state);

  return (
    <SheetModal
      enableBackdropDismiss={enableBackdropDismiss}
      isVisible={isVisible}
      onBackdropPress={() => {
        if (enableBackdropDismiss) {
          dispatch(AppActions.dismissBottomNotificationModal());
          haptic('impactLight');
          if (onBackdropDismiss) {
            onBackdropDismiss();
          }
        }
      }}>
      <BottomNotificationContainer>
        <Row>
          <ImageContainer>{notificationType[type || 'info']}</ImageContainer>
          <H4>{title}</H4>
        </Row>
        {message ? (
          <MessageContainer>
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
          </MessageContainer>
        ) : null}
        <BottomNotificationHr />
        <CtaContainer platform={Platform.OS}>
          {actions?.map(({primary, action, text}, index) => {
            return (
              <BottomNotificationCta
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
              </BottomNotificationCta>
            );
          })}
        </CtaContainer>
      </BottomNotificationContainer>
    </SheetModal>
  );
};

export default memo(WCErrorBottomNotification);
