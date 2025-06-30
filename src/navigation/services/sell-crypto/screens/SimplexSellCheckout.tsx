import Transport from '@ledgerhq/hw-transport';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ScrollView} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import InfoSvg from '../../../../../assets/img/info.svg';
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
import SuccessIcon from '../../../../../assets/img/success.svg';
import ScanSvg from '../../../../../assets/img/onboarding/scan.svg';
import SimplexSellCheckoutSkeleton from './SimplexSellCheckoutSkeleton';
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
import {SimplexSellOrderData} from '../../../../store/sell-crypto/models/simplex-sell.models';
import {SimplexSettingsProps} from '../../../../navigation/tabs/settings/external-services/screens/SimplexSettings';
import SendToPill from '../../../../navigation/wallet/components/SendToPill';
import {SellCryptoActions} from '../../../../store/sell-crypto';
import haptic from '../../../../components/haptic-feedback/haptic';
import {WithdrawalMethodKey} from '../constants/SellCryptoConstants';
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
import {Controller, useForm} from 'react-hook-form';
import BoxInput from '../../../../components/form/BoxInput';
import {yupResolver} from '@hookform/resolvers/yup';
import yup from '../../../../lib/yup';
import {GetCoinAndNetwork} from '../../../../store/wallet/effects/address/address';
import {ValidateCoinAddress} from '../../../../store/wallet/utils/validations';
import {CryptoOffer} from './SellCryptoOffers';
import {SellBalanceContainer} from '../styled/SellCryptoCard';
import {AppActions} from '../../../../store/app';

// Styled
export const SellCheckoutContainer = styled.SafeAreaView`
  flex: 1;
  margin: 14px;
`;

const InputContainer = styled.View<{hideInput?: boolean}>`
  display: ${({hideInput}) => (!hideInput ? 'flex' : 'none')};
  margin: 10px 0;
`;

const AddressBadge = styled.View`
  position: absolute;
  right: 13px;
  top: 50%;
`;

const ScanButtonContainer = styled(TouchableOpacity)`
  position: absolute;
  right: 5px;
  top: 32px;
`;

export interface SimplexSellCheckoutProps {
  simplexQuoteOffer: CryptoOffer;
  wallet: Wallet;
  amount: number;
  externalId: string;
  paymentMethod: WithdrawalMethodKey;
  simplexTxId: string;
  useSendMax?: boolean;
  sendMaxInfo?: SendMaxInfo;
}

let countDown: NodeJS.Timeout | undefined;

