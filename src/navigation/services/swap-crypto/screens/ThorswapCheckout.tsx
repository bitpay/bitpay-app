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
  IsEVMChain,
  IsUtxoChain,
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
import {thorswapGetSwapTx} from '../../../../store/swap-crypto/effects/thorswap/thorswap';
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
  ThorswapGetSwapTxData,
  ThorswapGetSwapTxRequestData,
  ThorswapProvider,
  ThorswapQuoteRoute,
  ThorswapRouteCalldata,
  ThorswapTrackingStatus,
  ThorswapTransaction,
} from '../../../../store/swap-crypto/models/thorswap.models';
import {
  THORSWAP_DEFAULT_GAS_LIMIT,
  THORSWAP_DEFAULT_SLIPPAGE,
} from '../constants/ThorswapConstants';
import {ExchangeConfig} from '../../../../store/external-services/external-services.types';

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
  slippage?: number;
  thorswapConfig?: ExchangeConfig;
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
      slippage,
      thorswapConfig,
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
  const [routeToUse, setRouteToUse] = useState<ThorswapQuoteRoute>();
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
      slippage: slippage ?? THORSWAP_DEFAULT_SLIPPAGE,
    };

    if (thorswapConfig?.config) {
      if (thorswapConfig.config.affiliateAddress) {
        requestData.affiliateAddress = thorswapConfig.config.affiliateAddress;
        if (thorswapConfig.config.affiliateBasisPoints) {
          requestData.affiliateBasisPoints =
            thorswapConfig.config.affiliateBasisPoints ?? 100; // 100 = 1%
          requestData.isAffiliateFeeFlat =
            thorswapConfig.config.isAffiliateFeeFlat !== undefined
              ? thorswapConfig.config.isAffiliateFeeFlat
              : true;
        }
      }
    }

    let thorswapQuoteData: ThorswapGetSwapQuoteData | undefined;
    try {
      thorswapQuoteData = await fromWalletSelected.thorswapGetSwapQuote(
        requestData,
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

    let bestRouteData: ThorswapQuoteRoute | undefined;
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
    let bitpayFee = 0;
    let totalFee = 0;

    if (bestRouteData.fees) {
      const thorswapFeeData = bestRouteData.fees;
      const _chain = cloneDeep(fromWalletSelected.chain).toUpperCase();

      if (thorswapFeeData[_chain]) {
        if (Array.isArray(thorswapFeeData[_chain])) {
          thorswapFeeData[_chain].forEach(e => {
            if (e.affiliateFeeUSD) {
              thorswapFee += Number(e.affiliateFeeUSD);
            }
            if (e.type === 'outbound' && e.networkFeeUSD) {
              thorswapFee += Number(e.networkFeeUSD);
            }
          });
        }
      }

      if (thorswapFeeData.THOR) {
        if (Array.isArray(thorswapFeeData.THOR)) {
          thorswapFeeData.THOR.forEach(e => {
            if (e.affiliateFeeUSD) {
              thorswapFee += Number(e.affiliateFeeUSD);
            }
            if (e.type === 'outbound' && e.networkFeeUSD) {
              thorswapFee += Number(e.networkFeeUSD);
            }
          });
        }
      }

      if (requestData.affiliateBasisPoints && bestRouteData.expectedOutputUSD) {
        const affiliatePrcnt = Number(requestData.affiliateBasisPoints) / 100;
        bitpayFee =
          Number(bestRouteData.expectedOutputUSD) * (affiliatePrcnt / 100);
      }

      totalFee = thorswapFee + bitpayFee;
      setTotalExchangeFee(totalFee);
      logger.debug(
        `Thorswap fee: ${thorswapFee} USD - BitPay fee: ${bitpayFee} USD - Total Exchange fee: ${totalFee} USD`,
      );
    }

    if (IsUtxoChain(fromWalletSelected.chain)) {
      // UTXO Chains
      if (
        bestRouteData.calldata?.vault &&
        bestRouteData.calldata?.vault !== ''
      ) {
        payinAddress = bestRouteData.calldata.vault;
      }
    } else {
      // EVM Chains
      if (
        bestRouteData.transaction?.to &&
        bestRouteData.transaction?.to !== ''
      ) {
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
    }

    if (
      fromWalletSelected.currencyAbbreviation.toLowerCase() === 'bch' &&
      fromWalletSelected.chain.toLowerCase() === 'bch'
    ) {
      payinAddress = BWC.getBitcoreCash()
        .Address(payinAddress) // TODO: review: is targetAddress always present in any Route??
        .toString(true);
    }

    setAmountTo(Number(bestRouteData.expectedOutput));

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

    try {
      const ctxp = await createTx(
        fromWalletSelected,
        payinAddress,
        depositSat,
        bestRouteData.transaction,
        bestRouteData.calldata,
        payinExtraId,
      );

      if (ctxp) {
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
      }
    } catch (err: any) {
      let msg = t('Error creating transaction');
      if (err?.message && typeof err.message === 'string') {
        msg = msg + `: ${err.message}`;
      }
      const reason = 'createTx Error';
      showError(msg, reason);
      return;
    }
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
    thorswapCalldata?: ThorswapRouteCalldata,
    destTag?: string,
  ) => {
    try {
      const message =
        fromWalletSelected.currencyAbbreviation.toUpperCase() +
        ' ' +
        t('to') +
        ' ' +
        toWalletSelected.currencyAbbreviation.toUpperCase();

      let outputs: TransactionProposalOutputs[] = [];
      let calldata: string | undefined;
      let gasLimit: number | undefined;

      if (IsEVMChain(wallet.chain)) {
        logger.debug('WalletFrom is EVM Chain: building EVM Chain txp');

        if (IsERCToken(wallet.currencyAbbreviation, wallet.chain)) {
          logger.debug('WalletFrom is ERC20 Token: building ERC20 txp');
          // ERC20 funds are moved in calldata
          depositSat = 0;
        }

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
          logger.debug('gasLimit not present. Estimating...');
          const ABI = getExchangeAbiByContractAddress(payinAddress);
          if (ABI && calldata && spenderKey) {
            try {
              const iface = new ethers.utils.Interface(ABI);
              const parsedData = iface.parseTransaction({data: calldata});
              gasLimit = estimateThorswapTxGasLimit(
                spenderKey,
                parsedData.name,
              );
            } catch (err: any) {
              // use DEFAULT
              gasLimit = THORSWAP_DEFAULT_GAS_LIMIT;
              let msg: string =
                'Error trying to estimate gasLimit. Using default value.';

              if (typeof err === 'string') {
                msg = msg + ` Error: ${err}`;
              } else if (err?.message && typeof err.message === 'string') {
                msg = msg + ` Error: ${err.message}`;
              }
              logger.warn(msg);
            }
          } else {
            // use DEFAULT
            gasLimit = THORSWAP_DEFAULT_GAS_LIMIT;
          }
        }

        outputs.push({
          toAddress: payinAddress,
          amount: depositSat,
          message: message,
          data: calldata,
          gasLimit,
        });
      } else {
        if (IsUtxoChain(fromWalletSelected.chain)) {
          // UTXO Chains
          if (thorswapCalldata?.memo && thorswapCalldata?.memo !== '') {
            // Convert memo string to bytes
            const bytes = new TextEncoder().encode(thorswapCalldata.memo);
            // Convert bytes to hexa
            const hexMemo = bytes.reduce(
              (str, byte) => str + byte.toString(16).padStart(2, '0'),
              '',
            );
            // Calculate bytes
            const hexLength = hexMemo.length / 2;
            const byteCount = Math.ceil(hexLength);
            // Check if byteCount is valid for OP_PUSHBYTES_<byteCount>. Max: 75
            if (byteCount > 75) {
              throw new Error(
                `Memo is too big for OP_PUSHBYTES_<byteCount>. Size: ${byteCount}`,
              );
            }
            // Generarte OP_PUSHBYTES_<byteCount> in hex
            const opPushBytes = byteCount.toString(16).padStart(2, '0');
            const op_return_hex = '6a';

            const _script = `${op_return_hex}${opPushBytes}${hexMemo}`;
            logger.debug(
              `Result script to include in ${fromWalletSelected.chain} tx: ${_script}`,
            );

            outputs.push({
              toAddress: payinAddress,
              amount: depositSat,
              message: message,
            });

            outputs.push({
              script: _script,
              amount: 0,
            });
          }
        } else {
          // EVM Chains (No tokens)
          outputs.push({
            toAddress: payinAddress,
            amount: depositSat,
            message: message,
          });
        }
      }

      let txp: Partial<TransactionProposal> = {
        toAddress: payinAddress,
        amount: depositSat,
        coin: wallet.currencyAbbreviation.toLowerCase(),
        chain: wallet.chain.toLowerCase(),
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

      const reqData: ThorswapGetSwapTxRequestData = {
        env: thorswapEnv,
        txn: {
          quoteId: quoteData?.quoteId!,
          hash: (broadcastedTx as Partial<TransactionProposal>)?.txid!,
          sellAmount: quoteData?.sellAssetAmount!,
          route: routeToUse!,
        },
      };
      // thorswapGetSwapTx needed to track the Tx progress
      const swapTx: ThorswapGetSwapTxData = await thorswapGetSwapTx(reqData);

      saveThorswapTx(broadcastedTx, swapTx);
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

  const saveThorswapTx = (
    broadcastedTx?: any,
    thorswapSwapTxData?: ThorswapGetSwapTxData,
  ) => {
    let newStatus: ThorswapTrackingStatus = ThorswapTrackingStatus.bitpayTxSent;

    if (thorswapSwapTxData?.status) {
      newStatus = thorswapSwapTxData.status;
    } else if (thorswapSwapTxData?.result?.status) {
      newStatus = thorswapSwapTxData.result.status;
    }

    const newData: thorswapTxData = {
      orderId: uuid.v4().toString(),
      txHash: (broadcastedTx as Partial<TransactionProposal>)?.txid!,
      date: Date.now(),
      amountTo: amountTo!,
      coinTo: toWalletSelected.currencyAbbreviation.toLowerCase(),
      chainTo: toWalletSelected.chain.toLowerCase(),
      addressTo: txData.addressTo,
      walletIdTo: toWalletSelected.id,
      amountFrom: amountFrom!,
      coinFrom: fromWalletSelected.currencyAbbreviation.toLowerCase(),
      chainFrom: fromWalletSelected.chain.toLowerCase(),
      payinAddress: txData.payinAddress, // Spender contract address
      payinExtraId: txData.payinExtraId,
      totalExchangeFee: totalExchangeFee!,
      quoteId: quoteData?.quoteId!,
      spenderKey: spenderKey!,
      slippage: slippage,
      status: newStatus,
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
                    {Number(totalExchangeFee).toFixed(6)} {'USD'}
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
                    "Exchange services provided by THORSwap. By checking this, I acknowledge and accept THORSwap's terms of service.",
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
                  <PoliciesText>
                    {t("Review THORSwap's terms of service")}
                  </PoliciesText>
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
