import React, {ReactNode, useEffect, useMemo, useCallback} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {ScrollView} from 'react-native-gesture-handler';
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
import {useNavigation, useTheme} from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';
import {resetBottomNotificationModalConfig} from '../../../store/app/app.actions';
import {HEIGHT} from '../../styled/Containers';
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
  bottomNotificationHr: {
    borderBottomWidth: 1,
    marginTop: 20,
    marginBottom: 20,
  },
  ctaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomNotificationCta: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: 0.5,
    textAlign: 'left',
  },
  scrollableBottomNotificationMessageContainer: {
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

export const ScrollableBottomNotificationMessageContainer: React.FC<
  React.ComponentProps<typeof ScrollView>
> = ({style, ...rest}) => (
  <ScrollView
    style={[styles.scrollableBottomNotificationMessageContainer, style]}
    {...rest}
  />
);

const BottomNotificationContent = React.memo(() => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const navigation = useNavigation();
  const isVisible = useSelector(
    ({APP}: RootState) => APP.showBottomNotificationModal,
  );
  const config = useSelector(
    ({APP}: RootState) => APP.bottomNotificationModalConfig,
  );

  useEffect(() => {
    if (!config) {
      return;
    }

    return navigation.addListener('blur', () =>
      dispatch(resetBottomNotificationModalConfig()),
    );
  }, [navigation, dispatch, config]);

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
            style={{minHeight: 30, minWidth: 60}}
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
      onBackdropPress={handleBackdropPress}>
      <View
        style={[
          styles.bottomNotificationContainer,
          {backgroundColor: theme.dark ? LightBlack : White},
        ]}>
        <View style={styles.row}>
          <View style={styles.imageContainer}>{iconElement}</View>
          <H4>{title}</H4>
        </View>
        {message ? (
          <View style={styles.messageContainer}>
            <Markdown style={markdownStyle}>{message}</Markdown>
          </View>
        ) : null}
        {message2 ? message2 : null}
        <BottomNotificationHr />
        <View
          style={[
            styles.ctaContainer,
            Platform.OS === 'ios' ? {marginBottom: 10} : null,
          ]}>
          {actionButtons}
        </View>
      </View>
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