const SimplexSellCheckout: React.FC = () => {
  let {
    params: {
      simplexQuoteOffer,
      wallet,
      amount,
      externalId,
      paymentMethod,
      simplexTxId,
      useSendMax,
      sendMaxInfo,
    },
  } = useRoute<RouteProp<{params: SimplexSellCheckoutProps}>>();
  const {t} = useTranslation();
  const schema = yup.object().shape({
    toAddress: yup.string().trim().required(),
  });
  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    formState: {errors, dirtyFields},
  } = useForm<{toAddress: string}>({resolver: yupResolver(schema)});
  const logger = useLogger();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const BWC = BwcProvider.getInstance();
  const scrollViewRef = useRef<ScrollView>(null);

  const [toAddressValue, setToAddressValue] = useState<string | undefined>();
  const [validAddress, setValidAddress] = useState(false);
  const [isToken, setIsToken] = useState(
    IsERCToken(wallet.currencyAbbreviation, wallet.chain),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showCheckTermsMsg, setShowCheckTermsMsg] = useState(false);
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
  const [isConfirmHardwareWalletModalVisible, setConfirmHardwareWalletVisible] =
    useState(false);
  const [hardwareWalletTransport, setHardwareWalletTransport] =
    useState<Transport | null>(null);
  const [confirmHardwareState, setConfirmHardwareState] =
    useState<SimpleConfirmPaymentState | null>(null);

  let destinationTag: string | undefined; // handle this if XRP is enabled to sell

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
    let payTill: number | null | undefined;

    if (!payTill) {
      // simplexQuoteOffer.quoteData.expiry_ts expires in less than 1 min
      logger.debug(
        'No expiry_ts parameter present. Setting custom expiration time.',
      );
      const now = Date.now();
      payTill = now + 15 * 60 * 1000;
    }

    paymentTimeControl(payTill);

    const _totalExchangeFee = simplexQuoteOffer.quoteData?.fiat_amount
      ? Number(simplexQuoteOffer.quoteData.fiat_amount) * 0.05 // %5
      : undefined;
    setTotalExchangeFee(_totalExchangeFee);
  };

  const processAddress = (address?: string | undefined) => {
    if (address) {
      const coinAndNetwork = GetCoinAndNetwork(address);
      if (coinAndNetwork) {
        if (
          coinAndNetwork.coin?.toLowerCase() !=
            wallet.currencyAbbreviation?.toLowerCase() ||
          coinAndNetwork.network != 'livenet'
        ) {
          setError('toAddress', {
            type: 'manual',
            message: t('Coin or Network invalid'),
          });
          return;
        }

        const isValid = ValidateCoinAddress(
          address,
          coinAndNetwork.coin,
          coinAndNetwork.network,
        );

        if (isValid) {
          clearErrors('toAddress');
          setValidAddress(true);
          setToAddressValue(address);
        } else {
          // try testnet
          const isValidTest = ValidateCoinAddress(
            address,
            coinAndNetwork.coin,
            'testnet',
          );
          if (isValidTest) {
            setValidAddress(false);
            setError('toAddress', {
              type: 'manual',
              message: t('Testnet addresses are not allowed'),
            });
          }
        }
      } else {
        setError('toAddress', {
          type: 'manual',
          message: t('Invalid address'),
        });
        setValidAddress(false);
      }
    } else {
      clearErrors('toAddress');
    }
  };

  const goToScan = () => {
    dispatch(
      Analytics.track('Open Scanner', {
        context: 'sellCrypto - SimplexCheckout',
      }),
    );
    navigation.navigate('ScanRoot', {
      onScanComplete: address => {
        setValue('toAddress', address, {shouldDirty: true});
        processAddress(address);
      },
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
          simplex: toAddress,
          service: 'simplex',
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
      const log = `simplexSellCheckout createTxProposal error: ${errStr}`;
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

      const newData: SimplexSellOrderData = {
        env: __DEV__ ? 'dev' : 'prod',
        wallet_id: wallet.id,
        address_to: toAddressValue ?? '',
        coin: cloneDeep(wallet.currencyAbbreviation).toUpperCase(),
        chain: cloneDeep(wallet.chain).toLowerCase(),
        external_id: externalId,
        created_on: Date.now(),
        crypto_amount: amountExpected,
        fiat_currency: simplexQuoteOffer.fiatCurrency
          ? cloneDeep(simplexQuoteOffer.fiatCurrency).toUpperCase()
          : '',
        payment_method: paymentMethod ?? '',
        fiat_receiving_amount: Number(simplexQuoteOffer.quoteData.fiat_amount),
        status: 'bitpayTxSent',
        transaction_id: simplexTxId,
        tx_sent_id: broadcastedTx?.txid,
        quote_id: simplexQuoteOffer.quoteData.quote_id ?? '',
        send_max: useSendMax,
      };

      dispatch(
        SellCryptoActions.successSellOrderSimplex({
          simplexSellOrderData: newData,
        }),
      );

      dispatch(
        Analytics.track('Successful Crypto Sell', {
          coin: wallet.currencyAbbreviation.toLowerCase(),
          chain: wallet.chain.toLowerCase(),
          amount: amountExpected,
          fiatAmount: Number(simplexQuoteOffer.quoteData.fiat_amount) || '',
          fiatCurrency: simplexQuoteOffer.fiatCurrency
            ? cloneDeep(simplexQuoteOffer.fiatCurrency).toLocaleLowerCase()
            : '',
          exchange: 'simplex',
        }),
      );

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
      const simplexSettingsParams: SimplexSettingsProps = {
        incomingPaymentRequest: {
          externalId: externalId,
          transactionId: simplexTxId,
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
              name: ExternalServicesSettingsScreens.SIMPLEX_SETTINGS,
              params: simplexSettingsParams,
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

    logger.error('Simplex error: ' + msg);

    dispatch(
      Analytics.track('Failed Crypto Sell', {
        exchange: 'simplex',
        context: 'SimplexSellCheckout',
        reasonForFailure: reason || 'unknown',
        errorMsg: errorMsgLog || 'unknown',
        amountFrom: amountExpected || '',
        fromCoin: wallet.currencyAbbreviation.toLowerCase() || '',
        fromChain: wallet.chain?.toLowerCase() || '',
        fiatAmount: Number(simplexQuoteOffer.quoteData.fiat_amount) || '',
        fiatCurrency: simplexQuoteOffer.fiatCurrency
          ? cloneDeep(simplexQuoteOffer.fiatCurrency).toUpperCase()
          : '',
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
    if (isToken) {
      useSendMax = false;
    }

    init();

    return () => {
      if (countDown) {
        clearInterval(countDown);
      }
    };
  }, []);

  useEffect(() => {
    if (validAddress && toAddressValue && toAddressValue !== '') {
      dispatch(startOnGoingProcessModal('CREATING_TXP'));
      setIsLoading(true);

      let toAddress = toAddressValue;

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
        const toAddressCashaddr: string = BWC.getBitcoreCash()
          .Address(toAddressValue)
          .toString(true);

        logger.debug(
          `BCH wallet, transform toAddress: ${toAddressValue} to cashaddr: ${toAddressCashaddr}`,
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
        .catch((err: any) => {
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
    }
  }, [validAddress, toAddressValue]);

  useEffect(() => {
    if (remainingTimeStr === 'expired' && !expiredAnalyticSent) {
      dispatch(
        Analytics.track('Failed Crypto Sell', {
          exchange: 'simplex',
          context: 'SimplexSellCheckout',
          reasonForFailure: 'Time to make the payment expired',
          amountFrom: amountExpected || '',
          fromCoin: wallet.currencyAbbreviation.toLowerCase() || '',
          fiatAmount: Number(simplexQuoteOffer.quoteData.fiat_amount) || '',
          fiatCurrency: simplexQuoteOffer.fiatCurrency
            ? cloneDeep(simplexQuoteOffer.fiatCurrency).toUpperCase()
            : '',
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
        {validAddress && toAddressValue && toAddressValue !== '' ? (
          <RowDataContainer>
            <RowLabel>{t('Simplex Deposit Address')}</RowLabel>
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
              description={formatCryptoAddress(toAddressValue)}
              onPress={() => {
                copyText(toAddressValue);
              }}
            />
          </RowDataContainer>
        ) : (
          <InputContainer>
            <RowLabel style={{marginBottom: 10}}>
              {t('Simplex Deposit Address')}
            </RowLabel>
            <Controller
              control={control}
              render={({field: {onChange, onBlur, value}}) => (
                <BoxInput
                  placeholder={'Crypto address'}
                  onBlur={onBlur}
                  onChangeText={(newValue: string) => {
                    const trimmedValue = newValue.trim();
                    onChange(trimmedValue);
                    processAddress(trimmedValue);
                  }}
                  error={errors.toAddress?.message}
                  value={value}
                  paddingRight={38}
                />
              )}
              name="toAddress"
              defaultValue=""
            />
            {toAddressValue && dirtyFields.toAddress ? (
              <AddressBadge>
                <SuccessIcon />
              </AddressBadge>
            ) : (
              <ScanButtonContainer onPress={goToScan}>
                <ScanSvg />
              </ScanButtonContainer>
            )}
          </InputContainer>
        )}
        <ItemDivisor />
        {validAddress ? (
          <>
            {isLoading ? (
              <SimplexSellCheckoutSkeleton />
            ) : (
              <>
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
                {totalExchangeFee ? (
                  <>
                    <RowDataContainer>
                      <SellBalanceContainer>
                        <RowLabel>{t('Exchange Fee')}</RowLabel>
                        <TouchableOpacity
                          onPress={() => {
                            haptic('impactLight');
                            dispatch(
                              openUrlWithInAppBrowser(
                                'https://support.simplex.com/hc/en-gb/articles/360014078420-What-fees-do-you-charge-for-card-payments',
                              ),
                            );
                          }}
                          style={{marginLeft: 8, marginTop: -3}}>
                          <InfoSvg width={20} height={20} />
                        </TouchableOpacity>
                      </SellBalanceContainer>
                      <RowData>
                        {'≈ '}
                        {Number(totalExchangeFee).toFixed(2)}{' '}
                        {simplexQuoteOffer?.fiatCurrency?.toUpperCase()}
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
                {simplexQuoteOffer?.quoteData ? (
                  <RowDataContainer style={{marginTop: 25, marginBottom: 5}}>
                    <H7>{t('TOTAL TO RECEIVE')}</H7>
                    {simplexQuoteOffer?.quoteData?.fiat_amount ? (
                      <H5>
                        {Number(
                          simplexQuoteOffer.quoteData.fiat_amount,
                        ).toFixed(2)}{' '}
                        {simplexQuoteOffer.fiatCurrency?.toUpperCase()}
                      </H5>
                    ) : null}
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
                      {t('Sell Crypto services provided by Simplex.') + '\n'}
                      {t(
                        'I have double-checked that the amount and destination address are the ones provided by Simplex to carry out this sale. Bitpay is not responsible for misuse of this feature.',
                      ) + '\n'}
                      {t(
                        "By checking this, I acknowledge and accept Simplex's terms of use.",
                      )}
                    </CheckboxText>
                    <PoliciesContainer
                      onPress={() => {
                        dispatch(
                          openUrlWithInAppBrowser(
                            'https://www.simplex.com/terms-of-use/payment-terms',
                          ),
                        );
                      }}>
                      <PoliciesText>
                        {t('Review Simplex Terms of use')}
                      </PoliciesText>
                    </PoliciesContainer>
                  </CheckBoxCol>
                </CheckBoxContainer>
              </>
            )}
          </>
        ) : null}
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

export default SimplexSellCheckout;
