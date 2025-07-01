import React, {ReactChild, useEffect} from 'react';
import {Platform} from 'react-native';
import {ScrollView} from 'react-native-gesture-handler';
import SheetModal from '../base/sheet/SheetModal';
import {BaseText, fontFamily, H4} from '../../styled/Text';
import styled, {css} from 'styled-components/native';
import {useDispatch, useSelector} from 'react-redux';
import {AppActions} from '../../../store/app';
import {RootState} from '../../../store';
import {
  Black,
  LightBlack,
  LinkBlue,
  NotificationPrimary,
  Slate,
  SlateDark,
  White,
} from '../../../styles/colors';
import haptic from '../../haptic-feedback/haptic';
import SuccessSvg from '../../../../assets/img/success.svg';
import InfoSvg from '../../../../assets/img/info.svg';
import WarningSvg from '../../../../assets/img/warning.svg';
import ErrorSvg from '../../../../assets/img/error.svg';
import QuestionSvg from '../../../../assets/img/question.svg';
import WaitSvg from '../../../../assets/img/wait.svg';
import {sleep} from '../../../utils/helper-methods';
import {Theme, useNavigation, useTheme} from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';
import {resetBottomNotificationModalConfig} from '../../../store/app/app.actions';
import {HEIGHT} from '../../styled/Containers';

export interface BottomNotificationConfig {
  type: 'success' | 'info' | 'warning' | 'error' | 'question' | 'wait';
  title: string;
  message: string;
  modalLibrary?: 'bottom-sheet' | 'modal';
  actions: Array<{
    text: string;
    primary?: boolean;
    action: (rootState: RootState) => any;
  }>;
  code?: string;
  message2?: ReactChild;
  enableBackdropDismiss: boolean;
  onBackdropDismiss?: () => void;
}

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

export const BottomNotificationHr = styled.View`
  border-bottom-color: ${({theme: {dark}}) => (dark ? SlateDark : '#ebebeb')};
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

export const BottomNotificationCta = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: 0.5px;
  text-align: left;
  color: ${({primary, theme: {dark}}: {primary?: boolean; theme: Theme}) =>
    dark
      ? primary
        ? LinkBlue
        : Slate
      : primary
      ? NotificationPrimary
      : Black};
`;

export const ScrollableBottomNotificationMessageContainer = styled(ScrollView)`
  padding-top: 15px;
`;

const BottomNotification = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const rootState = useSelector((state: RootState) => state);
  const isVisible = useSelector(
    ({APP}: RootState) => APP.showBottomNotificationModal,
  );
  const config = useSelector(
    ({APP}: RootState) => APP.bottomNotificationModalConfig,
  );

  useEffect(() => {
    return navigation.addListener('blur', () =>
      dispatch(resetBottomNotificationModalConfig()),
    );
  }, [navigation, dispatch]);

  const {
    type,
    title,
    message,
    actions,
    enableBackdropDismiss,
    message2,
    modalLibrary,
    onBackdropDismiss,
  } = config || {};

  return (
    <SheetModal
      modalLibrary={modalLibrary || 'bottom-sheet'}
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
        {message2 ? message2 : null}
        <BottomNotificationHr />
        <CtaContainer platform={Platform.OS}>
          {actions?.length &&
            actions?.map(({primary, action, text}, index) => {
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

export default BottomNotification;
