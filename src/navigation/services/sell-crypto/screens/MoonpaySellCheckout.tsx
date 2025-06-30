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
import Clipboard from '@react-native-clipboard/clipboard';
import styled from 'styled-components/native';
import cloneDeep from 'lodash.clonedeep';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../../utils/hooks';
import MoonpaySellCheckoutSkeleton from './MoonpaySellCheckoutSkeleton';
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
  formatCryptoAddress,
  getBadgeImg,
  getCurrencyAbbreviation,
  getCWCChain,
  getSolanaTokens,
  sleep,
} from '../../../../utils/helper-methods';
import {
  ItemDivisor,
  RowDataContainer,
  RowLabel,
  RowData,
  SelectedOptionContainer,
  SelectedOptionText,
  SelectedOptionCol,
  CoinIconContainer,
  CheckBoxContainer,
  CheckboxText,
  PoliciesContainer,
  PoliciesText,
  CheckBoxCol,
} from '../../swap-crypto/styled/SwapCryptoCheckout.styled';
import {
  openUrlWithInAppBrowser,
  startOnGoingProcessModal,
} from '../../../../store/app/app.effects';
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
import {useTranslation} from 'react-i18next';
import {RootState} from '../../../../store';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {RootStacks} from '../../../../Root';
import {TabsScreens} from '../../../tabs/TabsStack';
import {ExternalServicesSettingsScreens} from '../../../tabs/settings/external-services/ExternalServicesGroup';
import {
  MoonpayGetSellQuoteRequestData,
  MoonpaySellIncomingData,
  MoonpaySellOrderData,
  MoonpaySellTransactionDetails,
} from '../../../../store/sell-crypto/models/moonpay-sell.models';
import {
  getMoonpaySellFixedCurrencyAbbreviation,
  getMoonpaySellPayoutMethodFormat,
  getPayoutMethodKeyFromMoonpayType,
  moonpaySellEnv,
} from '../utils/moonpay-sell-utils';
import {moonpayGetSellTransactionDetails} from '../../../../store/buy-crypto/effects/moonpay/moonpay';
import {MoonpaySettingsProps} from '../../../../navigation/tabs/settings/external-services/screens/MoonpaySettings';
import SendToPill from '../../../../navigation/wallet/components/SendToPill';
import {SellCryptoActions} from '../../../../store/sell-crypto';
import haptic from '../../../../components/haptic-feedback/haptic';
import {WithdrawalMethodsAvailable} from '../constants/SellCryptoConstants';
import {getSendMaxData} from '../../utils/external-services-utils';
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
export const SellCheckoutContainer = styled.SafeAreaView`
  flex: 1;
  margin: 14px;
`;

export interface MoonpaySellCheckoutProps {
  sellCryptoExternalId: string;
  wallet: Wallet;
  toAddress: string;
  amount: number;
  useSendMax?: boolean;
  sendMaxInfo?: SendMaxInfo;
}

let countDown: NodeJS.Timeout | undefined;

