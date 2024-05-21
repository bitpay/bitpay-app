import Transport from '@ledgerhq/hw-transport';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import uuid from 'react-native-uuid';
import {ScrollView, TouchableOpacity} from 'react-native';
import {ethers} from 'ethers';
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
import PaymentSent from '../../../wallet/components/PaymentSent';
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
  TransactionProposalOutputs,
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
} from '../../../../store/wallet/utils/currency';
import {
  FormatAmountStr,
  GetExcludedUtxosMessage,
  parseAmountToStringIfBN,
  SatToUnit,
} from '../../../../store/wallet/effects/amount/amount';
import {
  thorswapEnv,
  getThorswapFixedCoin,
  getExchangeAbiByContractAddress,
  getThorswapRouteBySpenderKey,
  getGasLimitFromThorswapTransaction,
  estimateThorswapTxGasLimit,
} from '../utils/thorswap-utils';
import {
  getBadgeImg,
  getCurrencyAbbreviation,
  getCWCChain,
  sleep,
} from '../../../../utils/helper-methods';
import ThorswapPoliciesModal from '../components/ThorswapPoliciesModal';
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
  publishAndSign,
} from '../../../../store/wallet/effects/send/send';
import {thorswapTxData} from '../../../../store/swap-crypto/swap-crypto.models';
import {SwapCryptoActions} from '../../../../store/swap-crypto';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../../../store';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {
  thorswapGetSwapQuote,
  thorswapGetSwapTx,
} from '../../../../store/swap-crypto/effects/thorswap/thorswap';
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
import {
  ThorswapGetSwapQuoteData,
  ThorswapGetSwapQuoteRequestData,
  ThorswapProvider,
  thorswapQuoteRoute,
  ThorswapTransaction,
} from '../../../../store/swap-crypto/models/thorswap.models';
import {THORSWAP_DEFAULT_GAS_LIMIT} from '../constants/ThorswapConstants';

// Styled
export const SwapCheckoutContainer = styled.SafeAreaView`
  flex: 1;
  margin: 14px;
`;

export interface ThorswapCheckoutProps {
  fromWalletSelected: Wallet;
  toWalletSelected: Wallet;
  amountFrom: number;
  spenderKey?: ThorswapProvider | undefined;
  useSendMax?: boolean;
  sendMaxInfo?: SendMaxInfo;
}

let countDown: NodeJS.Timer | undefined;

