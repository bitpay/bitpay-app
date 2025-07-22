import Transport from '@ledgerhq/hw-transport';
import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp, StackActions} from '@react-navigation/core';
import {WalletGroupParamList, WalletScreens} from '../../../WalletGroup';
import {
  useAppDispatch,
  useAppSelector,
  useMount,
} from '../../../../../utils/hooks';
import {
  Key,
  Recipient,
  TransactionProposal,
  TxDetails,
  Utxo,
  Wallet,
} from '../../../../../store/wallet/wallet.models';
import SwipeButton from '../../../../../components/swipe-button/SwipeButton';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
  showConfirmAmountInfoSheet,
  startSendPayment,
} from '../../../../../store/wallet/effects/send/send';
import {
  formatCurrencyAbbreviation,
  formatFiatAmount,
  sleep,
} from '../../../../../utils/helper-methods';
import {
  openUrlWithInAppBrowser,
  startOnGoingProcessModal,
} from '../../../../../store/app/app.effects';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {
  Amount,
  ConfirmContainer,
  ConfirmScrollView,
  DetailsList,
  ExchangeRate,
  Fee,
  Header,
  SendingFrom,
  SendingTo,
  SharedDetailRow,
} from './Shared';
import {BottomNotificationConfig} from '../../../../../components/modal/bottom-notification/BottomNotification';
import {
  CustomErrorMessage,
  WrongPasswordError,
} from '../../../components/ErrorMessages';
import {URL} from '../../../../../constants';
import {BWCErrorMessage} from '../../../../../constants/BWCError';
import TransactionLevel from '../TransactionLevel';
import {
  BaseText,
  H6,
  HeaderTitle,
  InfoDescription,
  InfoHeader,
  InfoTitle,
  Link,
} from '../../../../../components/styled/Text';
import styled from 'styled-components/native';
import {useTranslation} from 'react-i18next';
import {
  ActiveOpacity,
  Hr,
  Info,
  InfoImageContainer,
  InfoTriangle,
  ScreenGutter,
} from '../../../../../components/styled/Containers';
import {Platform} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
  GetFeeOptions,
  getFeeRatePerKb,
} from '../../../../../store/wallet/effects/fee/fee';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {Memo} from './Memo';
import {toFiat} from '../../../../../store/wallet/utils/wallet';
import {
  GetFeeUnits,
  GetPrecision,
  IsERCToken,
  IsVMChain,
} from '../../../../../store/wallet/utils/currency';
import prompt from 'react-native-prompt-android';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import SendingToERC20Warning from '../../../components/SendingToERC20Warning';
import {HIGH_FEE_LIMIT} from '../../../../../constants/wallet';
import WarningSvg from '../../../../../../assets/img/warning.svg';
import {
  ConfirmHardwareWalletModal,
  SimpleConfirmPaymentState,
} from '../../../../../components/modal/confirm-hardware-wallet/ConfirmHardwareWalletModal';
import {BitpaySupportedCoins} from '../../../../../constants/currencies';
import {
  getLedgerErrorMessage,
  prepareLedgerApp,
} from '../../../../../components/modal/import-ledger-wallet/utils';
import {currencyConfigs} from '../../../../../components/modal/import-ledger-wallet/import-account/SelectLedgerCurrency';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import TransportHID from '@ledgerhq/react-native-hid';
import {LISTEN_TIMEOUT, OPEN_TIMEOUT} from '../../../../../constants/config';
import {CommonActions} from '@react-navigation/native';
import {TabsScreens} from '../../../../tabs/TabsStack';
import {RootStacks} from '../../../../../Root';
import {AppActions} from '../../../../../store/app';

const VerticalPadding = styled.View`
  padding: ${ScreenGutter} 0;
`;

export interface SolanaPayOpts {
  reference?: string | null;
  memo?: string | null;
  label?: string | null;
  message?: string | null;
}

export interface ConfirmParamList {
  wallet: Wallet;
  recipient: Recipient;
  recipientList?: Recipient[];
  txp: Partial<TransactionProposal>;
  txDetails: TxDetails;
  amount: number;
  speedup?: boolean;
  sendMax?: boolean;
  inputs?: Utxo[];
  message?: string | undefined;
  solanaPayOpts?: SolanaPayOpts;
}

