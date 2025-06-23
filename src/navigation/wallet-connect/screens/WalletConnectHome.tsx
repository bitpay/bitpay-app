import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import styled from 'styled-components/native';
import {
  H5,
  H7,
  InfoDescription,
  ListItemSubText,
} from '../../../components/styled/Text';
import {
  Caution25,
  LightBlack,
  NeutralSlate,
  Success25,
  Warning25,
} from '../../../styles/colors';
import AngleRight from '../../../../assets/img/angle-right.svg';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  ActiveOpacity,
  Column,
  CtaContainerAbsolute,
  CurrencyColumn,
  CurrencyImageContainer,
  Hr,
  Info,
  Row,
  RowContainer,
} from '../../../components/styled/Containers';
import {HeaderTitle} from '../styled/WalletConnectText';
import {
  IconContainer,
  ItemContainer,
  ItemTitleContainer,
  ScrollView,
  WalletConnectContainer,
} from '../styled/WalletConnectContainers';
import {FlatList, Platform} from 'react-native';
import FastImage from 'react-native-fast-image';
import {sleep} from '../../../utils/helper-methods';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  dismissBottomNotificationModal,
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import Clipboard from '@react-native-clipboard/clipboard';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import {Wallet} from '../../../store/wallet/wallet.models';
import {useTranslation} from 'react-i18next';
import {
  getAddressFrom,
  walletConnectV2OnDeleteSession,
  walletConnectV2RejectCallRequest,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {
  WCV2RequestType,
  WCV2SessionType,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';
import {
  SOLANA_SIGNING_METHODS,
  WALLET_CONNECT_SUPPORTED_CHAINS,
} from '../../../constants/WalletConnectV2';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {WalletConnectHeader} from '../WalletConnectGroup';
import {InAppNotificationContextType} from '../../../store/app/app.models';
import Blockie from '../../../components/blockie/Blockie';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import Button from '../../../components/button/Button';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import WarningOutlineSvg from '../../../../assets/img/warning-outline.svg';
import TrustedDomainSvg from '../../../../assets/img/trusted-domain.svg';
import InvalidDomainSvg from '../../../../assets/img/invalid-domain.svg';
import DefaultImage from '../../../../assets/img/wallet-connect/default-icon.svg';
import {SvgProps} from 'react-native-svg';
import VerifyContextModal from '../../../components/modal/wallet-connect/VerifyModalContext';
import {
  GetAmFormatDate,
  GetAmTimeAgo,
  WithinPastDay,
} from '../../../store/wallet/utils/time';
import {BitpaySupportedCoins} from '../../../constants/currencies';
import {Keys} from '../../../store/wallet/wallet.reducer';

export type WalletConnectHomeParamList = {
  topic?: string;
  selectedAccountAddress: string;
  keyId: string;
  context?: InAppNotificationContextType;
  notificationRequestId?: number;
};

const SummaryContainer = styled.View<{hasRequest: boolean}>`
  padding-bottom: ${({hasRequest}) => (hasRequest ? '0px' : '80px')};
`;

export const NoteContainer = styled(TouchableOpacity)<{isDappUri?: boolean}>`
  background-color: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
  border-radius: 40px;
  max-width: ${({isDappUri}) => (isDappUri ? '175px' : '126px')};
  justify-content: center;
  flex-direction: row;
  align-items: center;
  padding: 10px 20px;
`;

export const NoteLabel = styled(H7)`
  margin-left: 5px;
`;

const PRContainer = styled.View`
  flex: 1;
`;

export const ClipboardContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
`;

const BalanceColumn = styled(Column)`
  align-items: flex-end;
  margin-right: 10px;
`;

const VerifyIconContainer = styled(TouchableOpacity)`
  padding: 10px;
  border-radius: 50px;
`;

const processRequest = (request: WCV2RequestType, keys: Keys) => {
  const {senderAddress, swapFromCurrencyAbbreviation, swapFromChain} = request;

  let wallet = Object.values(keys)
    .flatMap(key => key.wallets)
    .find(
      wallet =>
        wallet.receiveAddress?.toLowerCase() === senderAddress!.toLowerCase() &&
        wallet.chain === swapFromChain &&
        wallet.currencyAbbreviation === swapFromCurrencyAbbreviation,
    );

  let _swapFromCurrencyAbbreviation = swapFromCurrencyAbbreviation;

  if (!wallet) {
    wallet = Object.values(keys)
      .flatMap(key => key.wallets)
      .find(wallet => wallet.chain === swapFromChain);

    _swapFromCurrencyAbbreviation =
      // @ts-ignore
      BitpaySupportedCoins[swapFromChain]?.coin?.toLowerCase();
  }

  const {img, badgeImg} = wallet || {};

  return {
    ...request,
    swapFromCurrencyAbbreviation: _swapFromCurrencyAbbreviation,
    currencyImg: img,
    badgeImg,
  };
};

const WalletConnectHome = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const [accountDisconnected, setAccountDisconnected] = useState(false);
  const [clipboardObj, setClipboardObj] = useState({copied: false, type: ''});
  const [imageError, setImageError] = useState(false);
  const {
    params: {
      topic,
      selectedAccountAddress,
      keyId,
      context,
      notificationRequestId,
    },
  } = useRoute<RouteProp<{params: WalletConnectHomeParamList}>>();
  const key = keys[keyId];
  const keyFullWalletObjs = key.wallets.filter(
    w => w.receiveAddress === selectedAccountAddress,
  );
  const [showVerifyContextBottomModal, setShowVerifyContextBottomModal] =
    useState<boolean>(false);

  // version 2
  const sessionV2: WCV2SessionType | undefined = useAppSelector(
    ({WALLET_CONNECT_V2}) =>
      WALLET_CONNECT_V2.sessions.find(session => session.topic === topic),
  );
  let requestsV2 = useAppSelector(({WALLET_CONNECT_V2}) =>
    WALLET_CONNECT_V2.requests
      .filter(request => {
        const addressFrom = getAddressFrom(request)?.toLowerCase();
        const filterWithAddress = addressFrom
          ? addressFrom === selectedAccountAddress?.toLowerCase()
          : true; // if address exist in request check if it matches with connected wallets addresses
        return request.topic === topic && filterWithAddress;
      })
      .reverse(),
  );

  requestsV2 = requestsV2.map(request => processRequest(request, keys));

  useEffect(() => {
    const checkIfRequestsV2AreIncomplete = async () => {
      const incompleteRequests = requestsV2.filter(
        request =>
          request.params.request.method === 'eth_sendTransaction' &&
          !request.transactionDataName,
      );

      if (incompleteRequests.length > 0) {
        await Promise.all(
          incompleteRequests.map(async request => {
            await rejectCallRequest(request);
          }),
        );
      }
    };

    checkIfRequestsV2AreIncomplete();
  }, [requestsV2]);

  const rejectCallRequest = async (request: WCV2RequestType) => {
    haptic('impactLight');
    try {
      await dispatch(walletConnectV2RejectCallRequest(request));
    } catch (err) {
      dispatch(dismissOnGoingProcessModal());
      await showErrorMessage(
        CustomErrorMessage({
          errMsg: BWCErrorMessage(err),
          title: t('Uh oh, something went wrong'),
        }),
      );
    }
  };

  const {peer} = sessionV2 || {};
  const {name: peerName, icons, url: peerUrl} = peer?.metadata || {};
  const peerIcon = icons && icons[0];
  let VerifyIcon: React.FC<SvgProps> | null = null;
  let bgColor = '';
  switch (sessionV2?.verifyContext?.verified?.validation) {
    case 'UNKNOWN':
      bgColor = Warning25;
      VerifyIcon = WarningOutlineSvg;
      break;
    case 'VALID':
      bgColor = Success25;
      VerifyIcon = TrustedDomainSvg;
      break;
    case 'INVALID':
      bgColor = Caution25;
      VerifyIcon = InvalidDomainSvg;
      break;
  }

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const disconnectAccount = useCallback(async () => {
    if (!sessionV2) {
      return;
    }
    haptic('impactLight');
    dispatch(
      showBottomNotificationModal({
        type: 'question',
        title: t('Confirm delete'),
        message: t('Are you sure you want to delete this session?'),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('DELETE'),
            action: async () => {
              dispatch(dismissBottomNotificationModal());
              await sleep(600);
              try {
                await dispatch(
                  walletConnectV2OnDeleteSession(
                    sessionV2.topic,
                    sessionV2.pairingTopic,
                  ),
                );
              } catch (err) {
                await showErrorMessage(
                  CustomErrorMessage({
                    errMsg: BWCErrorMessage(err),
                    title: t('Uh oh, something went wrong'),
                  }),
                );
              }
            },
            primary: true,
          },
          {
            text: t('GO BACK'),
            action: () => {},
          },
        ],
      }),
    );
  }, [dispatch, sessionV2]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => WalletConnectHeader(),
    });
  }, [navigation, disconnectAccount, t]);

  const goToConfirmView = async (request: any, wallet: Wallet) => {
    try {
      dispatch(dismissBottomNotificationModal());
      await sleep(500);

      const {to: toAddress} = request?.params?.request?.params?.[0] ?? {};

      const recipient = {
        address: toAddress || request.recipientAddress,
      };

      if (!recipient.address) {
        navigation.navigate('WalletConnectRequestDetails', {
          request,
          wallet,
          peerName,
          topic,
        });
        return;
      }

      navigation.navigate('WalletConnectConfirm', {
        wallet: wallet,
        recipient,
        request,
        peerName,
        peerUrl,
        icons,
        topic: sessionV2?.topic!,
        selectedAccountAddress,
      });
    } catch (error: any) {
      await showErrorMessage(
        CustomErrorMessage({
          errMsg: BWCErrorMessage(error.err ? error.err : error),
          title: t('Uh oh, something went wrong'),
        }),
      );
    }
  };

  const copyToClipboard = (value: string, type: string) => {
    haptic('impactLight');
    if (!clipboardObj.copied && value) {
      Clipboard.setString(value);
      setClipboardObj({copied: true, type});

      setTimeout(() => {
        setClipboardObj({copied: false, type});
      }, 3000);
    }
  };

  const handleRequestMethod = (request: WCV2RequestType, wallet: Wallet) => {
    const {method} = request.params.request;
    method !== 'eth_sendTransaction' &&
    method !== 'eth_signTransaction' &&
    method !== SOLANA_SIGNING_METHODS.SIGN_TRANSACTION
      ? navigation.navigate('WalletConnectRequestDetails', {
          request,
          wallet,
          peerName,
          topic,
        })
      : goToConfirmView(request, wallet);
  };

  useEffect(() => {
    if (!clipboardObj.copied) {
      return;
    }
    const timer = setTimeout(() => {
      setClipboardObj({copied: false, type: clipboardObj.type});
    }, 3000);

    return () => clearTimeout(timer);
  }, [clipboardObj]);

  useEffect(() => {
    if (!sessionV2) {
      setAccountDisconnected(true);
    }
  }, [sessionV2]);

  useEffect(() => {
    if (accountDisconnected) {
      navigation.goBack();
    }
  }, [accountDisconnected]);

  useEffect(() => {
    if (
      context &&
      ['notification'].includes(context) &&
      notificationRequestId
    ) {
      const requestV2 = requestsV2.find(({id}) => id === notificationRequestId);
      if (!requestV2) {
        return;
      }
      const {swapFromCurrencyAbbreviation} = requestV2;
      const {chainId} = requestV2.params;
      const chain = WALLET_CONNECT_SUPPORTED_CHAINS[chainId]?.chain;
      const wallet = keyFullWalletObjs.find(
        wallet =>
          wallet.receiveAddress === selectedAccountAddress &&
          wallet.chain === chain &&
          wallet.currencyAbbreviation === swapFromCurrencyAbbreviation,
      );
      if (!wallet) {
        showErrorMessage(
          CustomErrorMessage({
            errMsg: t('No wallet available for performing this action'),
            title: t('Uh oh, something went wrong'),
          }),
        );
        return;
      }
      handleRequestMethod(requestV2, wallet);
    }
  }, [context]);

  const closeModal = () => {
    setShowVerifyContextBottomModal(false);
  };

  const renderCreatedOn = (createdOn: number | undefined) => {
    return createdOn ? (
      <ListItemSubText textAlign="right" style={{width: 500}}>
        {WithinPastDay(createdOn)
          ? t('Created ', {date: GetAmTimeAgo(createdOn)})
          : t('Created on', {date: GetAmFormatDate(createdOn)})}
      </ListItemSubText>
    ) : null;
  };

  const renderCurrencyDetails = (
    method: string,
    swapFormatAmount: string | undefined,
    transactionDataName: string | undefined,
    swapFiatAmount: string | undefined,
    createdOn: number | undefined,
  ) => (
    <>
      <H5
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{textTransform: 'uppercase', marginRight: -1}}>
        {swapFormatAmount || transactionDataName || method}
      </H5>
      {swapFiatAmount ? (
        <ListItemSubText textAlign={'right'}>{swapFiatAmount}</ListItemSubText>
      ) : (
        renderCreatedOn(createdOn)
      )}
    </>
  );

  const renderItem = useCallback(
    ({item, index}: {item: WCV2RequestType; index: number}) => {
      const isLast = index === requestsV2.length - 1;
      const {method} = item.params.request;
      const {
        swapFromCurrencyAbbreviation,
        swapFromChain,
        currencyImg,
        badgeImg,
        swapFormatAmount,
        swapFiatAmount,
        transactionDataName,
        createdOn,
      } = item;

      const wallet = keyFullWalletObjs.find(
        wallet =>
          wallet.receiveAddress === selectedAccountAddress &&
          wallet.chain === swapFromChain &&
          wallet.currencyAbbreviation === swapFromCurrencyAbbreviation,
      );
      if (!wallet) {
        return <></>;
      }

      const {currencyName, walletName} = wallet;

      return (
        <RowContainer
          activeOpacity={ActiveOpacity}
          onPress={() => {
            haptic('impactLight');
            const requestV2 = requestsV2.find(
              ({id: reqId}) => reqId === item.id,
            ) as WCV2RequestType;
            handleRequestMethod(requestV2, wallet);
          }}
          style={{borderBottomWidth: isLast ? 0 : 1}}>
          <CurrencyImageContainer>
            <CurrencyImage
              img={currencyImg || ''}
              badgeUri={badgeImg}
              size={45}
            />
          </CurrencyImageContainer>
          <CurrencyColumn>
            <Row>
              <H5 ellipsizeMode="tail" numberOfLines={1}>
                {walletName || currencyName}
              </H5>
            </Row>
            {swapFromChain ? (
              <Row style={{alignItems: 'center'}}>
                <ListItemSubText
                  ellipsizeMode="tail"
                  numberOfLines={1}
                  style={{marginTop: Platform.OS === 'ios' ? 2 : 0}}>
                  {item.swapFromCurrencyAbbreviation?.toUpperCase()}
                </ListItemSubText>
              </Row>
            ) : null}
          </CurrencyColumn>
          <BalanceColumn>
            {renderCurrencyDetails(
              method,
              swapFormatAmount,
              transactionDataName,
              swapFiatAmount,
              createdOn,
            )}
          </BalanceColumn>
          <IconContainer>
            <AngleRight />
          </IconContainer>
        </RowContainer>
      );
    },
    [requestsV2],
  );

  return (
    <WalletConnectContainer>
      <ScrollView>
        <SummaryContainer hasRequest={requestsV2 && requestsV2.length > 0}>
          <HeaderTitle>{t('Summary')}</HeaderTitle>
          <Hr />
          <ItemContainer>
            <H7>{t('Connected to')}</H7>
            {peerUrl ? (
              <ClipboardContainer>
                {clipboardObj.copied && clipboardObj.type === 'dappUri' ? (
                  <CopiedSvg width={17} />
                ) : null}
                {VerifyIcon ? (
                  <VerifyIconContainer
                    style={{
                      backgroundColor: bgColor,
                    }}
                    onPress={() => setShowVerifyContextBottomModal(true)}>
                    <VerifyIcon />
                  </VerifyIconContainer>
                ) : null}
                <NoteContainer
                  isDappUri={true}
                  disabled={clipboardObj.copied}
                  onPress={() =>
                    peerUrl ? copyToClipboard(peerUrl, 'dappUri') : null
                  }>
                  <IconContainer>
                    {peerIcon && !imageError ? (
                      <FastImage
                        source={{uri: peerIcon}}
                        style={{width: 19, height: 19}}
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <DefaultImage width={19} height={19} />
                    )}
                  </IconContainer>

                  <NoteLabel numberOfLines={1} ellipsizeMode={'tail'}>
                    {peerUrl?.replace('https://', '')}
                  </NoteLabel>
                </NoteContainer>
              </ClipboardContainer>
            ) : null}
          </ItemContainer>
          <Hr />
          <ItemContainer>
            <H7>{t('Linked Wallet')}</H7>
            {selectedAccountAddress ? (
              <ClipboardContainer>
                {clipboardObj.copied && clipboardObj.type === 'address' ? (
                  <CopiedSvg width={17} />
                ) : null}
                <NoteContainer
                  disabled={clipboardObj.copied}
                  onPress={() =>
                    copyToClipboard(selectedAccountAddress!, 'address')
                  }>
                  <IconContainer>
                    <Blockie size={19} seed={selectedAccountAddress} />
                  </IconContainer>
                  <NoteLabel numberOfLines={1} ellipsizeMode={'middle'}>
                    {selectedAccountAddress}
                  </NoteLabel>
                </NoteContainer>
              </ClipboardContainer>
            ) : null}
          </ItemContainer>
          <Hr />
          {requestsV2 && requestsV2.length > 0 ? (
            <Info style={{minHeight: 80, marginTop: 20, marginBottom: 20}}>
              <InfoDescription>
                {t(
                  'Complete or clear pending requests to allow new ones to come in',
                )}
              </InfoDescription>
            </Info>
          ) : null}
        </SummaryContainer>
        <PRContainer>
          <HeaderTitle>{t('Pending Request')}</HeaderTitle>
          <Hr />
          {requestsV2 && requestsV2.length > 0 ? (
            <FlatList
              contentContainerStyle={{paddingTop: 20, paddingBottom: 100}}
              data={requestsV2}
              keyExtractor={(_item, index) => index.toString()}
              renderItem={renderItem}
            />
          ) : (
            <ItemContainer>
              <ItemTitleContainer>
                <H7>{t('No pending request')}</H7>
              </ItemTitleContainer>
            </ItemContainer>
          )}
        </PRContainer>
      </ScrollView>
      <CtaContainerAbsolute background={true}>
        <Button
          buttonStyle="danger"
          buttonOutline={true}
          onPress={async () => {
            haptic('impactLight');
            disconnectAccount();
          }}>
          {t('Disconnect')}
        </Button>
      </CtaContainerAbsolute>

      <VerifyContextModal
        isVisible={showVerifyContextBottomModal}
        closeModal={closeModal}
        sessionV2={sessionV2}
        onRemovePress={disconnectAccount}
      />
    </WalletConnectContainer>
  );
};

export default WalletConnectHome;
