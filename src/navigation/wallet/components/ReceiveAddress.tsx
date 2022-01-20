import React, {useEffect, useState} from 'react';
import {BaseText, H4} from '../../../components/styled/Text';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../../store';
import BottomPopupModal from '../../../components/modal/base/bottom-popup/BottomPopupModal';
import {WalletActions} from '../../../store/wallet';
import {Wallet} from '../../../store/wallet/wallet.models';
import {useLogger} from '../../../utils/hooks';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {BWCErrorMessage} from '../../../constants/BWCError';
import cloneDeep from 'lodash.clonedeep';
import {
  getLegacyBchAddressFormat,
  ValidateAddress,
} from '../../../constants/address';
import {CustomErrorMessage} from './ErrorMessages';
import {ModalContainer} from '../../../components/styled/Containers';
import styled from 'styled-components/native';
import RefreshIcon from '../../../components/icons/refresh/RefreshIcon';
import CopySvg from '../../../../assets/img/copy.svg';
import {Action, LightBlack, NeutralSlate, White} from '../../../styles/colors';
import QRCode from 'react-native-qrcode-svg';
import Button from '../../../components/button/Button';
import Clipboard from '@react-native-community/clipboard';
import haptic from '../../../components/haptic-feedback/haptic';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import {CurrencySelectionOptions} from '../../../constants/CurrencySelectionOptions';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';

export interface ReceiveAddressConfig {
  keyId: string;
  id: string;
}

interface Address {
  address: string;
  coin: string;
}

const BchAddressTypes = ['Segwit', 'Legacy'];

const Header = styled.View`
  margin-bottom: 30px;
  flex-direction: row;
  justify-content: center;
  position: relative;
  align-items: center;
`;

const Title = styled(H4)`
  color: ${({theme}) => theme.colors.text};
`;

const Refresh = styled.TouchableOpacity<{isBch?: boolean}>`
  position: ${({isBch}) => (isBch ? 'relative' : 'absolute')};
  margin-left: 5px;
  right: 0;
  background-color: ${({theme: {dark}}) => (dark ? '#616161' : '#F5F7F8')};
  width: 40px;
  height: 40px;
  border-radius: 50px;
  align-items: center;
  justify-content: center;
  margin-top: ${({isBch}) => (isBch ? '10px' : '0')};
`;

const CopyToClipboard = styled.TouchableOpacity`
  border: 1px solid #9ba3ae;
  border-radius: 4px;
  padding: 15px;
  min-height: 55px;
  align-items: center;
  flex-direction: row;
`;

const AddressText = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? NeutralSlate : '#6F7782')};
  margin: 0 10px;
`;

const QRCodeContainer = styled.View`
  align-items: center;
  margin: 15px;
`;

const LoadingContainer = styled.View`
  min-height: 300px;
  justify-content: center;
  align-items: center;
`;

const QRCodeBackground = styled.View`
  background-color: ${White};
  width: 225px;
  height: 225px;
  justify-content: center;
  align-items: center;
  border-radius: 12px;
`;

const ReceiveAddressContainer = styled(ModalContainer)`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
`;

const BchHeaderAction = styled.TouchableOpacity<{isActive: boolean}>`
  align-items: center;
  justify-content: center;
  margin: 0 10px -1px;
  border-bottom-color: ${({isActive}) => (isActive ? Action : 'transparent')};
  border-bottom-width: 1px;
  height: 60px;
`;

const BchHeaderActionText = styled(BaseText)<{isActive: boolean}>`
  font-size: 16px;
  opacity: ${({isActive}) => (isActive ? 1 : 0.7)};
  color: ${({theme}) => theme.colors.text};
`;

const BchHeaderActions = styled.View`
  flex-direction: row;
`;

const BchHeader = styled.View`
  margin-bottom: 30px;
  border-bottom-width: 1px;
  border-bottom-color: #979797;
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
`;

const LoadingText = styled(H4)`
  color: ${({theme}) => theme.colors.text};
