import React, {ReactNode, useMemo, useCallback} from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import {ScrollView} from 'react-native-gesture-handler';
import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import SheetModal from '../base/sheet/SheetModal';
import {BaseText, fontFamily, H4} from '../../styled/Text';
import {useDispatch, useSelector, useStore} from 'react-redux';
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
import {useTheme} from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';
import {TouchableOpacity} from '../../base/TouchableOpacity';

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
  message2?: ReactNode;
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

const styles = StyleSheet.create({
  bottomNotificationContainer: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  imageContainer: {
    marginRight: 10,
  },
  title: {
    flexShrink: 1,
  },
  messageContainer: {
    marginTop: 15,
    marginRight: 0,
    marginBottom: 20,
    marginLeft: 0,
  },
  bottomNotificationHr: {
    borderBottomWidth: 1,
    marginTop: 20,
    marginBottom: 20,
  },
  ctaContainer: {
    flexDirection: 'column',
  },
  actionButton: {
    minHeight: 48,
    width: '100%',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  bottomNotificationCta: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: 0.5,
    textAlign: 'left',
  },
  bottomNotificationMessageContainer: {
    paddingTop: 15,
  },
});

export const BottomNotificationHr: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.bottomNotificationHr,
        {borderBottomColor: theme.dark ? SlateDark : '#ebebeb'},
        style,
      ]}
      {...rest}
    />
  );
};

export const BottomNotificationCta: React.FC<
  {primary?: boolean} & React.ComponentProps<typeof BaseText>
> = ({primary, style, ...rest}) => {
  const theme = useTheme();
  const dark = theme.dark;
  const color = dark
    ? primary
      ? LinkBlue
      : Slate
    : primary
    ? NotificationPrimary
    : Black;
  return (
    <BaseText
      style={[styles.bottomNotificationCta, {color}, style]}
      {...rest}
    />
  );
};

export const BottomNotificationMessageContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.bottomNotificationMessageContainer, style]} {...rest} />
);

const BottomNotificationContent = React.memo(() => {
  const theme = useTheme();
  const {height} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const isVisible = useSelector(
    ({APP}: RootState) => APP.showBottomNotificationModal,
  );
  const config = useSelector(
    ({APP}: RootState) => APP.bottomNotificationModalConfig,
  );

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

  const NotificationScrollView =
    modalLibrary === 'modal' ? ScrollView : BottomSheetScrollView;

  const handleBackdropPress = useCallback(() => {
    if (enableBackdropDismiss) {
      dispatch(AppActions.dismissBottomNotificationModal());
      haptic('impactLight');
      if (onBackdropDismiss) {
        onBackdropDismiss();
      }
    }
  }, [enableBackdropDismiss, dispatch, onBackdropDismiss]);

  const markdownStyle = useMemo(
    () => ({
      body: {
        color: theme.colors.text,
        fontFamily,
        fontSize: 16,
        lineHeight: 24,
      },
    }),
    [theme.colors.text],
  );

  const iconElement = useMemo(() => notificationType[type || 'info'], [type]);

  const actionButtons = useMemo(
    () =>
      actions?.map(({primary, action, text}, index) => {
        const handlePress = async () => {
          haptic('impactLight');
          dispatch(AppActions.dismissBottomNotificationModal());
          await sleep(0);
          try {
            await action(store.getState());
          } catch (e) {
            console.error('[BottomNotification] action error:', e);
          }
        };

        return (
          <TouchableOpacity
            style={styles.actionButton}
            key={index}
            testID={`bottom-notification-${
              primary ? 'primary' : 'secondary'
            }-action-button`}
            accessibilityLabel={text}
            onPress={handlePress}>
            <BottomNotificationCta
              suppressHighlighting={true}
              primary={primary}>
              {text?.toUpperCase()}
            </BottomNotificationCta>
          </TouchableOpacity>
        );
      }),
    [actions, dispatch, store],
  );

  return (
    <SheetModal
      modalLibrary={modalLibrary || 'bottom-sheet'}
      enableBackdropDismiss={enableBackdropDismiss}
      isVisible={isVisible}
      onBackdropPress={handleBackdropPress}
      backgroundColor={theme.dark ? LightBlack : White}>
      <NotificationScrollView
        testID="bottom-notification-content"
        style={[
          styles.bottomNotificationContainer,
          {
            backgroundColor: theme.dark ? LightBlack : White,
            maxHeight: height - insets.top - insets.bottom - 20,
          },
        ]}
        contentContainerStyle={{
          padding: 25,
          paddingBottom: Math.max(25, insets.bottom),
        }}
        keyboardShouldPersistTaps="handled">
        <View style={styles.row}>
          <View style={styles.imageContainer}>{iconElement}</View>
          <H4 style={styles.title}>{title}</H4>
        </View>
        {message ? (
          <View style={styles.messageContainer}>
            <Markdown style={markdownStyle}>{message}</Markdown>
          </View>
        ) : null}
        {message2 ? message2 : null}
        <BottomNotificationHr />
        <View style={styles.ctaContainer}>{actionButtons}</View>
      </NotificationScrollView>
    </SheetModal>
  );
});

const BottomNotification = React.memo(() => {
  const isVisible = useSelector(
    ({APP}: RootState) => APP.showBottomNotificationModal,
  );
  const config = useSelector(
    ({APP}: RootState) => APP.bottomNotificationModalConfig,
  );

  return isVisible || config ? <BottomNotificationContent /> : null;
});

export default BottomNotification;
