import React, {useEffect, useState} from 'react';
import {ScrollView} from 'react-native';
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
import ChangellyCheckoutSkeleton from './ChangellyCheckoutSkeleton';
import {BWCErrorMessage} from '../../../../constants/BWCError';
import {Black, White, Slate, Caution} from '../../../../styles/colors';
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
  Token,
} from '../../../../store/wallet/wallet.models';
import {createWalletAddress} from '../../../../store/wallet/effects/address/address';
import {
  toFiat,
  GetProtocolPrefixAddress,
} from '../../../../store/wallet/utils/wallet';
import {
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
  changellyCreateFixTransaction,
  changellyGetFixRateForAmount,
  getChangellyFixedCurrencyAbbreviation,
} from '../utils/changelly-utils';
import {
  getBadgeImg,
  getCurrencyAbbreviation,
  getCWCChain,
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
  ArrowContainer,
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
  publishAndSign,
} from '../../../../store/wallet/effects/send/send';
import {changellyTxData} from '../../../../store/swap-crypto/swap-crypto.models';
import {SwapCryptoActions} from '../../../../store/swap-crypto';
import SelectorArrowRight from '../../../../../assets/img/selector-arrow-right.svg';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../../../store';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {changellyGetTransactions} from '../../../../store/swap-crypto/effects/changelly/changelly';

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

let countDown: NodeJS.Timer | undefined;

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

  const [isLoading, setIsLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
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

  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [txData, setTxData] = useState<any>();

  const alternativeIsoCode = 'USD';
  let addressFrom: string; // Refund address
  let addressTo: string; // Receiving address
  let payinExtraId: string;
  let status: string;
  let payinAddress: string;

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

    if (fromWalletSelected.currencyAbbreviation.toLowerCase() === 'bch') {
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

        if (fromWalletSelected.currencyAbbreviation.toLowerCase() === 'bch') {
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
          const presicion = dispatch(
            GetPrecision(
              toWalletSelected.currencyAbbreviation,
              toWalletSelected.chain,
              toWalletSelected.tokenAddress,
            ),
          );
          const newFiatAmountTo = dispatch(
            toFiat(
              Number(data.result.amountExpectedTo) * presicion!.unitToSatoshi,
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

        const presicion = dispatch(
          GetPrecision(
            fromWalletSelected.currencyAbbreviation,
            fromWalletSelected.chain,
            fromWalletSelected.tokenAddress,
          ),
        );
        // To Sat
        const depositSat = Number(
          (amountExpectedFrom * presicion!.unitToSatoshi).toFixed(0),
        );

        createTx(fromWalletSelected, payinAddress, depositSat, payinExtraId)
          .then(async ctxp => {
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
          exchange: 'changelly',
          context: 'ChangellyCheckout',
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
  ) => {
    try {
      const message =
        fromWalletSelected.currencyAbbreviation.toUpperCase() +
        t(' to ') +
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

  const makePayment = async () => {
    try {
      dispatch(startOnGoingProcessModal('SENDING_PAYMENT'));
      await sleep(400);

      const broadcastedTx = (await dispatch<any>(
        publishAndSign({txp: ctxp!, key, wallet: fromWalletSelected}),
      )) as any;
      saveChangellyTx();
      dispatch(dismissOnGoingProcessModal());
      await sleep(400);
      setShowPaymentSentModal(true);
    } catch (err) {
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
          setResetSwipeButton(true);
          break;
        default:
          logger.error(JSON.stringify(err));
          const msg = t('Uh oh, something went wrong. Please try again later');
          const reason = 'publishAndSign Error';
          showError(msg, reason);
      }
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
        toCoin: toWalletSelected.currencyAbbreviation,
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
      `Because you are sending the maximum amount contained in this wallet, the ${chain} miner fee (${fee} ${coin.toUpperCase()}) will be deducted from the total.` +
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
        exchange: 'changelly',
        context: 'ChangellyCheckout',
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
      <ScrollView>
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
          <ChangellyCheckoutSkeleton />
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
            <CheckBoxContainer>
              <Checkbox
                radio={false}
                onPress={() => {
                  setTermsAccepted(!termsAccepted);
                }}
                checked={termsAccepted}
              />
              <CheckboxText>
                {t(
                  'Exchange services provided by Changelly. By clicking “Accept”, I acknowledge and understand that my transaction may trigger AML/KYC verification according to Changelly AML/KYC',
                )}
              </CheckboxText>
            </CheckBoxContainer>
            <PoliciesContainer
              onPress={() => {
                setChangellyPoliciesModalVisible(true);
              }}>
              <PoliciesText>{t('Review Changelly policies')}</PoliciesText>
              <ArrowContainer>
                <SelectorArrowRight
                  {...{
                    width: 13,
                    height: 13,
                    color: theme.dark ? White : Slate,
                  }}
                />
              </ArrowContainer>
            </PoliciesContainer>
          </>
        )}
      </ScrollView>

      {termsAccepted && !paymentExpired && !!exchangeTxId && (
        <SwipeButton
          title={'Slide to send'}
          onSwipeComplete={async () => {
            try {
              logger.debug('Swipe completed. Making payment...');
              makePayment();
            } catch (err) {}
          }}
          forceReset={resetSwipeButton}
        />
      )}

      <ChangellyPoliciesModal
        isVisible={changellyPoliciesModalVisible}
        onDismiss={() => {
          setChangellyPoliciesModalVisible(false);
        }}
      />

      <PaymentSent
        isVisible={showPaymentSentModal}
        onCloseModal={async () => {
          setShowPaymentSentModal(false);
          await sleep(300);
          navigation.dispatch(
            CommonActions.reset({
              index: 2,
              routes: [
                {
                  name: 'Tabs',
                  params: {screen: 'Home'},
                },
                {
                  name: 'ExternalServicesSettings',
                  params: {
                    screen: 'ChangellySettings',
                  },
                },
              ],
            }),
          );
        }}
      />
    </SwapCheckoutContainer>
  );
};

export default ChangellyCheckout;