`;

const ReceiveAddress = () => {
  const dispatch = useDispatch();
  const logger = useLogger();
  const isVisible = useSelector(
    ({WALLET}: RootState) => WALLET.showReceiveAddressModal,
  );
  const receiveAddressConfig = useSelector(
    ({WALLET}: RootState) => WALLET.receiveAddressConfig,
  );

  const {keyId, id} = receiveAddressConfig || {};

  const {wallets} =
    useSelector(({WALLET}: RootState) => keyId && WALLET.keys[keyId]) || {};
  const wallet: Wallet | undefined = wallets?.find(
    ({id: walletId}) => walletId === id,
  );

  const [copied, setCopied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [bchAddressType, setBchAddressType] = useState('Segwit');
  const [bchAddress, setBchAddress] = useState('');
  const {imgSrc} =
    CurrencySelectionOptions.find(
      ({id: currencyId}) =>  currencyId === wallet?.currencyAbbreviation,
    ) || {};

  const copyToClipboard = () => {
    haptic('impactLight');
    if (!copied) {
      Clipboard.setString(address);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 3000);
    }
  };

  const dismissModal = () => {
    dispatch(WalletActions.dismissReceiveAddressModal());
  };

  const showErrorMessage = (msg: BottomNotificationConfig) => {
    dispatch(WalletActions.dismissReceiveAddressModal());

    setTimeout(() => {
      dispatch(showBottomNotificationModal(msg));
    }, 500); // Wait to close Decrypt Password modal
  };

  const createAddress = async () => {
    // To avoid altering store value
    const walletClone = cloneDeep(wallet);

    if (walletClone) {
      let {token, network, coin} = walletClone.credentials;
      if (token) {
        walletClone.id.replace(`-${token.address}`, '');
      }

      await walletClone.createAddress({}, (err: any, addressObj: Address) => {
        if (err) {
          let prefix = 'Could not create address';
          if (err.name && err.name.includes('MAIN_ADDRESS_GAP_REACHED')) {
            logger.warn(BWCErrorMessage(err, 'Server Error'));
            walletClone.getMainAddresses(
              {
                reverse: true,
                limit: 1,
              },
              (e: any, addr: Address[]) => {
                if (e) {
                  showErrorMessage(CustomErrorMessage(BWCErrorMessage(e)));
                }
                setLoading(false);
                setAddress(addr[0].address);
                if (coin === 'bch') {
                  setBchAddress(addr[0].address);
                }
              },
            );
          } else {
            showErrorMessage(CustomErrorMessage(BWCErrorMessage(err, prefix)));
          }
          logger.warn(BWCErrorMessage(err, 'Receive'));
        } else if (
          addressObj &&
          !ValidateAddress(addressObj.address, addressObj.coin, network)
        ) {
          logger.error(`Invalid address generated: ${addressObj.address}`);
          if (retryCount < 3) {
            setRetryCount(retryCount + 1);
            createAddress();
          } else {
            showErrorMessage(CustomErrorMessage(BWCErrorMessage(err)));
          }
        } else if (addressObj) {
          setLoading(false);
          setAddress(addressObj.address);
          if (coin === 'bch') {
            setBchAddress(addressObj.address);
          }
        }
      });
    }
  };

  const init = () => {
    if (wallet?.isComplete()) {
      logger.info(`Creating address for wallet: ${id}`);
      createAddress();
    }
  };

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  const onBchAddressTypeChange = (type: string) => {
    haptic('impactLight');
    setBchAddressType(type);
    if (type === 'Legacy') {
      setAddress(getLegacyBchAddressFormat(address));
    } else {
      setAddress(bchAddress);
    }
  };

  return (
    <BottomPopupModal isVisible={isVisible} onBackdropPress={dismissModal}>
      <ReceiveAddressContainer>
        {wallet?.currencyAbbreviation !== 'bch' ? (
          <Header>
            <Title>Address</Title>
            <Refresh
              onPress={() => {
                haptic('impactLight');
                createAddress();
              }}>
              <RefreshIcon />
            </Refresh>
          </Header>
        ) : (
          <BchHeader>
            <Title>Address</Title>

            <BchHeaderActions>
              {BchAddressTypes.map(type => (<BchHeaderAction
                  onPress={() => onBchAddressTypeChange(type)}
                  isActive={bchAddressType === type} disabled={!address}>
                <BchHeaderActionText isActive={bchAddressType === type}>
                  {type}
                </BchHeaderActionText>
              </BchHeaderAction>))}

              <Refresh
                isBch={true}
                onPress={() => {
                  haptic('impactLight');
                  createAddress();
                  setBchAddressType('Segwit');
                }}>
                <RefreshIcon />
              </Refresh>
            </BchHeaderActions>
          </BchHeader>
        )}

        {address ? (
          <>
            <CopyToClipboard onPress={copyToClipboard} activeOpacity={0.7}>
              {!copied ? <CopySvg width={17} /> : <CopiedSvg width={17} />}
              <AddressText numberOfLines={1} ellipsizeMode={'tail'}>
                {address}
              </AddressText>
            </CopyToClipboard>

            <QRCodeContainer>
              <QRCodeBackground>
                <QRCode
                  value={address}
                  size={200}
                  logo={imgSrc}
                  logoSize={38}
                  logoBackgroundColor={White}
                  logoMargin={8}
                  logoBorderRadius={8}
                />
              </QRCodeBackground>
            </QRCodeContainer>
          </>
        ) : loading ? (
          <LoadingContainer>
            <LoadingText>Generating Address...</LoadingText>
          </LoadingContainer>
        ) : <LoadingContainer><GhostSvg/></LoadingContainer>}

        <Button onPress={dismissModal} buttonType={'link'}>
          CLOSE
        </Button>
      </ReceiveAddressContainer>
    </BottomPopupModal>
  );
};

export default ReceiveAddress;
