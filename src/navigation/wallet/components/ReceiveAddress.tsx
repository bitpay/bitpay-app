import React, {useEffect, useState} from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import styled, {css} from 'styled-components/native';
import {useAppDispatch, useLogger} from '../../../utils/hooks';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {BaseText, H4, Paragraph} from '../../../components/styled/Text';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {
  SheetContainer,
  ActiveOpacity,
  CloseButtonContainer,
} from '../../../components/styled/Containers';
import haptic from '../../../components/haptic-feedback/haptic';
import {BWCErrorMessage, BWCErrorName} from '../../../constants/BWCError';
import {CustomErrorMessage} from './ErrorMessages';
import {
  Action,
  Black,
  LightBlack,
  NeutralSlate,
  White,
} from '../../../styles/colors';
import CopySvg from '../../../../assets/img/copy.svg';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';
import {
  sleep,
  getProtocolName,
  titleCasing,
  getProtocolsName,
} from '../../../utils/helper-methods';
import {Status, Wallet} from '../../../store/wallet/wallet.models';
import ReceiveAddressHeader, {
  HeaderContextHandler,
} from './ReceiveAddressHeader';
import {
  createWalletAddress,
  GetLegacyBchAddressFormat,
} from '../../../store/wallet/effects/address/address';
import {
  GetProtocolPrefix,
  IsSVMChain,
  IsVMChain,
  IsUtxoChain,
} from '../../../store/wallet/utils/currency';
import {useTranslation} from 'react-i18next';
import WarningSvg from '../../../../assets/img/warning.svg';
import LinkIcon from '../../../components/icons/link-icon/LinkIcon';
import {
  ContractAddressText,
  ContractHeaderContainer,
  ContractLink,
  LinkContainer,
  TitleContainer,
  viewOnBlockchain,
} from './SendingToERC20Warning';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

export const BchAddressTypes = ['Cash Address', 'Legacy'];

const CopyToClipboard = styled(TouchableOpacity)`
  border: 1px solid #9ba3ae;
  border-radius: 4px;
  padding: 0 10px;
  height: 55px;
  align-items: center;
  flex-direction: row;
`;

const AddressText = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? NeutralSlate : '#6F7782')};
  padding: 0 20px 0 5px;
`;

const CopyImgContainer = styled.View`
  border-right-color: ${({theme: {dark}}) => (dark ? '#46494E' : '#ECEFFD')};
  border-right-width: 1px;
  padding-right: 10px;
  height: 25px;
  justify-content: center;
`;

const QRCodeContainer = styled.View`
  align-items: center;
  margin: 15px;
`;

const QRCodeBackground = styled.View`
  background-color: ${White};
  width: 225px;
  height: 225px;
  justify-content: center;
  align-items: center;
  border-radius: 12px;
`;

const LoadingContainer = styled.View`
  min-height: 300px;
  justify-content: center;
  align-items: center;
`;

const LoadingText = styled(H4)`
  color: ${({theme}) => theme.colors.text};
  margin: 10px 0;
  text-align: center;
`;

const ReceiveAddressContainer = styled(SheetContainer)`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  min-height: 500px;
`;

const CloseButtonText = styled(Paragraph)`
  color: ${({theme: {dark}}) => (dark ? White : Action)};
`;

const WarningContainer = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 4px;
  padding: 20px;
  margin-bottom: 20px;
`;

const WarningHeader = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 10px 0px;
`;

const WarningTitle = styled(BaseText)`
  font-size: 14px;
  color: ${({theme}) => theme.colors.text};
  font-weight: bold;
`;

const WarningDescription = styled(BaseText)<{isToken?: boolean}>`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  padding: 0px 10px;
  ${({isToken}) =>
    isToken &&
    css`
      padding-bottom: 20px;
      border-bottom-width: 1px;
      border-bottom-color: ${({theme: {dark}}) =>
        dark ? LightBlack : '#ECEFFD'};
    `};