export const Setting = styled(TouchableOpacity)`
  align-items: center;
  flex-direction: row;
  flex-wrap: nowrap;
  height: 58px;
`;

export const SettingTitle = styled(BaseText)`
  color: ${({theme}) => theme.colors.text};
  flex-grow: 1;
  flex-shrink: 1;
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0;
  text-align: left;
  margin-right: 5px;
`;

const Confirm = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {t} = useTranslation();
  const route = useRoute<RouteProp<WalletGroupParamList, 'Confirm'>>();
  const {
    wallet,
    recipient,
    recipientList,
    txDetails,
    txp: _txp,
    amount,
    speedup,
    sendMax,
    inputs,
    message,
    solanaPayOpts,
  } = route.params;
  const [txp, setTxp] = useState(_txp);
  const allKeys = useAppSelector(({WALLET}) => WALLET.keys);
  const customizeNonce = useAppSelector(({WALLET}) => WALLET.customizeNonce);
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const {isoCode} = useAppSelector(({APP}) => APP.defaultAltCurrency);

  const key = allKeys[wallet?.keyId!];
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [showTransactionLevel, setShowTransactionLevel] = useState(false);
  const [showSendingERC20Modal, setShowSendingERC20Modal] = useState(true);
  const [showHighFeeWarningMessage, setShowHighFeeWarningMessage] =
    useState(false);
  const [isConfirmHardwareWalletModalVisible, setConfirmHardwareWalletVisible] =
    useState(false);
  const [hardwareWalletTransport, setHardwareWalletTransport] =
    useState<Transport | null>(null);
  const [confirmHardwareState, setConfirmHardwareState] =
    useState<SimpleConfirmPaymentState | null>(null);

  const {
    fee: _fee,
    sendingTo,
    sendingFrom,
    subTotal: _subTotal,
    gasLimit: _gasLimit,
    gasPrice: _gasPrice,
    nonce: _nonce,
    total: _total,
    destinationTag: _destinationTag,
    context,
    rateStr,
  } = txDetails;
  const [fee, setFee] = useState(_fee);
  const [total, setTotal] = useState(_total);
  const [subTotal, setSubTotal] = useState(_subTotal);
  const [gasPrice, setGasPrice] = useState(_gasPrice);
  const [gasLimit, setGasLimit] = useState(_gasLimit);
  const [nonce, setNonce] = useState(_nonce);
  const [destinationTag, setDestinationTag] = useState(
    recipient?.destinationTag || _destinationTag,
  );
  const {currencyAbbreviation, chain, tokenAddress} = wallet;
  const feeOptions = GetFeeOptions(chain);
  const {unitToSatoshi} =
    dispatch(GetPrecision(currencyAbbreviation, chain, tokenAddress)) || {};

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>
          {t('Confirm ', {title: speedup ? t('Speed Up') : t('Payment')})}
        </HeaderTitle>
      ),
    });
  }, [navigation, speedup, t]);

  useMount(() => {
    return () => {
      if (hardwareWalletTransport) {
        try {
          hardwareWalletTransport.close();
        } catch (err) {
          // swallow
        }
      }
    };
  });

  // use the ref when doing any work that could cause disconnects and cause a new transport to be passed in mid-function
  const transportRef = useRef(hardwareWalletTransport);
  transportRef.current = hardwareWalletTransport;

  const setPromptOpenAppState = (state: boolean) =>
    state && setConfirmHardwareState('selecting');

  // We need a constant fn (no deps) that persists across renders that we can attach to AND detach from transports
  const onDisconnect = useCallback(async () => {
    let retryAttempts = 2;
    let newTp: Transport | null = null;

    // avoid closure values
    const isBle = transportRef.current instanceof TransportBLE;
    const isHid = transportRef.current instanceof TransportHID;
    const shouldReconnect =
      isConfirmHardwareWalletModalVisible && (isBle || isHid);

    if (!shouldReconnect) {
      setHardwareWalletTransport(null);
      return;
    }

    // try to reconnect a few times
    while (!newTp && retryAttempts > 0) {
      if (isBle) {
        newTp = await TransportBLE.create(OPEN_TIMEOUT, LISTEN_TIMEOUT).catch(
          () => null,
        );
      } else if (isHid) {
        newTp = await TransportHID.create(OPEN_TIMEOUT, LISTEN_TIMEOUT).catch(
          () => null,
        );
      }

      retryAttempts--;
    }

    if (newTp) {
      newTp.on('disconnect', onDisconnect);
    }
    setHardwareWalletTransport(newTp);
  }, []);

  const isTxLevelAvailable = () => {
    const includedChains = ['btc', 'eth', 'matic', 'arb', 'base', 'op'];
    // TODO: exclude paypro, coinbase, usingMerchantFee txs,
    // const {payProUrl} = txDetails;
    return includedChains.includes(chain.toLowerCase());
  };

  const onCloseTxLevelModal = async (
    newLevel?: any,
    customFeePerKB?: number,
  ) => {
    setShowTransactionLevel(false);
    if (newLevel) {
      updateTxProposal({
        feeLevel: newLevel,
        feePerKb: customFeePerKB, // this will be ignore in select input context
      });
    }
  };

  const editValue = (title: string, type: string) => {
    prompt(
      title,
      '',
      [
        {
          text: t('Cancel'),
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: t('OK'),
          onPress: value => {
            const opts: {
              nonce?: number;
              gasLimit?: number;
              destinationTag?: number;
            } = {};
            switch (type) {
              case 'nonce':
                opts.nonce = Number(value);
                break;
              case 'gasLimit':
                opts.gasLimit = Number(value);
                break;
              case 'destinationTag':
                opts.destinationTag = Number(value);
                break;
              default:
                break;
            }
            updateTxProposal(opts);
          },
        },
      ],
      {
        type: Platform.OS === 'ios' ? 'plain-text' : 'numeric',
        cancelable: true,
        defaultValue: '',
        // @ts-ignore
        keyboardType: 'numeric',
      },
    );
  };

  const updateTxProposal = async (newOpts: any) => {
    try {
      dispatch(startOnGoingProcessModal('UPDATING_TXP'));
      const {txDetails: _txDetails, txp: newTxp} = await dispatch(
        createProposalAndBuildTxDetails({
          wallet,
          recipient,
          recipientList,
          amount,
          sendMax,
          inputs,
          context,
          ...txp,
          ...newOpts,
        }),
      );

      setTxp(newTxp);
      setFee(_txDetails.fee);
      setTotal(_txDetails.total);
      setSubTotal(_txDetails.subTotal);
      setGasPrice(_txDetails.gasPrice);
      setGasLimit(_txDetails.gasLimit);
      setNonce(_txDetails.nonce);
      setDestinationTag(_txDetails.destinationTag);
      await sleep(500);
      dispatch(dismissOnGoingProcessModal());
    } catch (err: any) {
      dispatch(dismissOnGoingProcessModal());
      const [errorMessageConfig] = await Promise.all([
        dispatch(handleCreateTxProposalError(err)),
        sleep(400),
      ]);
      dispatch(
        showBottomNotificationModal({
          ...errorMessageConfig,
          enableBackdropDismiss: false,
        }),
      );
    }
  };

  const onCloseModal = async () => {
    await sleep(1000);
    dispatch(AppActions.dismissPaymentSentModal());
    await sleep(1000);
    dispatch(AppActions.clearPaymentSentModalOptions());
  };

  const startSendingPayment = async ({
    transport,
  }: {transport?: Transport} = {}) => {
    const isUsingHardwareWallet = !!transport;

    try {
      if (isUsingHardwareWallet) {
        const {chain, network} = wallet.credentials;
        const configFn = currencyConfigs[chain];
        if (!configFn) {
          throw new Error(`Unsupported currency: ${chain.toUpperCase()}`);
        }
        const params = configFn(network);
        await prepareLedgerApp(
          params.appName,
          transportRef,
          setHardwareWalletTransport,
          onDisconnect,
          setPromptOpenAppState,
        );
        setConfirmHardwareState('sending');
        await sleep(500);
        await dispatch(
          startSendPayment({txp, key, wallet, recipient, transport}),
        );
        setConfirmHardwareState('complete');
        await sleep(1000);
        setConfirmHardwareWalletVisible(false);
      } else {
        dispatch(startOnGoingProcessModal('SENDING_PAYMENT'));
        await sleep(500);
        await dispatch(
          startSendPayment({txp, key, wallet, recipient, transport}),
        );
        dispatch(dismissOnGoingProcessModal());
      }

      dispatch(
        Analytics.track('Sent Crypto', {
          context: 'Confirm',
          coin: currencyAbbreviation || '',
        }),
      );

      dispatch(
        AppActions.showPaymentSentModal({
          isVisible: true,
          onCloseModal,
          title:
            wallet.credentials.n > 1
              ? t('Proposal created')
              : t('Payment Sent'),
        }),
      );

      await sleep(1000);
      if (recipient.type === 'coinbase') {
        navigation.dispatch(StackActions.popToTop());
        navigation.dispatch(StackActions.push('CoinbaseRoot'));
      } else {
        if (IsVMChain(wallet.chain) && wallet.receiveAddress) {
          navigation.dispatch(
            CommonActions.reset({
              index: 2,
              routes: [
                {
                  name: RootStacks.TABS,
                  params: {screen: TabsScreens.HOME},
                },
                {
                  name: WalletScreens.ACCOUNT_DETAILS,
                  params: {
                    keyId: wallet.keyId,
                    selectedAccountAddress: wallet.receiveAddress,
                  },
                },
                {
                  name: WalletScreens.WALLET_DETAILS,
                  params: {
                    walletId: wallet!.id,
                    key,
                  },
                },
              ],
            }),
          );
        } else {
          navigation.dispatch(
            CommonActions.reset({
              index: 1,
              routes: [
                {
                  name: RootStacks.TABS,
                  params: {screen: TabsScreens.HOME},
                },
                {
                  name: WalletScreens.WALLET_DETAILS,
                  params: {
                    walletId: wallet!.id,
                    key,
                  },
                },
              ],
            }),
          );
        }
      }
    } catch (err) {
      if (isUsingHardwareWallet) {
        setConfirmHardwareWalletVisible(false);
        setConfirmHardwareState(null);
        err = getLedgerErrorMessage(err);
      }
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      setResetSwipeButton(true);
      switch (err) {
        case 'invalid password':
          dispatch(showBottomNotificationModal(WrongPasswordError()));
          break;
        case 'password canceled':
          break;
        case 'biometric check failed':
          break;
        case 'user denied transaction':
          break;
        default:
          await showErrorMessage(
            CustomErrorMessage({
              errMsg: BWCErrorMessage(err),
              title: t('Uh oh, something went wrong'),
            }),
          );
      }
    }
  };

  const onSwipeCompleteHardwareWallet = async (key: Key) => {
    if (key.hardwareSource === 'ledger') {
      if (hardwareWalletTransport) {
        setConfirmHardwareWalletVisible(true);
        startSendingPayment({transport: hardwareWalletTransport});
      } else {
        setConfirmHardwareWalletVisible(true);
      }
    } else {
      showErrorMessage(
        CustomErrorMessage({
          errMsg: 'Unsupported hardware wallet',
          title: t('Uh oh, something went wrong'),
        }),
      );
    }
  };

  // on hardware wallet disconnect, just clear the cached transport object
  // errors will be thrown and caught as needed in their respective workflows
  const disconnectFn = () => setHardwareWalletTransport(null);
  const disconnectFnRef = useRef(disconnectFn);
  disconnectFnRef.current = disconnectFn;

  const onHardwareWalletPaired = (args: {transport: Transport}) => {
    const {transport} = args;
    transport.on('disconnect', disconnectFnRef.current);
    setHardwareWalletTransport(transport);
    startSendingPayment({transport});
  };

  const onSwipeComplete = async () => {
    if (key.hardwareSource) {
      await onSwipeCompleteHardwareWallet(key);
    } else {
      await startSendingPayment();
    }
  };

  useEffect(() => {
    if (!resetSwipeButton) {
      return;
    }
    const timer = setTimeout(() => {
      setResetSwipeButton(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [resetSwipeButton]);

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const checkHighFees = async () => {
    const {feeUnitAmount} = GetFeeUnits(chain);
    let feePerKb: number;
    if (txp.feePerKb) {
      feePerKb = txp.feePerKb;
    } else {
      feePerKb = await getFeeRatePerKb({wallet, feeLevel: fee?.feeLevel});
    }
    setShowHighFeeWarningMessage(
      feePerKb / feeUnitAmount >= HIGH_FEE_LIMIT[chain] && txp.amount !== 0,
    );
  };

  useEffect(() => {
    checkHighFees();
  }, [fee]);

  let recipientData, recipientListData;

  if (recipientList) {
    recipientListData = recipientList.map(r => {
      const amountSat = Number(r.amount! * unitToSatoshi!);
      return {
        recipientName: r.name,
        recipientAddress: r.address,
        img: r.type === 'contact' ? r.type : wallet.img,
        recipientAmountStr: `${r.amount} ${formatCurrencyAbbreviation(
          currencyAbbreviation,
        )}`,
        recipientAltAmountStr: formatFiatAmount(
          dispatch(
            toFiat(
              amountSat,
              isoCode,
              currencyAbbreviation,
              chain,
              rates,
              tokenAddress,
            ),
          ),
          isoCode,
        ),
        recipientType: r.type,
        recipientCoin: currencyAbbreviation,
        recipientChain: r.chain,
      };
    });
  }

  if (
    recipient.type &&
    (recipient.type === 'coinbase' || recipient.type === 'contact')
  ) {
    recipientData = {
      recipientName: recipient.name,
      recipientAddress: sendingTo.recipientAddress,
      img: recipient.type,
      recipientChain: recipient.chain,
      recipientType: recipient.type,
      recipientTokenAddress: recipient.tokenAddress,
    };
  } else {
    recipientData = sendingTo;
  }

  return (
    <>
      <ConfirmContainer>
        <ConfirmScrollView
          extraScrollHeight={50}
          contentContainerStyle={{paddingBottom: 50}}
          keyboardShouldPersistTaps={'handled'}>
          <DetailsList keyboardShouldPersistTaps={'handled'}>
            <Header>{t('Summary')}</Header>
            {solanaPayOpts ? (
              <>
                <Hr style={{marginBottom: 15}} />
                <H6>{'SolanaPay Data'}</H6>
                {solanaPayOpts?.label ? (
                  <SharedDetailRow
                    height={40}
                    minHeight={40}
                    description={t('Pay to')}
                    value={solanaPayOpts.label}
                  />
                ) : null}
                {solanaPayOpts?.memo ? (
                  <SharedDetailRow
                    height={40}
                    minHeight={40}
                    description={t('Memo')}
                    value={solanaPayOpts.memo}
                  />
                ) : null}
                {solanaPayOpts?.message ? (
                  <SharedDetailRow
                    height={40}
                    minHeight={40}
                    description={t('Message')}
                    value={solanaPayOpts.message}
                  />
                ) : null}
                {solanaPayOpts?.reference ? (
                  <SharedDetailRow
                    height={40}
                    minHeight={40}
                    description={t('Reference')}
                    value={solanaPayOpts.reference}
                    secondary
                  />
                ) : null}
                <Hr style={{marginTop: 15}} />
              </>
            ) : null}
            <SendingTo
              recipient={recipientData}
              recipientList={recipientListData}
              hr
            />
            <Fee
              onPress={
                isTxLevelAvailable()
                  ? () => setShowTransactionLevel(true)
                  : undefined
              }
              fee={fee}
              feeOptions={feeOptions}
              hr={!showHighFeeWarningMessage}
            />
            {showHighFeeWarningMessage ? (
              <>
                <Info>
                  <InfoTriangle />
                  <InfoHeader>
                    <InfoImageContainer infoMargin={'0 8px 0 0'}>
                      <WarningSvg />
                    </InfoImageContainer>

                    <InfoTitle>
                      {t('Transaction fees are currently high')}
                    </InfoTitle>
                  </InfoHeader>
                  <InfoDescription>
                    {t(
                      'Due to high demand, miner fees are high. Fees are paid to miners who process transactions and are not paid to BitPay.',
                    )}
                  </InfoDescription>
                </Info>
                <Hr />
              </>
            ) : null}
            {gasPrice !== undefined ? (
              <SharedDetailRow
                description={t('Gas price')}
                value={gasPrice.toFixed(2) + ' Gwei'}
                hr
              />
            ) : null}
            {gasLimit !== undefined ? (
              <SharedDetailRow
                description={t('Gas limit')}
                value={gasLimit.toLocaleString()}
                onPress={() => editValue(t('Edit gas limit'), 'gasLimit')}
                hr
              />
            ) : null}
            {nonce !== undefined && nonce !== null ? (
              <SharedDetailRow
                description={t('Nonce')}
                value={nonce}
                onPress={
                  customizeNonce
                    ? () => editValue(t('Edit nonce'), 'nonce')
                    : undefined
                }
                hr
              />
            ) : null}
            <SendingFrom sender={sendingFrom} hr />
            {rateStr ? (
              <ExchangeRate
                description={t('Exchange Rate')}
                rateStr={rateStr}
              />
            ) : null}
            {currencyAbbreviation === 'xrp' ? (
              <>
                <SharedDetailRow
                  description={t('Destination Tag')}
                  value={destinationTag || 'edit'}
                  onPress={() =>
                    editValue(t('Edit destination tag'), 'destinationTag')
                  }
                />
                <Info>
                  <InfoTriangle />
                  <InfoDescription>
                    {t(
                      'A Destination Tag is an optional number that corresponds to an invoice or a XRP account on an exchange.',
                    )}
                  </InfoDescription>

                  <VerticalPadding>
                    <TouchableOpacity
                      activeOpacity={ActiveOpacity}
                      onPress={() => {
                        haptic('impactLight');
                        dispatch(
                          openUrlWithInAppBrowser(URL.HELP_DESTINATION_TAG),
                        );
                      }}>
                      <Link>{t('Learn More')}</Link>
                    </TouchableOpacity>
                  </VerticalPadding>
                </Info>
              </>
            ) : null}
            {txp ? (
              <Memo
                memo={txp.message || message || ''}
                onChange={message => setTxp({...txp, message})}
              />
            ) : null}
            <Amount
              description={t('SubTotal')}
              amount={subTotal}
              height={83}
              chain={chain}
              network={wallet.credentials.network}
              hr
            />
            <Amount
              description={t('Total')}
              amount={total}
              height={
                IsERCToken(wallet.currencyAbbreviation, wallet.chain) ? 110 : 83
              }
              chain={chain}
              network={wallet.credentials.network}
              showInfoIcon={!!subTotal}
              infoIconOnPress={() => {
                dispatch(showConfirmAmountInfoSheet('total'));
              }}
            />
          </DetailsList>

          {isTxLevelAvailable() ? (
            <TransactionLevel
              feeLevel={fee?.feeLevel || 'normal'}
              wallet={wallet}
              isVisible={showTransactionLevel}
              onCloseModal={(selectedLevel, customFeePerKB) =>
                onCloseTxLevelModal(selectedLevel, customFeePerKB)
              }
              customFeePerKB={
                fee?.feeLevel === 'custom' ? txp?.feePerKb : undefined
              }
              feePerSatByte={
                fee?.feeLevel === 'custom' && txp?.feePerKb
                  ? txp?.feePerKb / 1000
                  : undefined
              }
              isSpeedUpTx={speedup}
            />
          ) : null}
        </ConfirmScrollView>
        {wallet && IsERCToken(wallet.currencyAbbreviation, wallet.chain) ? (
          <SendingToERC20Warning
            isVisible={showSendingERC20Modal}
            closeModal={() => {
              setShowSendingERC20Modal(false);
            }}
            wallet={wallet}
          />
        ) : null}
        <SwipeButton
          title={speedup ? t('Speed Up') : t('Slide to send')}
          forceReset={resetSwipeButton}
          onSwipeComplete={onSwipeComplete}
        />
      </ConfirmContainer>

      {key?.hardwareSource && wallet ? (
        <ConfirmHardwareWalletModal
          isVisible={isConfirmHardwareWalletModalVisible}
          state={confirmHardwareState}
          hardwareSource={key.hardwareSource}
          transport={hardwareWalletTransport}
          currencyLabel={BitpaySupportedCoins[wallet.chain]?.name}
          onBackdropPress={() => {
            setConfirmHardwareWalletVisible(false);
            setResetSwipeButton(true);
            setConfirmHardwareState(null);
          }}
          onPaired={onHardwareWalletPaired}
        />
      ) : null}
    </>
  );
};

export default Confirm;
