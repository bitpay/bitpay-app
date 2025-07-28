import Transport from '@ledgerhq/hw-transport';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ScrollView} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
  useTheme,
  RouteProp,
  useRoute,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import styled from 'styled-components/native';
import cloneDeep from 'lodash.clonedeep';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../../utils/hooks';
import SwapCheckoutSkeleton from './SwapCheckoutSkeleton';
import {BWCErrorMessage} from '../../../../constants/BWCError';
import {Black, White, Caution} from '../../../../styles/colors';
import {BwcProvider} from '../../../../lib/bwc';
import {WrongPasswordError} from '../../../wallet/components/ErrorMessages';
import SwipeButton from '../../../../components/swipe-button/SwipeButton';
import {H5, H7} from '../../../../components/styled/Text';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import Checkbox from '../../../../components/checkbox/Checkbox';
import {
  Wallet,
  TransactionProposal,
  SendMaxInfo,
  Key,
} from '../../../../store/wallet/wallet.models';
import {createWalletAddress} from '../../../../store/wallet/effects/address/address';
import {
  toFiat,
  GetProtocolPrefixAddress,
} from '../../../../store/wallet/utils/wallet';
import {
  GetName,
  GetPrecision,
  IsERCToken,
  IsEVMChain,
} from '../../../../store/wallet/utils/currency';
import {
  FormatAmountStr,
  GetExcludedUtxosMessage,
  parseAmountToStringIfBN,
  SatToUnit,
} from '../../../../store/wallet/effects/amount/amount';
import {
  changellyCreateFixTransaction,
  changellyGetFixRateForAmount,
  getChangellyFixedCurrencyAbbreviation,
} from '../utils/changelly-utils';
import {
  getBadgeImg,
  getCurrencyAbbreviation,
  getCWCChain,
  getSolanaTokens,
  sleep,
} from '../../../../utils/helper-methods';
import ChangellyPoliciesModal from '../components/ChangellyPoliciesModal';
import {
  ItemDivisor,
  RowDataContainer,
  FiatAmountContainer,
  RowLabel,
  RowData,
  FiatAmount,
  SelectedOptionContainer,
  SelectedOptionText,
  SelectedOptionCol,
  CoinIconContainer,
  CheckBoxContainer,
  CheckboxText,
  PoliciesContainer,
  PoliciesText,
  CheckBoxCol,
} from '../styled/SwapCryptoCheckout.styled';
import {startGetRates} from '../../../../store/wallet/effects';
import {startOnGoingProcessModal} from '../../../../store/app/app.effects';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  dismissBottomNotificationModal,
} from '../../../../store/app/app.actions';
import {
  createTxProposal,
  handleCreateTxProposalError,
  publishAndSign,
} from '../../../../store/wallet/effects/send/send';
import {changellyTxData} from '../../../../store/swap-crypto/swap-crypto.models';
import {SwapCryptoActions} from '../../../../store/swap-crypto';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../../../store';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {changellyGetTransactions} from '../../../../store/swap-crypto/effects/changelly/changelly';
import {RootStacks} from '../../../../Root';
import {TabsScreens} from '../../../../navigation/tabs/TabsStack';
import {ExternalServicesSettingsScreens} from '../../../../navigation/tabs/settings/external-services/ExternalServicesGroup';
import {
  ConfirmHardwareWalletModal,
  SimpleConfirmPaymentState,
} from '../../../../components/modal/confirm-hardware-wallet/ConfirmHardwareWalletModal';
import {BitpaySupportedCoins} from '../../../../constants/currencies';
import {
  getLedgerErrorMessage,
  prepareLedgerApp,
} from '../../../../components/modal/import-ledger-wallet/utils';
import {currencyConfigs} from '../../../../components/modal/import-ledger-wallet/import-account/SelectLedgerCurrency';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import TransportHID from '@ledgerhq/react-native-hid';
import {LISTEN_TIMEOUT, OPEN_TIMEOUT} from '../../../../constants/config';
import {AppActions} from '../../../../store/app';

// Styled
export const SwapCheckoutContainer = styled.SafeAreaView`
  flex: 1;
  margin: 14px;
`;