const MoonpaySellCheckout: React.FC = () => {
  let {
    params: {
      sellCryptoExternalId,
      wallet,
      toAddress,
      amount,
      useSendMax,
      sendMaxInfo,
    },
  } = useRoute<RouteProp<{params: MoonpaySellCheckoutProps}>>();
  const {t} = useTranslation();
  const logger = useLogger();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const BWC = BwcProvider.getInstance();
  const scrollViewRef = useRef<ScrollView>(null);

  const sellOrder: MoonpaySellOrderData = useAppSelector(
    ({SELL_CRYPTO}: RootState) => SELL_CRYPTO.moonpay[sellCryptoExternalId],
  );
  const [isToken, setIsToken] = useState(
    IsERCToken(wallet.currencyAbbreviation, wallet.chain),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showCheckTermsMsg, setShowCheckTermsMsg] = useState(false);
  const [showNewQuoteTermsMsg, setShowNewQuoteTermsMsg] = useState(false);
  const [remainingTimeStr, setRemainingTimeStr] = useState<string>('');
  const [expiredAnalyticSent, setExpiredAnalyticSent] =
    useState<boolean>(false);
  const [amountExpected, setAmountExpected] = useState<number>(amount);
  const [fee, setFee] = useState<number>();
  const [ctxp, setCtxp] = useState<Partial<TransactionProposal>>();

  const [totalExchangeFee, setTotalExchangeFee] = useState<number>();
  const [paymentExpired, setPaymentExpired] = useState(false);
  const key = useAppSelector(
    ({WALLET}: RootState) => WALLET.keys[wallet.keyId],
  );
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [txData, setTxData] = useState<MoonpaySellTransactionDetails>();

  const [isConfirmHardwareWalletModalVisible, setConfirmHardwareWalletVisible] =
    useState(false);
  const [hardwareWalletTransport, setHardwareWalletTransport] =
    useState<Transport | null>(null);
  const [confirmHardwareState, setConfirmHardwareState] =
    useState<SimpleConfirmPaymentState | null>(null);

  let destinationTag: string | undefined; // handle this if XRP is enabled to sell
  let status: string;

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

  const copyText = (text: string) => {
    haptic('impactLight');
    Clipboard.setString(text);
  };

  const paymentTimeControl = (expires: string | number): void => {
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
      setRemainingTimeStr('expired');
      if (countDown) {
        clearInterval(countDown);
      }
      return;
    }

    const totalSecs = expirationTime - now;
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    setRemainingTimeStr(('0' + m).slice(-2) + ':' + ('0' + s).slice(-2));
  };

  const init = async () => {
    let sellTxDetails: MoonpaySellTransactionDetails;
    try {
      sellTxDetails = await moonpayGetSellTransactionDetails(
        sellOrder.transaction_id,
        sellOrder.external_id,
      );
    } catch (err) {
      logger.debug(
        `Error trying to get the Sell Transaction Details from MoonPay for id: ${sellOrder.transaction_id}`,
      );
      showError(
        err,
        'moonpayGetSellTransactionDetails Error. Could not get order details from MoonPay',
      );
      return;
    }

    if (sellTxDetails.flow === 'floating') {
      // The floating flow is for non-US users. Means the fiat price that MoonPay sends could have slight differences due to the fluctuating price of crypto.
      // For that reason we get an updated quote and set a custom payTill

      if (
        sellTxDetails.payoutMethod !==
        getMoonpaySellPayoutMethodFormat(sellOrder.payment_method)
      ) {
        logger.debug(
          `Selected withdrawal method mismatch. Updated from ${sellOrder.payment_method} to ${sellTxDetails.payoutMethod}`,
        );
      }

      const payoutMethod =
        sellTxDetails.payoutMethod ??
        getMoonpaySellPayoutMethodFormat(sellOrder.payment_method);

      const requestData: MoonpayGetSellQuoteRequestData = {
        env: moonpaySellEnv,
        currencyAbbreviation: getMoonpaySellFixedCurrencyAbbreviation(
          wallet.currencyAbbreviation,
          wallet.chain,
        ),
        quoteCurrencyCode: sellOrder.fiat_currency ?? 'USD',
        baseCurrencyAmount:
          sellTxDetails.baseCurrencyAmount ?? sellOrder.crypto_amount,
        payoutMethod: payoutMethod,
      };

      logger.debug(
        `Sell order type: floating. Getting new quote with: ${JSON.stringify(
          requestData,
        )}`,
      );
      try {
        const sellQuote = await wallet.moonpayGetSellQuote(requestData);
        if (sellQuote?.quoteCurrencyAmount) {
          sellQuote.totalFee = sellQuote.extraFeeAmount + sellQuote.feeAmount;

          if (!sellTxDetails.quoteCurrencyAmount) {
            sellTxDetails.quoteCurrencyAmount =
              sellQuote.quoteCurrencyAmount ?? sellOrder.fiat_receiving_amount;
            sellTxDetails.quoteCurrency.code =
              sellQuote.quoteCurrency?.code ?? sellOrder.fiat_currency;

            sellTxDetails.feeAmount = Number(sellQuote.feeAmount);
            sellTxDetails.extraFeeAmount = Number(sellQuote.extraFeeAmount);
          }
        } else {
          logger.debug(
            'The floating transaction quote could not be updated (quoteCurrencyAmount not present). Previously saved values will be displayed.',
          );
        }
      } catch (err: any) {
        logger.debug(
          'The floating transaction quote could not be updated. Previously saved values will be displayed.',
        );
        const log = getErrorMsgFromError(err);
        logger.debug(`moonpayGetSellQuote Error: ${log}`);
      }
    }

    setTxData(sellTxDetails);

    if (
      sellOrder.address_to !== sellTxDetails.depositWallet.walletAddress &&
      (wallet.currencyAbbreviation.toLowerCase() !== 'btc' ||
        sellOrder.address_to !== sellTxDetails.depositWallet.btcLegacyAddress)
    ) {
      const msg = `The destination address of the original Sell Order does not match the address expected by Moonpay for the id: ${sellOrder.transaction_id}`;
      showError(
        msg,
        'moonpayGetSellTransactionDetails Error. Destination address mismatch',
      );
      return;
    }

    let payTill: string | number | null = sellTxDetails.quoteExpiresAt;

    if (sellTxDetails.quoteExpiredEmailSentAt) {
      logger.debug(
        `The original quote has expired at ${sellTxDetails.quoteExpiredEmailSentAt}. The user should have received an email from Moonpay with a new quote proposal at ${sellTxDetails.quoteExpiredEmailSentAt}.`,
      );
      payTill = null;
      setShowNewQuoteTermsMsg(true);
    }

    if (!payTill) {
      logger.debug(
        'No quoteExpiresAt parameter present. Setting custom expiration time.',
      );
      const now = Date.now();
      payTill = now + 5 * 60 * 1000;
    }

    paymentTimeControl(payTill);

    const _totalExchangeFee =
      Number(sellTxDetails.feeAmount) + Number(sellTxDetails.extraFeeAmount);
    setTotalExchangeFee(_totalExchangeFee);

    const precision = dispatch(
      GetPrecision(
        wallet.currencyAbbreviation,
        wallet.chain,
        wallet.tokenAddress,
      ),
    );
    // To Sat
    const depositSat = Number(
      (amountExpected * precision!.unitToSatoshi).toFixed(0),
    );

    if (
      wallet.currencyAbbreviation.toLowerCase() === 'bch' &&
      wallet.chain.toLowerCase() === 'bch'
    ) {
      // use cashaddr for BCH
      const toAddressCashaddr = BWC.getBitcoreCash()
        .Address(toAddress)
        .toString(true);

      logger.debug(
        `BCH wallet, transform toAddress: ${toAddress} to cashaddr: ${toAddressCashaddr}`,
      );
      toAddress = toAddressCashaddr;
    }

    createTx(wallet, toAddress, depositSat, destinationTag)
      .then(async ctxp => {
        setCtxp(ctxp);
        console.log(ctxp);
        setFee(ctxp.fee);
        setIsLoading(false);
        dispatch(dismissOnGoingProcessModal());
        await sleep(400);

        if (useSendMax) {
          showSendMaxWarning(ctxp.coin, ctxp.chain, wallet.tokenAddress);
        }
        return;
      })
      .catch(err => {
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
      });
  };

  const createTx = async (
    wallet: Wallet,
    toAddress: string,
    depositSat: number,
    destTag?: string,
  ): Promise<TransactionProposal> => {
    try {
      const message = `Sold ${wallet.currencyAbbreviation.toUpperCase()}`;
      let outputs = [];

      outputs.push({
        toAddress,
        amount: depositSat,
        message: message,
      });

      let txp: Partial<TransactionProposal> = {
        toAddress,
        amount: depositSat,
        chain: wallet.chain,
        outputs,
        message: message,
        excludeUnconfirmedUtxos: true, // Do not use unconfirmed UTXOs
        customData: {
          moonpay: toAddress,
          service: 'moonpay',
        },
      };

      if (isToken) {
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

      if (['btc', 'eth', 'matic'].includes(wallet.chain)) {
        txp.feeLevel = 'priority';
      } // Avoid expired order due to slow TX confirmation

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
      const log = `moonpaySellCheckout createTxProposal error: ${errStr}`;
      logger.error(log);

      const [errorMessageConfig] = await Promise.all([
        dispatch(handleCreateTxProposalError(err, undefined, 'sell')),
        sleep(400),
      ]);
      return Promise.reject(errorMessageConfig);
    }
  };

  const makePayment = async ({transport}: {transport?: Transport}) => {
    const isUsingHardwareWallet = !!transport;
    let broadcastedTx;
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
        broadcastedTx = await dispatch(
          publishAndSign({
            txp: ctxp! as TransactionProposal,
            key,
            wallet,
            transport,
          }),
        );
        setConfirmHardwareState('complete');
        await sleep(1000);
        setConfirmHardwareWalletVisible(false);
      } else {
        dispatch(startOnGoingProcessModal('SENDING_PAYMENT'));
        await sleep(400);
        broadcastedTx = await dispatch(
          publishAndSign({
            txp: ctxp! as TransactionProposal,
            key,
            wallet,
          }),
        );
      }
      updateMoonpayTx(txData!, broadcastedTx as Partial<TransactionProposal>);
      dispatch(dismissOnGoingProcessModal());
      await sleep(400);

      dispatch(
        AppActions.showPaymentSentModal({
          isVisible: true,
          onCloseModal,
          title:
            wallet?.credentials?.n > 1
              ? t('Payment Sent')
              : t('Payment Accepted'),
        }),
      );

      await sleep(1200);
      const moonpaySettingsParams: MoonpaySettingsProps = {
        incomingPaymentRequest: {
          externalId: sellCryptoExternalId,
          transactionId: sellOrder?.transaction_id,
          status,
          flow: 'sell',
        },
      };

      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            {
              name: RootStacks.TABS,
              params: {screen: TabsScreens.HOME},
            },
            {
              name: ExternalServicesSettingsScreens.MOONPAY_SETTINGS,
              params: moonpaySettingsParams,
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
    } catch (err) {
      let msg = getErrorMsgFromError(err);
      logger.error('makePayment error: ' + msg);
    }
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

  const updateMoonpayTx = (
    moonpayTxData: MoonpaySellTransactionDetails,
    broadcastedTx?: Partial<TransactionProposal>,
  ) => {
    const dataToUpdate: MoonpaySellIncomingData = {
      externalId: sellCryptoExternalId!,
      txSentOn: Date.now(),
      txSentId: broadcastedTx?.txid,
      status: 'bitpayTxSent',
      fiatAmount: moonpayTxData.quoteCurrencyAmount,
      baseCurrencyCode: cloneDeep(
        moonpayTxData.quoteCurrency.code,
      ).toUpperCase(),
      totalFee: totalExchangeFee,
    };

    dispatch(
      SellCryptoActions.updateSellOrderMoonpay({
        moonpaySellIncomingData: dataToUpdate,
      }),
    );

    logger.debug('Updated sell order with: ' + JSON.stringify(dataToUpdate));

    dispatch(
      Analytics.track('Successful Crypto Sell', {
        coin: wallet.currencyAbbreviation.toLowerCase(),
        chain: wallet.chain.toLowerCase(),
        amount: amountExpected,
        fiatAmount:
          moonpayTxData?.quoteCurrencyAmount ||
          sellOrder?.fiat_receiving_amount,
        fiatCurrency:
          moonpayTxData?.quoteCurrency?.code?.toLowerCase() ||
          sellOrder?.fiat_currency?.toLowerCase(),
        exchange: 'moonpay',
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

    let warningMsg = dispatch(
      GetExcludedUtxosMessage(coin, chain, tokenAddress, sendMaxInfo),
    );
    const fee = dispatch(SatToUnit(sendMaxInfo.fee, coin, chain, tokenAddress));

    const realMaxAmount = dispatch(
      SatToUnit(
        cloneDeep(sendMaxInfo.amount),
        wallet.currencyAbbreviation,
        wallet.chain,
        wallet.tokenAddress,
      ),
    );
    if (realMaxAmount && realMaxAmount > amountExpected) {
      try {
        const precision = dispatch(
          GetPrecision(
            wallet.currencyAbbreviation,
            wallet.chain,
            wallet.tokenAddress,
          ),
        );
        const amountBelowMoonpayMinUnit = Number(
          (realMaxAmount - amountExpected).toFixed(precision?.unitDecimals),
        );
        const message = `A total of ${amountBelowMoonpayMinUnit} ${coin.toUpperCase()} were excluded. These funds are not enough to cover the minimum Moonpay purchase unit.`;
        warningMsg = warningMsg + `\n${message}`;
      } catch (err) {
        // continue without message
      }
    }

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

  const getErrorMsgFromError = (err: any): string => {
    let msg = t('Something went wrong. Please try again later.');
    if (err) {
      if (typeof err === 'string') {
        msg = err;
      } else {
        if (err.message && typeof err.message === 'string') {
          msg = err.message;
        } else if (err.error && typeof err.error === 'string') {
          msg = err.error;
        } else if (err.error?.error && typeof err.error.error === 'string') {
          msg = err.error.error;
        }
      }
    }
    return msg;
  };

  const showError = async (
    err?: any,
    reason?: string,
    errorMsgLog?: string,
    title?: string,
    actions?: any[],
  ) => {
    setIsLoading(false);
    dispatch(dismissOnGoingProcessModal());

    let msg = getErrorMsgFromError(err);

    logger.error('Moonpay error: ' + msg);

    dispatch(
      Analytics.track('Failed Crypto Sell', {
        exchange: 'moonpay',
        context: 'MoonpaySellCheckout',
        reasonForFailure: reason || 'unknown',
        errorMsg: errorMsgLog || 'unknown',
        amountFrom: amountExpected || '',
        fromCoin: wallet.currencyAbbreviation.toLowerCase() || '',
        fromChain: wallet.chain?.toLowerCase() || '',
        fiatAmount: sellOrder?.fiat_receiving_amount || '',
        fiatCurrency: sellOrder?.fiat_currency?.toLowerCase() || '',
      }),
    );

    await sleep(700);
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
    const _getSendMaxData = async (wallet: Wallet) => {
      // We obtain the sendMaxData, but we do not send the maximum amount, since Moonpay misinterprets it
      // (It rounds the last digit of the decimal up, based on a variable precision number from its side. Therefore, it causes a failure in the execution of the order)
      // As a workaround we continue to use the previously agreed amount
      const sendMaxData = await getSendMaxData(wallet);
      sendMaxInfo = cloneDeep(sendMaxData);
      init();
    };

    dispatch(startOnGoingProcessModal('EXCHANGE_GETTING_DATA'));
    if (isToken) {
      useSendMax = false;
    }
    if (sellOrder?.send_max && !isToken) {
      _getSendMaxData(wallet);
    } else {
      init();
    }

    return () => {
      if (countDown) {
        clearInterval(countDown);
      }
    };
  }, []);

  useEffect(() => {
    if (remainingTimeStr === 'expired' && !expiredAnalyticSent) {
      dispatch(
        Analytics.track('Failed Crypto Sell', {
          exchange: 'moonpay',
          context: 'MoonpaySellCheckout',
          reasonForFailure: 'Time to make the payment expired',
          amountFrom: amountExpected || '',
          fromCoin: wallet.currencyAbbreviation.toLowerCase() || '',
          fiatAmount: sellOrder?.fiat_receiving_amount || '',
          fiatCurrency: sellOrder?.fiat_currency?.toLowerCase() || '',
        }),
      );
      setExpiredAnalyticSent(true);
    }
  }, [remainingTimeStr, expiredAnalyticSent]);

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
    <SellCheckoutContainer>
      <ScrollView ref={scrollViewRef}>
        <RowDataContainer>
          <H5>{t('SUMMARY')}</H5>
        </RowDataContainer>
        <RowDataContainer>
          <RowLabel>{t('Selling')}</RowLabel>
          {amountExpected ? (
            <RowData>
              {Number(amountExpected.toFixed(6))}{' '}
              {wallet.currencyAbbreviation.toUpperCase()}
            </RowData>
          ) : null}
        </RowDataContainer>
        <ItemDivisor />
        <RowDataContainer>
          <RowLabel>{t('From')}</RowLabel>
          <SelectedOptionContainer>
            <SelectedOptionCol>
              <CoinIconContainer>
                <CurrencyImage
                  img={wallet.img}
                  badgeUri={getBadgeImg(
                    getCurrencyAbbreviation(
                      wallet.currencyAbbreviation,
                      wallet.chain,
                    ),
                    wallet.chain,
                  )}
                  size={20}
                />
              </CoinIconContainer>
              <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
                {wallet.walletName ? wallet.walletName : wallet.currencyName}
              </SelectedOptionText>
            </SelectedOptionCol>
          </SelectedOptionContainer>
        </RowDataContainer>
        <ItemDivisor />
        <RowDataContainer>
          <RowLabel>{t('Deposit Address')}</RowLabel>
          <SendToPill
            icon={
              <CurrencyImage
                img={wallet.img}
                size={18}
                badgeUri={getBadgeImg(
                  getCurrencyAbbreviation(
                    wallet.currencyAbbreviation,
                    wallet.chain,
                  ),
                  wallet.chain,
                )}
              />
            }
            description={formatCryptoAddress(toAddress)}
            onPress={() => {
              copyText(toAddress);
            }}
          />
        </RowDataContainer>
        <ItemDivisor />
        {isLoading ? (
          <MoonpaySellCheckoutSkeleton />
        ) : (
          <>
            {getPayoutMethodKeyFromMoonpayType(txData?.payoutMethod) &&
            WithdrawalMethodsAvailable[
              getPayoutMethodKeyFromMoonpayType(txData?.payoutMethod)!
            ] ? (
              <>
                <RowDataContainer>
                  <RowLabel>{t('Withdrawing Method')}</RowLabel>
                  <SelectedOptionContainer>
                    <SelectedOptionText
                      numberOfLines={1}
                      ellipsizeMode={'tail'}>
                      {
                        WithdrawalMethodsAvailable[
                          getPayoutMethodKeyFromMoonpayType(
                            txData?.payoutMethod,
                          )!
                        ].label
                      }
                    </SelectedOptionText>
                  </SelectedOptionContainer>
                </RowDataContainer>
                <ItemDivisor />
              </>
            ) : WithdrawalMethodsAvailable &&
              sellOrder.payment_method &&
              WithdrawalMethodsAvailable[sellOrder.payment_method] ? (
              <>
                <RowDataContainer>
                  <RowLabel>{t('Withdrawing Method')}</RowLabel>
                  <SelectedOptionContainer>
                    <SelectedOptionText
                      numberOfLines={1}
                      ellipsizeMode={'tail'}>
                      {
                        WithdrawalMethodsAvailable[sellOrder.payment_method]
                          .label
                      }
                    </SelectedOptionText>
                  </SelectedOptionContainer>
                </RowDataContainer>
                <ItemDivisor />
              </>
            ) : null}
            <RowDataContainer>
              <RowLabel>{t('Miner Fee')}</RowLabel>
              {fee ? (
                <RowData>
                  {dispatch(
                    FormatAmountStr(
                      // @ts-ignore
                      BitpaySupportedCoins[wallet.chain]?.feeCurrency,
                      wallet.chain,
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
            {totalExchangeFee && txData ? (
              <>
                <RowDataContainer>
                  <RowLabel>{t('Exchange Fee')}</RowLabel>
                  <RowData>
                    {Number(totalExchangeFee).toFixed(2)}{' '}
                    {txData.quoteCurrency?.code?.toUpperCase()}
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
                  {remainingTimeStr === 'expired'
                    ? t('Expired')
                    : remainingTimeStr}
                </RowData>
              )}
            </RowDataContainer>
            <ItemDivisor />
            {txData ? (
              <RowDataContainer style={{marginTop: 25, marginBottom: 5}}>
                <H7>{t('TOTAL TO RECEIVE')}</H7>
                {!!txData.quoteCurrencyAmount && (
                  <H5>
                    {txData.quoteCurrencyAmount.toFixed(2)}{' '}
                    {txData.quoteCurrency?.code?.toUpperCase()}
                  </H5>
                )}
                {!txData.quoteCurrencyAmount && (
                  <H5>
                    {sellOrder.fiat_receiving_amount.toFixed(2)}{' '}
                    {sellOrder.fiat_currency?.toUpperCase()}
                  </H5>
                )}
              </RowDataContainer>
            ) : null}
            {!termsAccepted && showCheckTermsMsg ? (
              <RowLabel style={{color: Caution, marginTop: 10}}>
                {t('Tap the checkbox to accept and continue.')}
              </RowLabel>
            ) : null}
            <CheckBoxContainer style={{marginBottom: 50}}>
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
                  {showNewQuoteTermsMsg
                    ? t(
                        'The original quote has expired. You should have received an email from MoonPay with a new quote proposal. By checking this, you will accept the new offer.',
                      ) + '\n'
                    : ''}
                  {t(
                    "Sell Crypto services provided by MoonPay. By checking this, I acknowledge and accept MoonPay's terms of use.",
                  )}
                </CheckboxText>
                <PoliciesContainer
                  onPress={() => {
                    dispatch(
                      openUrlWithInAppBrowser(
                        'https://www.moonpay.com/legal/terms_of_use',
                      ),
                    );
                  }}>
                  <PoliciesText>
                    {t('Review MoonPay Terms of use')}
                  </PoliciesText>
                </PoliciesContainer>
              </CheckBoxCol>
            </CheckBoxContainer>
          </>
        )}
      </ScrollView>

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

      {!paymentExpired ? (
        <>
          {!termsAccepted ? (
            <TouchableOpacity
              onPress={() => {
                scrollViewRef?.current?.scrollToEnd({animated: true});
                setShowCheckTermsMsg(true);
              }}>
              <SwipeButton
                title={'Slide to sell'}
                disabled={true}
                onSwipeComplete={() => {}}
              />
            </TouchableOpacity>
          ) : (
            <SwipeButton
              title={'Slide to sell'}
              disabled={false}
              onSwipeComplete={onSwipeComplete}
              forceReset={resetSwipeButton}
            />
          )}
        </>
      ) : null}
    </SellCheckoutContainer>
  );
};

export default MoonpaySellCheckout;
