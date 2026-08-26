import React, {useRef} from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  TextProps,
  TouchableOpacity,
  View,
  ViewProps,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../../../contexts';
import {BaseText} from '../../../../components/styled/Text';
import {WIDTH} from '../../../../components/styled/Containers';
import Button from '../../../../components/button/Button';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {
  LightBlack,
  LightBlue,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {setShowKycGetVerifiedModal} from '../../../../store/app/app.actions';
import {BitpayIdScreens} from '../../../bitpay-id/BitpayIdGroup';
import {navigationRef} from '../../../../Root';
import IconKycGetVerified from '../../../../../assets/img/kyc_get_verified.svg';
import IconClose from '../../../../../assets/img/close-modal-icon.svg';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: WIDTH - 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 24,
  },
});

// The sheet is fullscreen; this dims the screen and centers the card.
const Backdrop = ({style, ...rest}: PressableProps) => (
  <Pressable
    style={state => [
      styles.backdrop,
      typeof style === 'function' ? style(state) : style,
    ]}
    {...rest}
  />
);

const ModalCard = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.modalCard,
        {backgroundColor: theme.dark ? LightBlack : White},
        style,
      ]}
      {...rest}
    />
  );
};

const IllustrationContainer = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.illustrationContainer,
        {backgroundColor: theme.dark ? 'rgba(34, 64, 196, 0.25)' : LightBlue},
        style,
      ]}
      {...rest}
    />
  );
};

const CloseButton = ({
  style,
  ...rest
}: React.ComponentProps<typeof TouchableOpacity>) => (
  <TouchableOpacity style={[styles.closeButton, style]} {...rest} />
);

const Content = ({style, ...rest}: ViewProps) => (
  <View style={[styles.content, style]} {...rest} />
);

const Title = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[styles.title, {color: theme.dark ? White : '#000000'}, style]}
      {...rest}
    />
  );
});

const Body = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[styles.body, {color: theme.dark ? White : SlateDark}, style]}
      {...rest}
    />
  );
});

const GetVerifiedModal: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const isVisible = useAppSelector(({APP}) => APP.showKycGetVerifiedModal);

  // Navigate after the sheet dismisses, via navigationRef (VerifyIdentity is a
  // root-navigator screen).
  const pendingVerifyRef = useRef(false);

  const dismiss = () => dispatch(setShowKycGetVerifiedModal(false));

  const onVerify = () => {
    pendingVerifyRef.current = true;
    dismiss();
  };

  const handleModalHide = () => {
    if (pendingVerifyRef.current) {
      pendingVerifyRef.current = false;
      navigationRef.navigate(BitpayIdScreens.VERIFY_IDENTITY as never);
    }
  };

  return (
    <SheetModal
      modalLibrary={'bottom-sheet'}
      isVisible={isVisible}
      fullscreen={true}
      paddingTop={0}
      backgroundColor={'rgba(0, 0, 0, 0.4)'}
      onBackdropPress={dismiss}
      onModalHide={handleModalHide}>
      <Backdrop onPress={dismiss}>
        {/* Absorb taps on the card. */}
        <Pressable onPress={() => {}}>
          <ModalCard>
            <IllustrationContainer>
              <IconKycGetVerified width={200} height={203} />
              <CloseButton
                onPress={dismiss}
                accessibilityLabel="Dismiss identity verification">
                <IconClose width={32} height={32} />
              </CloseButton>
            </IllustrationContainer>
            <Content>
              <Title>{t('Get Verified')}</Title>
              <Body>
                {t(
                  "Complete BitPay's one-time verification process to continue using cryptocurrency for purchases. It's quick, secure, and only needs to be done once.",
                )}
              </Body>
              <Button buttonStyle={'primary'} onPress={onVerify}>
                {t('Verify My Account')}
              </Button>
            </Content>
          </ModalCard>
        </Pressable>
      </Backdrop>
    </SheetModal>
  );
};

export default GetVerifiedModal;
