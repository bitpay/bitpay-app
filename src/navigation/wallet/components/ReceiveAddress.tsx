import React, {useEffect, useState} from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../contexts';
import {useAppDispatch, useLogger} from '../../../utils/hooks';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {BaseText, H4, Paragraph} from '../../../components/styled/Text';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {
  SheetContainer,
  ActiveOpacity,
  CloseButtonContainer,
  isNarrowHeight,
} from '../../../components/styled/Containers';
import haptic from '../../../components/haptic-feedback/haptic';
import {BWCErrorMessage, BWCErrorName} from '../../../constants/BWCError';
import {CustomErrorMessage} from './ErrorMessages';
import {
  Action,
  Black,
  LightBlack,
  LightBlue,
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
import {
  TouchableOpacity,
  TouchableOpacityProps,
} from '@components/base/TouchableOpacity';

export const BchAddressTypes = ['Cash Address', 'Legacy'];

const styles = StyleSheet.create({
  copyToClipboard: {
    borderWidth: 1,
    borderColor: '#9ba3ae',
    borderRadius: 4,
    paddingHorizontal: 10,
    height: 55,
    alignItems: 'center',
    flexDirection: 'row',
  },
  addressText: {
    fontSize: 16,
    paddingLeft: 5,
    paddingRight: 20,
  },
  copyImgContainer: {
    borderRightWidth: 1,
    paddingRight: 10,
    height: 25,
    justifyContent: 'center',
  },
  qrCodeContainer: {
    alignItems: 'center',
    margin: 15,
  },
  qrCodeBackground: {
    backgroundColor: White,
    width: isNarrowHeight ? 190 : 225,
    height: isNarrowHeight ? 190 : 225,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingContainer: {
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginVertical: 10,
    textAlign: 'center',
  },
  receiveAddressContainer: {
    minHeight: 500,
  },
  warningContainer: {
    borderRadius: 4,
    padding: isNarrowHeight ? 5 : 20,
    marginBottom: 20,
  },
  warningHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  warningDescription: {
    fontSize: 14,
    paddingHorizontal: 10,
    lineHeight: 20,
  },
  warningDescriptionToken: {
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
});

const CopyToClipboard: React.FC<TouchableOpacityProps> = ({
  style,
  ...props
}) => <TouchableOpacity style={[styles.copyToClipboard, style]} {...props} />;

interface Props {
  isVisible: boolean;
  closeModal: () => void;
  wallet: Wallet;
  context?: 'accountdetails' | 'globalselect';
}

const ReceiveAddress = ({isVisible, closeModal, wallet, context}: Props) => {
  const {t} = useTranslation();
  const theme = useTheme();
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

  useEffect(() => {
    if (!isVisible || wasInit) {
      return;
    }

    wallet?.getStatus({network: wallet.network}, (err: any, status: Status) => {
      if (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        logger.error(`error [getStatus]: ${errStr}`);
      } else {
        setSingleAddress(status?.wallet?.singleAddress);
      }
    });
  }, [isVisible, logger, wallet, wasInit]);

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
    if (wallet?.isComplete() && !wallet.pendingTssSession) {
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
      <SheetContainer
        style={[
          styles.receiveAddressContainer,
          {backgroundColor: theme.dark ? LightBlack : White},
        ]}>
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
              <View
                style={[
                  styles.copyImgContainer,
                  {borderRightColor: theme.dark ? '#46494E' : LightBlue},
                ]}>
                {!copied ? <CopySvg width={17} /> : <CopiedSvg width={17} />}
              </View>
              <BaseText
                style={[
                  styles.addressText,
                  {color: theme.dark ? NeutralSlate : '#6F7782'},
                ]}
                numberOfLines={1}
                ellipsizeMode={'middle'}>
                {protocolPrefix
                  ? address.replace(protocolPrefix + ':', '')
                  : address}
              </BaseText>
            </CopyToClipboard>

            <View style={styles.qrCodeContainer}>
              <View style={styles.qrCodeBackground}>
                <QRCode value={address} size={isNarrowHeight ? 180 : 200} />
              </View>
            </View>
          </>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <H4 style={[styles.loadingText, {color: theme.colors.text}]}>
              {t('Generating Address...')}
            </H4>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <GhostSvg />
            <H4 style={[styles.loadingText, {color: theme.colors.text}]}>
              {t('Something went wrong. Please try again.')}
            </H4>
          </View>
        )}

        {context &&
        ['accountdetails', 'globalselect'].includes(context) &&
        IsVMChain(wallet.chain) ? (
          <View
            style={[
              styles.warningContainer,
              {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
            ]}>
            <View style={styles.warningHeader}>
              <WarningSvg />
              <BaseText
                style={[
                  styles.warningDescription,
                  {color: theme.dark ? White : Black},
                  wallet.credentials.token?.address
                    ? [
                        styles.warningDescriptionToken,
                        {
                          borderBottomColor: theme.dark
                            ? LightBlack
                            : LightBlue,
                        },
                      ]
                    : null,
                ]}>
                <BaseText
                  style={[styles.warningTitle, {color: theme.colors.text}]}>
                  {t('Warning!')}
                </BaseText>
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
              </BaseText>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.warningContainer,
              {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
            ]}>
            <View style={styles.warningHeader}>
              <WarningSvg />
              <BaseText
                style={[
                  styles.warningDescription,
                  {color: theme.dark ? White : Black},
                  wallet.credentials.token?.address
                    ? [
                        styles.warningDescriptionToken,
                        {
                          borderBottomColor: theme.dark
                            ? LightBlack
                            : LightBlue,
                        },
                      ]
                    : null,
                ]}>
                <BaseText
                  style={[styles.warningTitle, {color: theme.colors.text}]}>
                  {t('Warning!')}
                </BaseText>
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
              </BaseText>
            </View>
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
          </View>
        )}
        <CloseButtonContainer onPress={_closeModal}>
          <Paragraph style={{color: theme.dark ? White : Action}}>
            {t('CLOSE')}
          </Paragraph>
        </CloseButtonContainer>
      </SheetContainer>
    </SheetModal>
  );
};

export default ReceiveAddress;
