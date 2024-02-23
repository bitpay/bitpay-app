import React, {useEffect, useRef, useState} from 'react';
import {ScrollView, TouchableOpacity} from 'react-native';
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
import MoonpaySellCheckoutSkeleton from './MoonpaySellCheckoutSkeleton';
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
} from '../../../../store/wallet/wallet.models';
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
  formatCryptoAddress,
  getBadgeImg,
  getCurrencyAbbreviation,
  getCWCChain,
  sleep,
} from '../../../../utils/helper-methods';
import MoonpaySellPoliciesModal from '../components/MoonpaySellPoliciesModal';
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
  ArrowContainer,
} from '../../swap-crypto/styled/SwapCryptoCheckout.styled';
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
import SelectorArrowRight from '../../../../../assets/img/selector-arrow-right.svg';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../../../store';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {RootStacks} from '../../../../Root';
import {TabsScreens} from '../../../tabs/TabsStack';
import {ExternalServicesSettingsScreens} from '../../../tabs/settings/external-services/ExternalServicesGroup';
import {
  MoonpaySellIncomingData,
  MoonpaySellOrderData,
  MoonpaySellTransactionDetails,
} from '../../../../store/sell-crypto/sell-crypto.models';
import {moonpaySellEnv} from '../utils/moonpay-sell-utils';
import {moonpayGetSellTransactionDetails} from '../../../../store/buy-crypto/effects/moonpay/moonpay';
import {MoonpaySettingsProps} from '../../../../navigation/tabs/settings/external-services/screens/MoonpaySettings';
import SendToPill from '../../../../navigation/wallet/components/SendToPill';
import {SellCryptoActions} from '../../../../store/sell-crypto';

// Styled
export const SellCheckoutContainer = styled.SafeAreaView`
  flex: 1;
  margin: 14px;
`;

export interface MoonpaySellCheckoutProps {
  sellCrpytoExternalId: string;
  wallet: Wallet;
  toAddress: string;
  amount: number;
  useSendMax?: boolean;
  sendMaxInfo?: SendMaxInfo;
}

let countDown: NodeJS.Timer | undefined;