`;

interface Props {
  isVisible: boolean;
  closeModal: () => void;
  wallet: Wallet;
  context?: 'accountdetails' | 'globalselect';
}

const ReceiveAddress = ({isVisible, closeModal, wallet, context}: Props) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const [copied, setCopied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [bchAddressType, setBchAddressType] = useState('Cash Address');
  const [bchAddress, setBchAddress] = useState('');
  const [protocolPrefix, setProtocolPrefix] = useState('');
  const [wasInit, setWasInit] = useState(false);
  const [singleAddress, setSingleAddress] = useState(false);

  const copyToClipboard = () => {
    haptic('impactLight');
    if (!copied) {
      Clipboard.setString(address);
      setCopied(true);
    }
  };

  const setIsSingleAddress = () => {
    wallet?.getStatus({network: wallet.network}, (err: any, status: Status) => {
      if (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        logger.error(`error [getStatus]: ${errStr}`);
      } else {
        setSingleAddress(status?.wallet?.singleAddress);
      }
    });
  };

  useEffect(() => {
    setIsSingleAddress();
  }, []);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => {
      setCopied(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [copied]);

  const onBchAddressTypeChange = (type: string) => {
    haptic('impactLight');
    setBchAddressType(type);
    if (type === 'Legacy') {
      setAddress(GetLegacyBchAddressFormat(address));
    } else {
      setAddress(bchAddress);
    }
  };

  const showErrorMessage = async (msg: BottomNotificationConfig) => {
    closeModal();
    await sleep(500);
    dispatch(showBottomNotificationModal(msg));
  };

  const createAddress = async (newAddress: boolean = false) => {
    let {currencyAbbreviation, network, chain} = wallet;
    const prefix = 'Could not create address';

    try {
      const walletAddress = (await dispatch<any>(
        createWalletAddress({wallet, newAddress}),
      )) as string;
      setLoading(false);
      if (currencyAbbreviation === 'bch') {
        const _protocolPrefix = GetProtocolPrefix(network, chain);
        setProtocolPrefix(_protocolPrefix);
        const formattedAddr = _protocolPrefix + ':' + walletAddress;
        setAddress(formattedAddr);
        setBchAddress(formattedAddr);
        setBchAddressType('Cash Address');
      } else {
        setAddress(walletAddress);
      }
    } catch (createAddressErr: any) {
      switch (createAddressErr?.type) {
        case BWCErrorName.INVALID_ADDRESS_GENERATED:
          logger.error(createAddressErr.error);

          if (retryCount < 3) {
            setRetryCount(retryCount + 1);
            createAddress(newAddress);
            return;
          } else {
            showErrorMessage(
              CustomErrorMessage({
                errMsg: BWCErrorMessage(createAddressErr.error),
              }),
            );
          }
          break;
        case BWCErrorName.MAIN_ADDRESS_GAP_REACHED:
          showErrorMessage(
            CustomErrorMessage({
              errMsg: BWCErrorMessage(createAddressErr.error),
            }),
          );
          break;

        case 'INVALID_SOL_ADDRESS_GENERATED':
          showErrorMessage(
            CustomErrorMessage({
              errMsg: createAddressErr.error,
            }),
          );
          break;
        default:
          showErrorMessage(
            CustomErrorMessage({
              errMsg: BWCErrorMessage(createAddressErr.error, prefix),
            }),
          );
          break;
      }
      logger.warn(BWCErrorMessage(createAddressErr.error, 'Receive'));
    }
  };

  const init = () => {
    if (wallet?.isComplete()) {
      logger.info(`Creating address for wallet: ${wallet.id}`);
      createAddress();
    } else {
      // TODO
    }
  };

  const shouldInit = isVisible && !wasInit ? init : null;
  useEffect(() => {
    if (shouldInit) {
      setWasInit(true);
      shouldInit();
    }
  }, [wallet, shouldInit]);

  let headerContextHandlers: HeaderContextHandler | null = null;

  if (wallet?.currencyAbbreviation === 'bch') {
    headerContextHandlers = {
      currency: wallet?.currencyAbbreviation,
      disabled: !address,
      activeItem: bchAddressType,
      onPressChange: (item: string) => onBchAddressTypeChange(item),
      items: BchAddressTypes,
    };
  }

  const isUtxo = IsUtxoChain(wallet?.chain);

  const _closeModal = () => {
    closeModal();
    setTimeout(() => {
      setAddress('');
      setLoading(true);
      init();
    });
  };

  return (
    <SheetModal
      modalLibrary={'bottom-sheet'}
      isVisible={isVisible}
      onBackdropPress={_closeModal}>
      <ReceiveAddressContainer>
        {!singleAddress && isUtxo ? (
          <ReceiveAddressHeader
            onPressRefresh={() => createAddress(true)}
            contextHandlers={headerContextHandlers}
            showRefresh={isUtxo}
          />
        ) : null}

        {address ? (
          <>
            <CopyToClipboard
              onPress={copyToClipboard}
              activeOpacity={ActiveOpacity}>
              <CopyImgContainer>
                {!copied ? <CopySvg width={17} /> : <CopiedSvg width={17} />}
              </CopyImgContainer>
              <AddressText numberOfLines={1} ellipsizeMode={'middle'}>
                {protocolPrefix
                  ? address.replace(protocolPrefix + ':', '')
                  : address}
              </AddressText>
            </CopyToClipboard>

            <QRCodeContainer>
              <QRCodeBackground>
                <QRCode value={address} size={200} />
              </QRCodeBackground>
            </QRCodeContainer>
          </>
        ) : loading ? (
          <LoadingContainer>
            <LoadingText>{t('Generating Address...')}</LoadingText>
          </LoadingContainer>
        ) : (
          <LoadingContainer>
            <GhostSvg />
            <LoadingText>
              {t('Something went wrong. Please try again.')}
            </LoadingText>
          </LoadingContainer>
        )}

        {context &&
        ['accountdetails', 'globalselect'].includes(context) &&
        IsVMChain(wallet.chain) ? (
          <WarningContainer>
            <WarningHeader>
              <WarningSvg />
              <WarningDescription isToken={wallet.credentials.token?.address}>
                <WarningTitle>{t('Warning!')}</WarningTitle>
                {'\n'}
                {IsSVMChain(wallet.chain)
                  ? t(
                      'Only receive tokens on PROTOCOLNAMES Network to avoid losing funds.',
                      {
                        protocolNames: titleCasing(
                          getProtocolsName(wallet.chain)!,
                        ),
                      },
                    )
                  : t(
                      'Only receive tokens on PROTOCOLNAMES networks to avoid losing funds.',
                      {
                        protocolNames: titleCasing(
                          getProtocolsName(wallet.chain)!,
                        ),
                      },
                    )}
              </WarningDescription>
            </WarningHeader>
          </WarningContainer>
        ) : (
          <WarningContainer>
            <WarningHeader>
              <WarningSvg />
              <WarningDescription isToken={wallet.credentials.token?.address}>
                <WarningTitle>{t('Warning!')}</WarningTitle>
                {'\n'}
                {t(
                  'Receive only COIN on the PROTOCOLNAME Network to avoid losing funds.',
                  {
                    coin: wallet?.currencyAbbreviation?.toUpperCase(),
                    protocolName: titleCasing(
                      getProtocolName(wallet.chain, wallet.network)!,
                    ),
                  },
                )}
              </WarningDescription>
            </WarningHeader>
            {wallet.credentials.token?.address ? (
              <>
                <ContractHeaderContainer>
                  <TitleContainer>{t('Contract Address')}</TitleContainer>
                  <LinkContainer>
                    <LinkIcon />
                    <ContractLink
                      onPress={() => dispatch(viewOnBlockchain(wallet))}>
                      {t('View Contract')}
                    </ContractLink>
                  </LinkContainer>
                </ContractHeaderContainer>
                <ContractAddressText>
                  {wallet.credentials.token?.address}
                </ContractAddressText>
              </>
            ) : null}
          </WarningContainer>
        )}
        <CloseButtonContainer onPress={_closeModal}>
          <CloseButtonText>{t('CLOSE')}</CloseButtonText>
        </CloseButtonContainer>
      </ReceiveAddressContainer>
    </SheetModal>
  );
};

export default ReceiveAddress;
