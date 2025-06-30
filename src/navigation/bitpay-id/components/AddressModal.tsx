import React, {useEffect, useState} from 'react';
import Modal from 'react-native-modal';
import {View} from 'react-native';
import styled, {useTheme} from 'styled-components/native';
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
import {TouchableOpacity} from 'react-native-gesture-handler';

const ModalContainer = styled.View`
  justify-content: center;
  width: ${WIDTH - 30}px;
  max-width: 400px;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
  border-radius: 10px;
  padding: 22px 24px;
  overflow: hidden;
`;

const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 11px;
  margin-left: -9px;
`;

const AddressContainer = styled(TouchableOpacity)`
  background-color: ${({theme: {dark}}) => (dark ? Midnight : '#eceffd')};
  border-radius: 8px;
  margin: 0;
  flex-direction: row;
  padding: 12px;
  padding-right: 1px;
`;

const AddressTextContainer = styled.View`
  flex: 1 1 auto;
  border-right-width: 1px;
  border-right-color: ${({theme: {dark}}) =>
    dark ? 'rgba(73, 137, 255, 0.25)' : 'rgba(34, 64, 196, 0.25)'};
  padding-right: 12px;
  min-height: 20px;
  flex-direction: row;
  align-items: center;
`;
const AddressText = styled(Paragraph)`
  color: ${({theme: {dark}}) => (dark ? White : BitPay)};
  font-size: 12px;
  line-height: 16px;
  letter-spacing: -0.5px;
`;

const CopyContainer = styled.View`
  width: 50px;
  height: 100%;
  align-items: center;
  flex-direction: row;
  justify-content: center;
`;

const Divider = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  height: 1px;
  margin: 24px -24px 19px;
`;

const ConfirmText = styled.View`
  margin-bottom: 24px;
`;

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