const ThorswapCheckout: React.FC = () => {
  let {
    params: {
      fromWalletSelected,
      toWalletSelected,
      amountFrom,
      spenderKey,
      useSendMax,
      sendMaxInfo,
    },
  } = useRoute<RouteProp<{params: ThorswapCheckoutProps}>>();
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
  const [quoteData, setQuoteData] = useState<{
    quoteId: string;
    sellAssetAmount: string;
  }>();
  const [routeToUse, setRouteToUse] = useState<thorswapQuoteRoute>();
  const [thorswapPoliciesModalVisible, setThorswapPoliciesModalVisible] =
    useState(false);
  const [paymentExpired, setPaymentExpired] = useState(false);
  const key = useAppSelector(
    ({WALLET}: RootState) => WALLET.keys[fromWalletSelected.keyId],
  );

  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
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

  const createThorswapTransaction = async () => {
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

    const requestData: ThorswapGetSwapQuoteRequestData = {
      env: thorswapEnv,
      sellAsset: getThorswapFixedCoin(
        fromWalletSelected.currencyAbbreviation,
        fromWalletSelected.chain,
        fromWalletSelected.tokenAddress,
      ),
      buyAsset: getThorswapFixedCoin(
        toWalletSelected.currencyAbbreviation,
        toWalletSelected.chain,
        toWalletSelected.tokenAddress,
      ),
      sellAmount: amountFrom,
      senderAddress: addressFrom,
      recipientAddress: addressTo,
    };

    let thorswapQuoteData: ThorswapGetSwapQuoteData | undefined;
    try {
      console.log('============ thorswapQuoteData enviada: ', requestData);
      thorswapQuoteData = await thorswapGetSwapQuote(requestData);
      console.log(
        '============ thorswapQuoteData recibida: ',
        thorswapQuoteData,
      );
    } catch (err) {
      logger.error(
        'Thorswap createThorswapTransaction > thorswapGetSwapQuote Error: ' +
          JSON.stringify(err),
      );
      const msg = t(
        'Thorswap is not available at this moment. Please try again later.',
      );
      showError(msg);
      return;
    }

    let bestRouteData: thorswapQuoteRoute | undefined;
    if (spenderKey && thorswapQuoteData) {
      logger.debug(
        `getThorswapRouteBySpenderKey with spenderKey: ${spenderKey}`,
      );
      bestRouteData = getThorswapRouteBySpenderKey(
        thorswapQuoteData.routes,
        spenderKey,
      );
    }

    if (!bestRouteData || !thorswapQuoteData) {
      logger.error(
        'Thorswap createThorswapTransaction Error:' + thorswapQuoteData
          ? 'Not available Routes included in thorswapQuoteData'
          : 'Not thorswapQuoteData received.',
      );
      const msg = t(
        'Thorswap is not available at this moment. Please try again later.',
      );
      const reason = 'thorswapGetQuote Error. Necessary data not included.';
      showError(msg, reason);
      return;
    }

    setQuoteData({
      quoteId: thorswapQuoteData.quoteId,
      sellAssetAmount: thorswapQuoteData.sellAssetAmount,
    });
    setRouteToUse(bestRouteData);

    let thorswapFee = 0;
    let apiExtraFee = 0;
    let totalFee = 0;

    if (
      bestRouteData.fees &&
      bestRouteData.fees[fromWalletSelected.chain.toUpperCase()]
    ) {
      // TODO: review this fees handling
      const feeData =
        bestRouteData.fees[fromWalletSelected.chain.toUpperCase()][0];
      thorswapFee = Number(feeData.networkFee);
      apiExtraFee = Number(feeData.affiliateFee);
      totalFee = Number(feeData.totalFee);
      setTotalExchangeFee(totalFee);
      logger.debug(
        `Thorswap fee: ${thorswapFee} - BitPay fee: ${apiExtraFee} - Total fee: ${totalFee}`,
      );
    }

    if (bestRouteData.transaction?.to && bestRouteData.transaction?.to !== '') {
      payinAddress = bestRouteData.transaction?.to;
    } else if (
      bestRouteData.targetAddress &&
      bestRouteData.targetAddress !== ''
    ) {
      payinAddress = bestRouteData.targetAddress;
    } else {
      logger.error(
        'Thorswap createThorswapTransaction Error: Destination address not present',
      );
      const msg = t(
        'Thorswap is not available at this moment. Please try again later.',
      );
      const reason = 'thorswapGetQuote Error. Necessary data not included.';
      showError(msg, reason);
      return;
    }

    if (
      fromWalletSelected.currencyAbbreviation.toLowerCase() === 'bch' &&
      fromWalletSelected.chain.toLowerCase() === 'bch'
    ) {
      payinAddress = BWC.getBitcoreCash()
        .Address(payinAddress) // TODO: review: is targetAddress always present in any Route??
        .toString(true);
    }

    // TODO: review if destinationTag is present in Routes for XRP
    // payinExtraId = bestRouteData.payinExtraId
    //   ? bestRouteData.payinExtraId
    //   : undefined; // (destinationTag) Used for coins like: XRP, XLM, EOS, IGNIS, BNB, XMR, ARDOR, DCT, XEM

    // setExchangeTxId(bestRouteData.id);
    // setAmountExpectedFrom(Number(thorswapQuoteData.sellAssetAmount));

    setAmountTo(Number(bestRouteData.expectedOutput));
    // status = bestRouteData.status;

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
          Number(bestRouteData.expectedOutput) * precision!.unitToSatoshi,
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

    let payTill: number | undefined;
    if (bestRouteData.calldata?.deadline) {
      payTill = Number(bestRouteData.calldata?.deadline) * 1000; // deadline: 1715756550
    } else if (
      bestRouteData.calldata?.expiration &&
      bestRouteData.calldata?.expiration !== ''
    ) {
      payTill = Number(bestRouteData.calldata?.expiration) * 1000; // expiration: "1715756550"
    }

    const now = Date.now(); // 1715753319821
    const customPayTill = now + 10 * 60 * 1000; // (10 minutes)
    if (!payTill || payTill > now + 10 * 60 * 1000) {
      logger.debug(
        `${
          payTill
            ? 'Expiration parameter exceeds the recommended time'
            : 'No deadline or expiration parameter present'
        }. Setting custom expiration time: ${customPayTill}`,
      );
      payTill = customPayTill;
    }

    paymentTimeControl(payTill);

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

    console.log(
      `=========== createTx with: payinAddress: ${payinAddress} | depositSat: ${depositSat} | payinExtraId: ${payinExtraId}`,
    );
    console.log(
      '=========== createTx with: fromWalletSelected: ',
      fromWalletSelected,
    );
    createTx(
      fromWalletSelected,
      payinAddress,
      depositSat,
      bestRouteData.transaction,
      payinExtraId,
    )
      .then(async ctxp => {
        console.log('=========== createTx ctxp: ', ctxp);
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
      })
      .catch(err => {
        let msg = t('Error creating transaction');
        if (typeof err?.message === 'string') {
          msg = msg + `: ${err.message}`;
        }
        const reason = 'createTx Error';
        showError(msg, reason);
        return;
      });
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
    countDown?: NodeJS.Timer,
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
          exchange: 'thorswap',
          context: 'ThorswapCheckout',
          reasonForFailure: 'Time to make the payment expired',
          amountFrom: amountFrom || '',
          fromCoin: fromWalletSelected.currencyAbbreviation || '',
          toCoin: toWalletSelected.currencyAbbreviation || '',
        }),
      );
      return;
    }

    const totalSecs = expirationTime - now;
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    setRemainingTimeStr(('0' + m).slice(-2) + ':' + ('0' + s).slice(-2));
  };

  const createTx = async (
    wallet: Wallet,
    payinAddress: string,
    depositSat: number,
    thorswapTransaction?: ThorswapTransaction,
    destTag?: string,
  ) => {
    try {
      const message =
        fromWalletSelected.currencyAbbreviation.toUpperCase() +
        ' ' +
        t('to') +
        ' ' +
        toWalletSelected.currencyAbbreviation.toUpperCase();

      let calldata: string | undefined;
      let gasLimit: number | undefined;
      if (IsERCToken(wallet.currencyAbbreviation, wallet.chain)) {
        logger.debug('WalletFrom is ERC20 Token: building ERC20 txp');

        // ERC20 funds are moved in calldata
        depositSat = 0;

        if (thorswapTransaction?.data && thorswapTransaction?.data !== '') {
          calldata = thorswapTransaction.data;
        } else {
          return Promise.reject({
            title: t('Could not create transaction'),
            message: t(
              'It was not possible to get calldata needed for ERC20 Token Swap',
            ),
          });
        }

        // First try to use the included gasLimit
        if (thorswapTransaction.gas) {
          const gas = getGasLimitFromThorswapTransaction(
            thorswapTransaction.gas,
          );
          gasLimit = Math.ceil(Number(gas) * 1.25); // Thorswap estimated gas limit, increase this value by 25%

          if (gasLimit < 60000) {
            gasLimit = 60000;
          }
        }

        // If gasLimit is not included, estimate
        if (!gasLimit) {
          console.log(
            '********* IsERCToken calculate GASLIMIT calldata: ',
            calldata,
          );
          const ABI = getExchangeAbiByContractAddress(payinAddress);
          console.log('********* ABI: ', ABI);
          if (ABI && calldata && spenderKey) {
            try {
              // const contract = new ethers.Contract(payinAddress, ABI);
              const iface = new ethers.utils.Interface(ABI);
              const parsedData = iface.parseTransaction({data: calldata});
              console.log('********* parsedData: ', parsedData);
              gasLimit = estimateThorswapTxGasLimit(
                spenderKey,
                parsedData.name,
              );
            } catch (error) {
              console.error('Error trying to estimate gasLimit. Error:', error);
            }
          } else {
            // use DEFAULT
            gasLimit = THORSWAP_DEFAULT_GAS_LIMIT;
          }
        }
      }

      let outputs: TransactionProposalOutputs[] = [];
      outputs.push({
        toAddress: payinAddress,
        amount: depositSat,
        message: message,
        data: calldata,
        gasLimit,
      });

      let txp: Partial<TransactionProposal> = {
        toAddress: payinAddress,
        amount: 0,
        coin: wallet.currencyAbbreviation,
        chain: wallet.chain,
        outputs,
        message: message,
        excludeUnconfirmedUtxos: true, // Do not use unconfirmed UTXOs
        customData: {
          thorswap: payinAddress,
          service: 'thorswap',
        },
      };

      if (IsERCToken(wallet.currencyAbbreviation, wallet.chain)) {
        if (wallet.tokenAddress) {
          // txp.tokenAddress = wallet.tokenAddress;
          txp.isTokenSwap = true;
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

      const ctxp = await createTxProposal(wallet, txp);
      return Promise.resolve(ctxp);
    } catch (err: any) {
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      const log = `createTxProposal error: ${errStr}`;
      logger.error(log);
      return Promise.reject({
        title: t('Could not create transaction'),
        message: BWCErrorMessage(err),
      });
    }
  };

  const makePayment = async ({transport}: {transport?: Transport}) => {
    const isUsingHardwareWallet = !!transport;
    let broadcastedTx;
    try {
      if (isUsingHardwareWallet) {
        const {coin, network} = fromWalletSelected.credentials;
        const configFn = currencyConfigs[coin];
        if (!configFn) {
          throw new Error(`Unsupported currency: ${coin.toUpperCase()}`);
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
        broadcastedTx = await dispatch(
          publishAndSign({
            txp: ctxp! as TransactionProposal,
            key,
            wallet: fromWalletSelected,
          }),
        );
      }

      console.log('********** broadcastedTx: ', broadcastedTx);

      const reqData = {
        env: thorswapEnv,
        // hash: '0xe08be1cb20fd2db5603c7d0c99bbef68ee2b3278d949450beef15a7523c86cb6',
        txn: {
          quoteId: quoteData?.quoteId,
          hash: (broadcastedTx as Partial<TransactionProposal>).txid,
          sellAmount: quoteData?.sellAssetAmount,
          route: routeToUse,
        },
      };
      console.log('========== swapTx data enviada: ', reqData);
      // thorswapGetSwapTx needed to track the Tx progress
      const swapTx = await thorswapGetSwapTx(reqData);
      console.log('========== swapTx data recibida: ', swapTx);

      saveThorswapTx(broadcastedTx);
      dispatch(dismissOnGoingProcessModal());
      await sleep(400);
      setShowPaymentSentModal(true);
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
          logger.error(JSON.stringify(err));
          const msg = t('Uh oh, something went wrong. Please try again later');
          const reason = 'publishAndSign Error';
          showError(msg, reason);
      }
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

  const saveThorswapTx = (broadcastedTx?: any) => {
    const newData: thorswapTxData = {
      orderId: uuid.v4().toString(),
      exchangeTxId: (broadcastedTx as Partial<TransactionProposal>)?.txid!,
      date: Date.now(),
      amountTo: amountTo!,
      coinTo: toWalletSelected.currencyAbbreviation.toLowerCase(),
      chainTo: toWalletSelected.chain.toLowerCase(),
      addressTo: txData.addressTo,
      walletIdTo: toWalletSelected.id,
      amountFrom: amountFrom!,
      coinFrom: fromWalletSelected.currencyAbbreviation.toLowerCase(),
      chainFrom: fromWalletSelected.chain.toLowerCase(),
      payinAddress: txData.payinAddress,
      payinExtraId: txData.payinExtraId,
      totalExchangeFee: totalExchangeFee!,
      quoteId: quoteData?.quoteId!,
      spenderKey: spenderKey!,
      status: txData.status,
    };

    dispatch(
      SwapCryptoActions.successTxThorswap({
        thorswapTxData: newData,
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
        exchange: 'thorswap',
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

  const showError = async (msg?: string, reason?: string) => {
    setIsLoading(false);
    dispatch(dismissOnGoingProcessModal());
    await sleep(1000);
    dispatch(
      Analytics.track('Failed Crypto Swap', {
        exchange: 'thorswap',
        context: 'ThorswapCheckout',
        reasonForFailure: reason || 'unknown',
        amountFrom: amountFrom || '',
        fromCoin: fromWalletSelected.currencyAbbreviation || '',
        toCoin: toWalletSelected.currencyAbbreviation || '',
      }),
    );
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title: t('Error'),
        message: msg ? msg : t('Unknown Error'),
        enableBackdropDismiss: false,
        actions: [
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
    createThorswapTransaction();

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
          <RowLabel>{t('Selling')}</RowLabel>
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
                      fromWalletSelected.chain, // use chain for miner fee
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
                    {toWalletSelected.chain.toUpperCase()}
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
                    "Exchange services provided by THORSwap. By checking this, I acknowledge and accept THORSwap's terms of use.",
                  )}
                </CheckboxText>
                <PoliciesContainer
                  onPress={() => {
                    dispatch(
                      openUrlWithInAppBrowser(
                        'https://app.thorswap.finance/tos',
                      ),
                    );
                  }}>
                  <PoliciesText>{t('Review THORSwap policies')}</PoliciesText>
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

      {!paymentExpired ? (
        <TouchableOpacity
          onPress={() => {
            if (!termsAccepted) {
              scrollViewRef?.current?.scrollToEnd({animated: true});
            }
            setShowCheckTermsMsg(!termsAccepted);
          }}>
          <SwipeButton
            title={'Slide to send'}
            disabled={!termsAccepted}
            onSwipeComplete={onSwipeComplete}
            forceReset={resetSwipeButton}
          />
        </TouchableOpacity>
      ) : null}

      <ThorswapPoliciesModal
        isVisible={thorswapPoliciesModalVisible}
        onDismiss={() => {
          setThorswapPoliciesModalVisible(false);
        }}
      />

      <PaymentSent
        isVisible={showPaymentSentModal}
        onCloseModal={async () => {
          setShowPaymentSentModal(false);
          await sleep(600);
          navigation.dispatch(
            CommonActions.reset({
              index: 1,
              routes: [
                {
                  name: RootStacks.TABS,
                  params: {screen: TabsScreens.HOME},
                },
                {
                  name: ExternalServicesSettingsScreens.THORSWAP_SETTINGS,
                },
              ],
            }),
          );
        }}
      />
    </SwapCheckoutContainer>
  );
};

export default ThorswapCheckout;
