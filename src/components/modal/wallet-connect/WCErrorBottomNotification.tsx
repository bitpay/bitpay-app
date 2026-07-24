import React, {memo} from 'react';
import {HEIGHT} from '../../styled/Containers';
import {H4, fontFamily} from '../../styled/Text';
import {StyleSheet, View} from 'react-native';
import SheetModal from '../base/sheet/SheetModal';
import {useTheme} from '../../../contexts';
import {Platform} from 'react-native';
import {LightBlack, White} from '../../../styles/colors';
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

const styles = StyleSheet.create({
  bottomNotificationContainer: {
    padding: 25,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    maxHeight: HEIGHT - 100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 25,
  },
  imageContainer: {
    marginRight: 10,
  },
  messageContainer: {
    marginTop: 15,
    marginRight: 0,
    marginBottom: 20,
    marginLeft: 0,
  },
  ctaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

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
      <View
        style={[
          styles.bottomNotificationContainer,
          {backgroundColor: theme.dark ? LightBlack : White},
        ]}>
        <View style={styles.row}>
          <View style={styles.imageContainer}>
            {notificationType[type || 'info']}
          </View>
          <H4>{title}</H4>
        </View>
        {message ? (
          <View style={styles.messageContainer}>
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
          </View>
        ) : null}
        <BottomNotificationHr />
        <View
          style={[
            styles.ctaContainer,
            Platform.OS === 'ios' ? {marginBottom: 10} : null,
          ]}>
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
                {text?.toUpperCase()}
              </BottomNotificationCta>
            );
          })}
        </View>
      </View>
    </SheetModal>
  );
};

export default memo(WCErrorBottomNotification);
