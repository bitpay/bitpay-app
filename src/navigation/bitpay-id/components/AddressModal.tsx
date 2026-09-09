import React, {useEffect, useState} from 'react';
import Modal from 'react-native-modal';
import {View, ViewProps, StyleSheet} from 'react-native';
import {useTheme} from '../../../contexts';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ActionContainer,
  ActiveOpacity,
  WIDTH,
} from '../../../components/styled/Containers';
import {
  BitPay,
  Black,
  LightBlack,
  LightBlue,
  Midnight,
  Slate30,
  White,
} from '../../../styles/colors';
import Button from '../../../components/button/Button';
import {
  Disclaimer,
  H3,
  HeaderTitle,
  Paragraph,
  TextAlign,
} from '../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import {ReceivingAddress} from '../../../store/bitpay-id/bitpay-id.models';
import CopySvg from '../../../../assets/img/copy.svg';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import haptic from '../../../components/haptic-feedback/haptic';
import {CurrencyIconAndBadge} from '../../wallet/screens/send/confirm/Shared';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    width: WIDTH - 30,
    maxWidth: 400,
    borderRadius: 10,
    paddingVertical: 22,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
    marginLeft: -9,
  },
  addressContainer: {
    borderRadius: 8,
    margin: 0,
    flexDirection: 'row',
    padding: 12,
    paddingRight: 1,
  },
  addressTextContainer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    borderRightWidth: 1,
    paddingRight: 12,
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.5,
  },
  copyContainer: {
    width: 50,
    height: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginTop: 24,
    marginBottom: 19,
    marginHorizontal: -24,
  },
  confirmText: {
    marginBottom: 24,
  },
});

const ModalContainer = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.modalContainer,
        {backgroundColor: theme.dark ? Black : White},
        style,
      ]}
      {...rest}
    />
  );
};

const HeaderContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.headerContainer, style]} {...rest} />
);

const AddressContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.addressContainer,
        {backgroundColor: theme.dark ? Midnight : LightBlue},
        style,
      ]}
      {...rest}
    />
  );
};

const AddressTextContainer = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.addressTextContainer,
        {
          borderRightColor: theme.dark
            ? 'rgba(73, 137, 255, 0.25)'
            : 'rgba(34, 64, 196, 0.25)',
        },
        style,
      ]}
      {...rest}
    />
  );
};

const AddressText = React.forwardRef<
  React.ComponentRef<typeof Paragraph>,
  React.ComponentProps<typeof Paragraph>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <Paragraph
      ref={ref}
      style={[styles.addressText, {color: theme.dark ? White : BitPay}, style]}
      {...rest}
    />
  );
});

const CopyContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.copyContainer, style]} {...rest} />
);

const Divider = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.divider,
        {backgroundColor: theme.dark ? LightBlack : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const ConfirmText = ({style, ...rest}: ViewProps) => (
  <View style={[styles.confirmText, style]} {...rest} />
);

const AddressModal = ({
  onClose,
  receivingAddress,
}: {
  onClose: (remove?: boolean) => void;
  receivingAddress?: ReceivingAddress;
}) => {
  const theme = useTheme();
  const {t} = useTranslation();

  const [copied, setCopied] = useState(false);
  const [removalStarted, setRemovalStarted] = useState(false);

  const copyToClipboard = (address: string) => {
    haptic('impactLight');
    if (!copied) {
      Clipboard.setString(address);
      setCopied(true);
    }
  };

  const close = (remove?: boolean) => {
    setRemovalStarted(false);
    setCopied(false);
    onClose(remove);
  };

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => {
      setCopied(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <View>
      <Modal
        isVisible={!!receivingAddress}
        backdropOpacity={theme.dark ? 0.8 : 0.6}
        backdropColor={theme.dark ? LightBlack : Black}
        animationIn={'fadeInUp'}
        animationOut={'fadeOutDown'}
        backdropTransitionOutTiming={0}
        hideModalContentWhileAnimating={true}
        useNativeDriverForBackdrop={true}
        useNativeDriver={true}
        onBackdropPress={() => close()}
        style={{
          alignItems: 'center',
        }}>
        <ModalContainer>
          {receivingAddress ? (
            <>
              <HeaderContainer>
                <CurrencyIconAndBadge
                  coin={receivingAddress.coin}
                  chain={receivingAddress.chain}
                  size={30}
                />
                <HeaderTitle>{receivingAddress.label}</HeaderTitle>
              </HeaderContainer>
              <AddressContainer
                onPress={() => copyToClipboard(receivingAddress.address)}
                activeOpacity={ActiveOpacity}>
                <AddressTextContainer>
                  <AddressText>{receivingAddress.address}</AddressText>
                </AddressTextContainer>
                <CopyContainer>
                  {copied ? <CopiedSvg /> : <CopySvg />}
                </CopyContainer>
              </AddressContainer>
            </>
          ) : null}
          <Divider />
          {removalStarted ? (
            <ConfirmText>
              <TextAlign align={'center'} style={{marginBottom: 8}}>
                <H3>Are you sure?</H3>
              </TextAlign>
              <TextAlign align={'center'}>
                <Disclaimer>
                  {t(
                    'Your BitPay ID will no longer be associated to this wallet, and senders will have to enter the address to send funds.',
                  )}
                </Disclaimer>
              </TextAlign>
            </ConfirmText>
          ) : null}
          <ActionContainer>
            <Button
              touchableLibrary={'react-native'}
              onPress={() => {
                removalStarted ? close(true) : setRemovalStarted(true);
              }}
              height={50}
              buttonType={'button'}
              buttonStyle={removalStarted ? 'danger' : 'primary'}>
              {removalStarted ? t('Confirm') : t('Remove Address')}
            </Button>
          </ActionContainer>
          <ActionContainer>
            <Button
              touchableLibrary={'react-native'}
              onPress={() => close()}
              buttonStyle={'secondary'}
              height={50}>
              {t('Close')}
            </Button>
          </ActionContainer>
        </ModalContainer>
      </Modal>
    </View>
  );
};

export default AddressModal;