const MoonpaySellCheckout: React.FC = () => {
  let {
    params: {
      sellCrpytoExternalId,
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
    ({SELL_CRYPTO}: RootState) => SELL_CRYPTO.moonpay[sellCrpytoExternalId],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showCheckTermsMsg, setShowCheckTermsMsg] = useState(false);
  const [remainingTimeStr, setRemainingTimeStr] = useState<string>('');
  const [amountExpected, setAmountExpected] = useState<number>(amount);
  const [fee, setFee] = useState<number>();
  const [ctxp, setCtxp] = useState<Partial<TransactionProposal>>();

  const [totalExchangeFee, setTotalExchangeFee] = useState<number>();
  const [moonpaySellPoliciesModalVisible, setMoonpaySellPoliciesModalVisible] =
    useState(false);
  const [paymentExpired, setPaymentExpired] = useState(false);
  const key = useAppSelector(
    ({WALLET}: RootState) => WALLET.keys[wallet.keyId],
  );
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [txData, setTxData] = useState<MoonpaySellTransactionDetails>();

  const alternativeIsoCode = 'USD';
  let destinationTag: string | undefined; // handle this if XRP is enabled to sell
  let status: string;
  let payinAddress: string;

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
        Analytics.track('Failed Crypto Sell', {
          exchange: 'moonpay',
          context: 'MoonpaySellCheckout',
          reasonForFailure: 'Time to make the payment expired',
          amountFrom: amountExpected || '',
          fromCoin: wallet.currencyAbbreviation || '',
          fiatAmount: sellOrder?.fiat_receiving_amount || '',
          fiatCurrency: sellOrder?.fiat_currency || '',
        }),
      );
      return;
    }

    const totalSecs = expirationTime - now;
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    setRemainingTimeStr(('0' + m).slice(-2) + ':' + ('0' + s).slice(-2));
  };

  // TODO : Review if this is neccessary payinAddress => toAddress
  // if (wallet.currencyAbbreviation.toLowerCase() === 'bch') {
  //   payinAddress = BWC.getBitcoreCash()
  //     .Address(data.result.payinAddress)
  //     .toString(true);
  // } else {
  //   payinAddress = data.result.payinAddress;
  // }

  // TODO: destinationTag ????

  const init = async () => {
    // const requestData: any = {
    //   env: moonpaySellEnv === 'sandbox' ? 'dev' : 'prod',
    // }
    // if (sellOrder.transaction_id) {
    //   requestData.transactionId = sellOrder.transaction_id
    // } else if (sellOrder.external_id) {
    //   requestData.externalId = sellOrder.external_id
    // }

    let sellTxDetails: MoonpaySellTransactionDetails;
    try {
      sellTxDetails = await moonpayGetSellTransactionDetails(
        sellOrder.transaction_id,
        sellOrder.external_id,
      );
      setTxData(sellTxDetails);
    } catch (err) {
      // TODO: handle this
      return;
    }

    if (sellTxDetails.quoteExpiredEmailSentAt) {
      // TODO: handle expired quote
      return;
    }

    // TODO: set payTill with a couple of minutes less than quoteExpiresAt, to be safe
    let payTill: string | number | null = sellTxDetails.quoteExpiresAt;

    if (!payTill) {
      logger.debug(
        'No quoteExpiresAt parameter present. Setting custom expiration time.',
      );
      const now = Date.now();
      payTill = now + 3 * 60 * 1000;
    }

    paymentTimeControl(payTill);

    const _totalExchangeFee =
      Number(sellTxDetails.feeAmount) + Number(sellTxDetails.extraFeeAmount);
    setTotalExchangeFee(_totalExchangeFee);

    const presicion = dispatch(
      GetPrecision(
        wallet.currencyAbbreviation,
        wallet.chain,
        wallet.tokenAddress,
      ),
    );
    // To Sat
    const depositSat = Number(
      (amountExpected * presicion!.unitToSatoshi).toFixed(0),
    );

    createTx(wallet, toAddress, depositSat, destinationTag)
      .then(async ctxp => {
        setCtxp(ctxp);
        setFee(ctxp.fee);

        // const _txData = {
        //   addressFrom,
        //   addressTo,
        //   destinationTag,
        //   status,
        //   payinAddress,
        // };
        // setTxData(_txData);

        setIsLoading(false);
        dispatch(dismissOnGoingProcessModal());
        await sleep(400);

        if (useSendMax) {
          showSendMaxWarning(ctxp.coin, ctxp.chain, wallet.tokenAddress);
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

  const createTx = async (
    wallet: Wallet,
    toAddress: string,
    depositSat: number,
    destTag?: string,
  ) => {
    try {
      const message = `${wallet.currencyAbbreviation.toUpperCase()} sold on Moonpay`;
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
      const broadcastedTx = await dispatch(
        publishAndSign({
          txp: ctxp! as TransactionProposal,
          key,
          wallet: wallet,
        }),
      );
      updateMoonpayTx(txData!, broadcastedTx as Partial<TransactionProposal>);
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

  const updateMoonpayTx = (
    moonpayTxData: MoonpaySellTransactionDetails,
    broadcastedTx: Partial<TransactionProposal>,
  ) => {
    const dataToUpdate: MoonpaySellIncomingData = {
      externalId: sellCrpytoExternalId!,
      txSentOn: Date.now(),
      txSentId: broadcastedTx.txid,
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
        coin: wallet.currencyAbbreviation,
        chain: wallet.chain,
        amount: amountExpected,
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
      Analytics.track('Failed Crypto Sell', {
        exchange: 'moonpay',
        context: 'MoonpaySellCheckout',
        reasonForFailure: reason || 'unknown',
        amountFrom: amountExpected || '',
        fromCoin: wallet.currencyAbbreviation || '',
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
    init();

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
    <SellCheckoutContainer>
      <ScrollView ref={scrollViewRef}>
        <RowDataContainer>
          <H5>{t('SUMMARY')}</H5>
        </RowDataContainer>
        <ItemDivisor />
        <RowDataContainer>
          <RowLabel>{t('Selling From')}</RowLabel>
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
          {/* <SelectedOptionContainer> */}
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
              // copyText(toAddress) // TODO: add copy function ?
            }}
          />
        </RowDataContainer>
        <ItemDivisor />
        {isLoading ? (
          <MoonpaySellCheckoutSkeleton />
        ) : (
          <>
            <RowDataContainer>
              <RowLabel>{t('Paying')}</RowLabel>
              {amountExpected ? (
                <RowData>
                  {Number(amountExpected.toFixed(6))}{' '}
                  {wallet.currencyAbbreviation.toUpperCase()}
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
                      wallet.chain, // use chain for miner fee
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
                    {Number(totalExchangeFee).toFixed(6)}{' '}
                    {/* // TODO: review if using fiatCurrency from moonpayTxDetails is better */}
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
                  {remainingTimeStr}
                </RowData>
              )}
            </RowDataContainer>
            <ItemDivisor />
            {txData ? (
              <RowDataContainer style={{marginTop: 25, marginBottom: 5}}>
                <H7>{t('TOTAL TO RECEIVE')}</H7>
                {!!txData.quoteCurrencyAmount && (
                  <H5>
                    {/* TODO: use formatFiatAmount() for quoteCurrencyAmount */}
                    {txData.quoteCurrencyAmount}{' '}
                    {txData.quoteCurrency?.code?.toUpperCase()}
                  </H5>
                )}
                {!txData.quoteCurrencyAmount && (
                  <H5>
                    {sellOrder.fiat_receiving_amount}{' '}
                    {sellOrder.fiat_currency?.toUpperCase()}
                  </H5>
                )}
              </RowDataContainer>
            ) : null}
            {!termsAccepted && showCheckTermsMsg ? (
              <RowDataContainer>
                <RowLabel style={{color: Caution}}>
                  {t('Tap the checkbox to accept and continue.')}
                </RowLabel>
              </RowDataContainer>
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
              <CheckboxText>
                {t(
                  'Sell Crypto services provided by Moonpay. By clicking “Accept”, I acknowledge and understand that my transaction may trigger AML/KYC verification according to Moonpay AML/KYC',
                )}
              </CheckboxText>
            </CheckBoxContainer>
            <PoliciesContainer
              onPress={() => {
                setMoonpaySellPoliciesModalVisible(true);
              }}>
              <PoliciesText>{t('Review Moonpay policies')}</PoliciesText>
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
            onSwipeComplete={async () => {
              try {
                logger.debug('Swipe completed. Making payment...');
                makePayment();
              } catch (err) {}
            }}
            forceReset={resetSwipeButton}
          />
        </TouchableOpacity>
      ) : null}

      <MoonpaySellPoliciesModal
        isVisible={moonpaySellPoliciesModalVisible}
        onDismiss={() => {
          setMoonpaySellPoliciesModalVisible(false);
        }}
      />

      <PaymentSent
        isVisible={showPaymentSentModal}
        onCloseModal={async () => {
          setShowPaymentSentModal(false);
          await sleep(600);

          const moonpaySettingsParams: MoonpaySettingsProps = {
            incomingPaymentRequest: {
              externalId: sellCrpytoExternalId,
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
        }}
      />
    </SellCheckoutContainer>
  );
};

export default MoonpaySellCheckout;