export interface ChangellyCheckoutProps {
  fromWalletSelected: Wallet;
  toWalletSelected: Wallet;
  fixedRateId: string;
  amountFrom: number;
  useSendMax?: boolean;
  sendMaxInfo?: SendMaxInfo;
}

let countDown: NodeJS.Timeout | undefined;

const ChangellyCheckout: React.FC = () => {
  let {
    params: {
      fromWalletSelected,
      toWalletSelected,
      fixedRateId,
      amountFrom,
      useSendMax,
      sendMaxInfo,
    },
  } = useRoute<RouteProp<{params: ChangellyCheckoutProps}>>();
  const {t} = useTranslation();
  const logger = useLogger();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const BWC = BwcProvider.getInstance();
  const scrollViewRef = useRef<ScrollView>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showCheckTermsMsg, setShowCheckTermsMsg] = useState(false);
  const [remainingTimeStr, setRemainingTimeStr] = useState<string>('');
  const [amountExpectedFrom, setAmountExpectedFrom] =
    useState<number>(amountFrom);
  const [amountTo, setAmountTo] = useState<number>();
  const [fiatAmountTo, setFiatAmountTo] = useState<number>();
  const [fee, setFee] = useState<number>();
  const [ctxp, setCtxp] = useState<Partial<TransactionProposal>>();
  const [totalExchangeFee, setTotalExchangeFee] = useState<number>();
  const [changellyPoliciesModalVisible, setChangellyPoliciesModalVisible] =
    useState(false);
  const [exchangeTxId, setExchangeTxId] = useState<string>();
  const [paymentExpired, setPaymentExpired] = useState(false);
  const key = useAppSelector(
    ({WALLET}: RootState) => WALLET.keys[fromWalletSelected.keyId],
  );
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [txData, setTxData] = useState<any>();

  const [isConfirmHardwareWalletModalVisible, setConfirmHardwareWalletVisible] =
    useState(false);
  const [hardwareWalletTransport, setHardwareWalletTransport] =
    useState<Transport | null>(null);
  const [confirmHardwareState, setConfirmHardwareState] =
    useState<SimpleConfirmPaymentState | null>(null);

  const alternativeIsoCode = 'USD';
  let addressFrom: string; // Refund address
  let addressTo: string; // Receiving address
  let payinExtraId: string;
  let status: string;
  let payinAddress: string;

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

  const createFixTransaction = async (tries: number) => {
    try {
      addressFrom = (await dispatch<any>(
        createWalletAddress({wallet: fromWalletSelected, newAddress: false}),
      )) as string;
      addressTo = (await dispatch<any>(
        createWalletAddress({wallet: toWalletSelected, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      dispatch(dismissOnGoingProcessModal());
      await sleep(400);
      return;
    }

    if (
      fromWalletSelected.currencyAbbreviation.toLowerCase() === 'bch' &&
      fromWalletSelected.chain.toLowerCase() === 'bch'
    ) {
      addressFrom = dispatch(
        GetProtocolPrefixAddress(
          fromWalletSelected.currencyAbbreviation,
          fromWalletSelected.network,
          addressFrom,
          fromWalletSelected.chain,
        ),
      );
    }

    const createFixTxData = {
      amountFrom: amountExpectedFrom,
      coinFrom: getChangellyFixedCurrencyAbbreviation(
        fromWalletSelected.currencyAbbreviation.toLowerCase(),
        fromWalletSelected.chain,
      ),
      coinTo: getChangellyFixedCurrencyAbbreviation(
        toWalletSelected.currencyAbbreviation.toLowerCase(),
        toWalletSelected.chain,
      ),
      addressTo: cloneDeep(addressTo),
      refundAddress: cloneDeep(addressFrom),
      fixedRateId: cloneDeep(fixedRateId),
    };

    changellyCreateFixTransaction(fromWalletSelected, createFixTxData)
      .then(async data => {
        if (data.error) {
          logger.error(
            'Changelly createFixTransaction Error: ' + data.error.message,
          );

          if (data.error.message.includes("Can't exchange this currencies")) {
            const msg = t(
              "Can't exchange this currencies, please try again later.",
            );
            const reason = `Can't exchange this currencies error. Trying to exchange from ${fromWalletSelected.currencyAbbreviation.toLowerCase()}_${
              fromWalletSelected.chain
            } to ${toWalletSelected.currencyAbbreviation.toLowerCase()}_${
              toWalletSelected.chain
            }`;
            showError(msg, reason);
          } else if (
            Math.abs(data.error.code) === 32602 ||
            Math.abs(data.error.code) === 32603
          ) {
            logger.debug(
              'Changelly rateId was expired or already used. Generating a new one',
            );
            if (tries < 2) {
              updateReceivingAmount(tries);
            } else {
              const msg = t(
                'Failed to create transaction for Changelly, please try again later.',
              );
              const reason = 'Rate expired or already used';
              showError(msg, reason);
            }
          } else {
            const reason = 'createFixTransaction Error';
            showError(data.error.message, reason);
          }
          return;
        }

        let changellyFee = 0;
        let apiExtraFee = 0;

        if (data.result.changellyFee && data.result.apiExtraFee) {
          changellyFee = Number(data.result.changellyFee);
          apiExtraFee = Number(data.result.apiExtraFee);
        } else {
          try {
            const transactionData = await changellyGetTransactions(
              data.result.id,
            );
            if (transactionData.result[0]) {
              if (Number(transactionData.result[0].changellyFee) > 0) {
                changellyFee = Number(transactionData.result[0].changellyFee);
              }
              if (Number(transactionData.result[0].apiExtraFee) > 0) {
                apiExtraFee = Number(transactionData.result[0].apiExtraFee);
              }
            }
          } catch (e) {
            logger.warn(
              `Error getting transactionData with id: ${data.result.id}`,
            );
          }
        }

        if (changellyFee >= 0 && apiExtraFee >= 0) {
          // changellyFee and apiExtraFee (Bitpay fee) are in percents
          const receivingPercentage = 100 - changellyFee - apiExtraFee;
          let exchangeFee =
            (changellyFee * data.result.amountExpectedTo) / receivingPercentage;
          let bitpayFee =
            (apiExtraFee * data.result.amountExpectedTo) / receivingPercentage;
          setTotalExchangeFee(exchangeFee + bitpayFee);
          logger.debug(
            `Changelly fee: ${exchangeFee} - BitPay fee: ${bitpayFee} - Total fee: ${
              exchangeFee + bitpayFee
            }`,
          );
        }

        if (
          fromWalletSelected.currencyAbbreviation.toLowerCase() === 'bch' &&
          fromWalletSelected.chain.toLowerCase() === 'bch'
        ) {
          payinAddress = BWC.getBitcoreCash()
            .Address(data.result.payinAddress)
            .toString(true);
        } else {
          payinAddress = data.result.payinAddress;
        }

        payinExtraId = data.result.payinExtraId
          ? data.result.payinExtraId
          : undefined; // (destinationTag) Used for coins like: XRP, XLM, EOS, IGNIS, BNB, XMR, ARDOR, DCT, XEM
        setExchangeTxId(data.result.id);
        setAmountExpectedFrom(Number(data.result.amountExpectedFrom));
        setAmountTo(Number(data.result.amountExpectedTo));
        status = data.result.status;

        try {
          const rates = await dispatch(startGetRates({}));
          const precision = dispatch(
            GetPrecision(
              toWalletSelected.currencyAbbreviation,
              toWalletSelected.chain,
              toWalletSelected.tokenAddress,
            ),
          );
          const newFiatAmountTo = dispatch(
            toFiat(
              Number(data.result.amountExpectedTo) * precision!.unitToSatoshi,
              alternativeIsoCode,
              toWalletSelected.currencyAbbreviation.toLowerCase(),
              toWalletSelected.chain,
              rates,
              toWalletSelected.tokenAddress,
            ),
          );
          setFiatAmountTo(newFiatAmountTo);
        } catch (err) {
          logger.error('toFiat Error');
        }

        paymentTimeControl(data.result.payTill);

        const precision = dispatch(
          GetPrecision(
            fromWalletSelected.currencyAbbreviation,
            fromWalletSelected.chain,
            fromWalletSelected.tokenAddress,
          ),
        );
        // To Sat
        const depositSat = Number(
          (amountExpectedFrom * precision!.unitToSatoshi).toFixed(0),
        );

        try {
          const ctxp = await createTx(
            fromWalletSelected,
            payinAddress,
            depositSat,
            payinExtraId,
          );
          setCtxp(ctxp);
          setFee(ctxp.fee);

          const _txData = {
            addressFrom,
            addressTo,
            payinExtraId,
            status,
            payinAddress,
          };
          setTxData(_txData);

          setIsLoading(false);
          dispatch(dismissOnGoingProcessModal());
          await sleep(400);

          if (useSendMax) {
            showSendMaxWarning(
              ctxp.coin,
              ctxp.chain,
              fromWalletSelected.tokenAddress,
            );
          }
          return;
        } catch (err: any) {
          const reason = 'createTx Error';
          if (err.code) {
            showError(err.message, reason, err.code, err.title, err.actions);
            return;
          }

          let msg = t('Error creating transaction');
          let errorMsgLog;
          if (typeof err?.message === 'string') {
            msg = msg + `: ${err.message}`;
            errorMsgLog = err.message;
          }

          showError(msg, reason, errorMsgLog);
          return;
        }
      })
      .catch(err => {
        logger.error(
          'Changelly createFixTransaction Error: ' + JSON.stringify(err),
        );
        const msg = t(
          'Changelly is not available at this moment. Please try again later.',
        );
        showError(msg);
        return;
      });
  };

  const paymentTimeControl = (expires: string): void => {
    const expirationTime = Math.floor(new Date(expires).getTime() / 1000);
    setPaymentExpired(false);
    setExpirationTime(expirationTime);

    countDown = setInterval(() => {
      setExpirationTime(expirationTime, countDown);
    }, 1000);
  };

  const setExpirationTime = (
    expirationTime: number,
    countDown?: NodeJS.Timeout,
  ): void => {
    const now = Math.floor(Date.now() / 1000);

    if (now > expirationTime) {
      setPaymentExpired(true);
      setRemainingTimeStr('Expired');
      if (countDown) {
        /* later */
        clearInterval(countDown);
      }
      dispatch(
        Analytics.track('Failed Crypto Swap', {
          exchange: 'changelly',
          context: 'ChangellyCheckout',
          reasonForFailure: 'Time to make the payment expired',
          amountFrom: amountFrom || '',
          fromCoin:
            fromWalletSelected.currencyAbbreviation?.toLowerCase() || '',
          fromChain: fromWalletSelected.chain?.toLowerCase() || '',
          toCoin: toWalletSelected.currencyAbbreviation?.toLowerCase() || '',
          toChain: toWalletSelected.chain?.toLowerCase() || '',
        }),
      );
      return;
    }

    const totalSecs = expirationTime - now;
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    setRemainingTimeStr(('0' + m).slice(-2) + ':' + ('0' + s).slice(-2));
  };

  const updateReceivingAmount = (tries: number) => {
    logger.debug(`updateReceivingAmount. tries: ${tries}`);
    if (!fromWalletSelected || !toWalletSelected || !amountExpectedFrom) {
      return;
    }
    const fixRateForAmountData = {
      amountFrom: amountExpectedFrom,
      coinFrom: getChangellyFixedCurrencyAbbreviation(
        fromWalletSelected.currencyAbbreviation.toLowerCase(),
        fromWalletSelected.chain,
      ),
      coinTo: getChangellyFixedCurrencyAbbreviation(
        toWalletSelected.currencyAbbreviation.toLowerCase(),
        toWalletSelected.chain,
      ),
    };
    changellyGetFixRateForAmount(fromWalletSelected, fixRateForAmountData)
      .then(data => {
        if (data.error) {
          const msg =
            t('Changelly getFixRateForAmount Error: ') + data.error.message;
          const reason = 'getFixRateForAmount Error';
          showError(msg, reason);
          return;
        }
        fixedRateId = data.result[0].id;
        setAmountTo(Number(data.result[0].amountTo));

        createFixTransaction(++tries);
      })
      .catch(err => {
        logger.error(JSON.stringify(err));
        let msg = t(
          'Changelly is not available at this moment. Please try again later.',
        );
        const reason = 'getFixRateForAmount Error';
        showError(msg, reason);
      });
  };

  const createTx = async (
    wallet: Wallet,
    payinAddress: string,
    depositSat: number,
    destTag?: string,
  ): Promise<TransactionProposal> => {
    try {
      const message =
        fromWalletSelected.currencyAbbreviation.toUpperCase() +
        ' ' +
        t('to') +
        ' ' +
        toWalletSelected.currencyAbbreviation.toUpperCase();
      let outputs = [];

      outputs.push({
        toAddress: payinAddress,
        amount: depositSat,
        message: message,
      });

      let txp: Partial<TransactionProposal> = {
        toAddress: payinAddress,
        amount: depositSat,
        chain: wallet.chain,
        outputs,
        message: message,
        excludeUnconfirmedUtxos: true, // Do not use unconfirmed UTXOs
        customData: {
          changelly: payinAddress,
          service: 'changelly',
        },
      };

      if (IsERCToken(wallet.currencyAbbreviation, wallet.chain)) {
        if (wallet.tokenAddress) {
          txp.tokenAddress = wallet.tokenAddress;
          if (IsEVMChain(txp.chain!)) {
            if (txp.outputs) {
              for (const output of txp.outputs) {
                if (output.amount) {
                  output.amount = parseAmountToStringIfBN(output.amount);
                }
                if (!output.data) {
                  output.data = BWC.getCore()
                    .Transactions.get({chain: getCWCChain(wallet.chain)})
                    .encodeData({
                      recipients: [
                        {address: output.toAddress, amount: output.amount},
                      ],
                      tokenAddress: wallet.tokenAddress,
                    });
                }
              }
            }
          } else {
            const fromSolanaTokens = await getSolanaTokens(
              wallet?.receiveAddress!,
              wallet?.network,
            );
            const fromAta = fromSolanaTokens.find((item: any) => {
              return item.mintAddress === txp.tokenAddress;
            });
            txp.fromAta = fromAta?.ataAddress;
            txp.decimals = fromAta?.decimals;
          }
        }
      }
      if (useSendMax && sendMaxInfo) {
        txp.inputs = sendMaxInfo.inputs;
        txp.fee = sendMaxInfo.fee;
        txp.feePerKb = undefined;
      } else {
        if (['btc', 'eth', 'matic'].includes(wallet.chain)) {
          txp.feeLevel = 'priority';
        } // Avoid expired order due to slow TX confirmation
      }

      if (destTag) {
        txp.destinationTag = Number(destTag);
      }

      const ctxp = await dispatch(createTxProposal(wallet, txp));
      return Promise.resolve(ctxp);
    } catch (err: any) {
      const errStr =
        err instanceof Error
          ? err.message
          : err?.err?.message ?? JSON.stringify(err);
      const log = `changellyCheckout createTxProposal error: ${errStr}`;
      logger.error(log);
      const errorMessageConfig = await dispatch(
        handleCreateTxProposalError(err, undefined, 'swap'),
      );
      return Promise.reject(errorMessageConfig);
    }
  };

  const makePayment = async ({transport}: {transport?: Transport}) => {
    const isUsingHardwareWallet = !!transport;
    try {
      if (isUsingHardwareWallet) {
        const {chain, network} = fromWalletSelected.credentials;
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
          publishAndSign({
            txp: ctxp! as TransactionProposal,
            key,
            wallet: fromWalletSelected,
            transport,
          }),
        );
        setConfirmHardwareState('complete');
        await sleep(1000);
        setConfirmHardwareWalletVisible(false);
      } else {
        dispatch(startOnGoingProcessModal('SENDING_PAYMENT'));
        await sleep(400);
        await dispatch(
          publishAndSign({
            txp: ctxp! as TransactionProposal,
            key,
            wallet: fromWalletSelected,
          }),
        );
      }
      saveChangellyTx();
      dispatch(dismissOnGoingProcessModal());
      await sleep(400);

      dispatch(
        AppActions.showPaymentSentModal({
          isVisible: true,
          onCloseModal,
          title:
            fromWalletSelected?.credentials?.n > 1
              ? t('Payment Sent')
              : t('Payment Accepted'),
        }),
      );

      await sleep(1200);
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            {
              name: RootStacks.TABS,
              params: {screen: TabsScreens.HOME},
            },
            {
              name: ExternalServicesSettingsScreens.CHANGELLY_SETTINGS,
            },
          ],
        }),
      );
    } catch (err: any) {
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
          logger.error(JSON.stringify(err));
          let msg = t('Uh oh, something went wrong. Please try again later');
          const reason = 'publishAndSign Error';
          if (typeof err?.message === 'string') {
            msg = `${msg}.\n${BWCErrorMessage(err)}`;
          }
          showError(msg, reason);
      }
    }
  };

  const onCloseModal = async () => {
    await sleep(1000);
    dispatch(AppActions.dismissPaymentSentModal());
    await sleep(1000);
    dispatch(AppActions.clearPaymentSentModalOptions());
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
    makePayment({transport});
  };

  const onSwipeComplete = async () => {
    try {
      logger.debug('Swipe completed. Making payment...');
      if (key.hardwareSource) {
        await onSwipeCompleteHardwareWallet(key);
      } else {
        await makePayment({});
      }
    } catch (err) {}
  };

  const onSwipeCompleteHardwareWallet = async (key: Key) => {
    if (key.hardwareSource === 'ledger') {
      if (hardwareWalletTransport) {
        setConfirmHardwareWalletVisible(true);
        await makePayment({transport: hardwareWalletTransport});
      } else {
        setConfirmHardwareWalletVisible(true);
      }
    } else {
      const msg = t('Uh oh, something went wrong. Please try again later');
      showError(msg, t('Unsupported hardware wallet'));
    }
  };

  const saveChangellyTx = () => {
    const newData: changellyTxData = {
      exchangeTxId: exchangeTxId!,
      date: Date.now(),
      amountTo: amountTo!,
      coinTo: toWalletSelected.currencyAbbreviation.toLowerCase(),
      chainTo: toWalletSelected.chain.toLowerCase(),
      addressTo: txData.addressTo,
      walletIdTo: toWalletSelected.id,
      amountFrom: amountFrom!,
      coinFrom: fromWalletSelected.currencyAbbreviation.toLowerCase(),
      chainFrom: fromWalletSelected.chain.toLowerCase(),
      refundAddress: txData.addressFrom,
      payinAddress: txData.payinAddress,
      payinExtraId: txData.payinExtraId,
      totalExchangeFee: totalExchangeFee!,
      status: txData.status,
    };

    dispatch(
      SwapCryptoActions.successTxChangelly({
        changellyTxData: newData,
      }),
    );

    logger.debug('Saved swap with: ' + JSON.stringify(newData));

    dispatch(
      Analytics.track('Successful Crypto Swap', {
        fromCoin: fromWalletSelected.currencyAbbreviation,
        fromChain: fromWalletSelected.chain || '',
        toCoin: toWalletSelected.currencyAbbreviation,
        toChain: toWalletSelected.chain || '',
        amountFrom: amountFrom,
        exchange: 'changelly',
      }),
    );
  };

  const showSendMaxWarning = async (
    coin: string,
    chain: string,
    tokenAddress: string | undefined,
  ) => {
    if (!sendMaxInfo || !coin) {
      return;
    }

    const warningMsg = dispatch(
      GetExcludedUtxosMessage(coin, chain, tokenAddress, sendMaxInfo),
    );
    const fee = dispatch(SatToUnit(sendMaxInfo.fee, coin, chain, tokenAddress));

    const msg =
      `Because you are sending the maximum amount contained in this wallet, the ${
        dispatch(GetName(chain, chain)) || cloneDeep(chain).toUpperCase()
      } miner fee (${fee} ${coin.toUpperCase()}) will be deducted from the total.` +
      `\n${warningMsg}`;

    await sleep(400);
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: 'Miner Fee Notice',
        message: msg,
        enableBackdropDismiss: true,
        actions: [
          {
            text: 'OK',
            action: async () => {
              dispatch(dismissBottomNotificationModal());
            },
            primary: true,
          },
        ],
      }),
    );
  };

  const showError = async (
    msg?: string,
    reason?: string,
    errorMsgLog?: string,
    title?: string,
    actions?: any[],
  ) => {
    setIsLoading(false);
    dispatch(dismissOnGoingProcessModal());
    await sleep(1000);
    dispatch(
      Analytics.track('Failed Crypto Swap', {
        exchange: 'changelly',
        context: 'ChangellyCheckout',
        reasonForFailure: reason || 'unknown',
        errorMsg: errorMsgLog || 'unknown',
        amountFrom: amountFrom || '',
        fromCoin: fromWalletSelected.currencyAbbreviation?.toLowerCase() || '',
        fromChain: fromWalletSelected.chain?.toLowerCase() || '',
        toCoin: toWalletSelected.currencyAbbreviation?.toLowerCase() || '',
        toChain: toWalletSelected.chain?.toLowerCase() || '',
      }),
    );
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title: title ?? t('Error'),
        message: msg ?? t('Unknown Error'),
        enableBackdropDismiss: false,
        actions: actions ?? [
          {
            text: t('OK'),
            action: async () => {
              dispatch(dismissBottomNotificationModal());
              await sleep(1000);
              navigation.goBack();
            },
            primary: true,
          },
        ],
      }),
    );
  };

  useEffect(() => {
    dispatch(startOnGoingProcessModal('EXCHANGE_GETTING_DATA'));
    createFixTransaction(1);

    return () => {
      if (countDown) {
        clearInterval(countDown);
      }
    };
  }, []);

  useEffect(() => {
    if (!resetSwipeButton) {
      return;
    }
    const timer = setTimeout(() => {
      setResetSwipeButton(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [resetSwipeButton]);

  return (
    <SwapCheckoutContainer>
      <ScrollView ref={scrollViewRef}>
        <RowDataContainer>
          <H5>{t('SUMMARY')}</H5>
        </RowDataContainer>
        <ItemDivisor />
        <RowDataContainer>
          <RowLabel>{t('Swapping')}</RowLabel>
          <SelectedOptionContainer>
            <SelectedOptionCol>
              <CoinIconContainer>
                <CurrencyImage
                  img={fromWalletSelected.img}
                  badgeUri={getBadgeImg(
                    getCurrencyAbbreviation(
                      fromWalletSelected.currencyAbbreviation,
                      fromWalletSelected.chain,
                    ),
                    fromWalletSelected.chain,
                  )}
                  size={20}
                />
              </CoinIconContainer>
              <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
                {fromWalletSelected.walletName
                  ? fromWalletSelected.walletName
                  : fromWalletSelected.currencyName}
              </SelectedOptionText>
            </SelectedOptionCol>
          </SelectedOptionContainer>
        </RowDataContainer>
        <ItemDivisor />
        <RowDataContainer>
          <RowLabel>{t('Receiving')}</RowLabel>
          <SelectedOptionContainer>
            <SelectedOptionCol>
              <CoinIconContainer>
                <CurrencyImage
                  img={toWalletSelected.img}
                  badgeUri={getBadgeImg(
                    getCurrencyAbbreviation(
                      toWalletSelected.currencyAbbreviation,
                      toWalletSelected.chain,
                    ),
                    toWalletSelected.chain,
                  )}
                  size={20}
                />
              </CoinIconContainer>
              <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
                {toWalletSelected.walletName
                  ? toWalletSelected.walletName
                  : toWalletSelected.currencyName}
              </SelectedOptionText>
            </SelectedOptionCol>
          </SelectedOptionContainer>
        </RowDataContainer>
        <ItemDivisor />
        {isLoading ? (
          <SwapCheckoutSkeleton />
        ) : (
          <>
            <RowDataContainer>
              <RowLabel>{t('Paying')}</RowLabel>
              {amountFrom ? (
                <RowData>
                  {Number(amountFrom.toFixed(6))}{' '}
                  {fromWalletSelected.currencyAbbreviation.toUpperCase()}
                </RowData>
              ) : null}
            </RowDataContainer>
            <ItemDivisor />
            <RowDataContainer>
              <RowLabel>{t('Miner Fee')}</RowLabel>
              {fee ? (
                <RowData>
                  {dispatch(
                    FormatAmountStr(
                      // @ts-ignore
                      BitpaySupportedCoins[fromWalletSelected.chain]
                        ?.feeCurrency,
                      fromWalletSelected.chain,
                      undefined,
                      fee,
                    ),
                  )}
                </RowData>
              ) : (
                <RowData>...</RowData>
              )}
            </RowDataContainer>
            <ItemDivisor />
            {totalExchangeFee ? (
              <>
                <RowDataContainer>
                  <RowLabel>{t('Exchange Fee')}</RowLabel>
                  <RowData>
                    {Number(totalExchangeFee).toFixed(6)}{' '}
                    {toWalletSelected.currencyAbbreviation.toUpperCase()}
                  </RowData>
                </RowDataContainer>
                <ItemDivisor />
              </>
            ) : null}
            <RowDataContainer>
              <RowLabel>{t('Expires')}</RowLabel>
              {!!remainingTimeStr && (
                <RowData
                  style={{
                    color: paymentExpired
                      ? Caution
                      : theme.dark
                      ? White
                      : Black,
                  }}>
                  {remainingTimeStr}
                </RowData>
              )}
            </RowDataContainer>
            <ItemDivisor />
            <RowDataContainer style={{marginTop: 25, marginBottom: 5}}>
              <H7>{t('TOTAL TO RECEIVE')}</H7>
              {!!amountTo && (
                <H5>
                  {amountTo}{' '}
                  {toWalletSelected.currencyAbbreviation.toUpperCase()}
                </H5>
              )}
            </RowDataContainer>
            {!!fiatAmountTo && (
              <>
                <FiatAmountContainer>
                  <FiatAmount>
                    ~{fiatAmountTo.toFixed(2)} {alternativeIsoCode}
                  </FiatAmount>
                </FiatAmountContainer>
              </>
            )}
            {!termsAccepted && showCheckTermsMsg ? (
              <RowLabel style={{color: Caution, marginTop: 10}}>
                {t('Tap the checkbox to accept and continue.')}
              </RowLabel>
            ) : null}
            <CheckBoxContainer>
              <Checkbox
                radio={false}
                onPress={() => {
                  setTermsAccepted(!termsAccepted);
                  setShowCheckTermsMsg(!!termsAccepted);
                }}
                checked={termsAccepted}
              />
              <CheckBoxCol>
                <CheckboxText>
                  {t(
                    'Exchange services provided by Changelly. By clicking “Accept”, I acknowledge and understand that my transaction may trigger AML/KYC verification according to Changelly AML/KYC',
                  )}
                </CheckboxText>
                <PoliciesContainer
                  onPress={() => {
                    setChangellyPoliciesModalVisible(true);
                  }}>
                  <PoliciesText>{t('Review Changelly policies')}</PoliciesText>
                </PoliciesContainer>
              </CheckBoxCol>
            </CheckBoxContainer>
          </>
        )}
      </ScrollView>

      {key?.hardwareSource && fromWalletSelected ? (
        <ConfirmHardwareWalletModal
          isVisible={isConfirmHardwareWalletModalVisible}
          state={confirmHardwareState}
          hardwareSource={key.hardwareSource}
          transport={hardwareWalletTransport}
          currencyLabel={BitpaySupportedCoins[fromWalletSelected.chain]?.name}
          onBackdropPress={() => {
            setConfirmHardwareWalletVisible(false);
            setResetSwipeButton(true);
            setConfirmHardwareState(null);
          }}
          onPaired={onHardwareWalletPaired}
        />
      ) : null}

      {!paymentExpired && !!exchangeTxId ? (
        <>
          {!termsAccepted ? (
            <TouchableOpacity
              onPress={() => {
                scrollViewRef?.current?.scrollToEnd({animated: true});
                setShowCheckTermsMsg(true);
              }}>
              <SwipeButton
                title={'Slide to send'}
                disabled={true}
                onSwipeComplete={() => {}}
              />
            </TouchableOpacity>
          ) : (
            <SwipeButton
              title={'Slide to send'}
              disabled={false}
              onSwipeComplete={onSwipeComplete}
              forceReset={resetSwipeButton}
            />
          )}
        </>
      ) : null}

      <ChangellyPoliciesModal
        isVisible={changellyPoliciesModalVisible}
        onDismiss={() => {
          setChangellyPoliciesModalVisible(false);
        }}
      />
    </SwapCheckoutContainer>
  );
};

export default ChangellyCheckout;
