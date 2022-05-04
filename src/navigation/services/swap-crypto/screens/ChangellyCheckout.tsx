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
import {TokenOpts} from '../../../../constants/tokens';
import {BWCErrorMessage} from '../../../../constants/BWCError';
import {Black, White, Slate, Caution} from '../../../../styles/colors';
import {BwcProvider} from '../../../../lib/bwc';
import PaymentSent from '../../../wallet/components/PaymentSent';
import {WrongPasswordError} from '../../../wallet/components/ErrorMessages';
import SwipeButton from '../../../../components/swipe-button/SwipeButton';
import {H5, H7} from '../../../../components/styled/Text';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import Checkbox from '../../../../components/checkbox/Checkbox';
import {OnGoingProcessMessages} from '../../../../components/modal/ongoing-process/OngoingProcess';
import {
  Wallet,
  TransactionProposal,
} from '../../../../store/wallet/wallet.models';
import {createWalletAddress} from '../../../../store/wallet/effects/address/address';
import {
  toFiat,
  GetProtocolPrefixAddress,
} from '../../../../store/wallet/utils/wallet';
import {
  GetPrecision,
  IsERCToken,
  GetChain,
} from '../../../../store/wallet/utils/currency';
import {FormatAmountStr} from '../../../../store/wallet/effects/amount/amount';
import {
  changellyCreateFixTransaction,
  changellyGetFixRateForAmount,
} from '../utils/changelly-utils';
import {sleep} from '../../../../utils/helper-methods';
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
import analytics from '@segment/analytics-react-native';

// Styled
export const SwapCheckoutContainer = styled.SafeAreaView`
  flex: 1;
  margin: 14px;
`;

export interface ChangellyCheckoutProps {
  fromWalletSelected: Wallet;
  toWalletSelected: Wallet;
  fromWalletData: any;
  toWalletData: any;
  fixedRateId: string;
  amountFrom: number;
  useSendMax?: boolean;
  sendMaxInfo?: any;
}

const ChangellyCheckout: React.FC = () => {
  let {
    params: {
      fromWalletSelected,
      toWalletSelected,
      fromWalletData,
      toWalletData,
      fixedRateId,
      amountFrom,
      useSendMax,
      sendMaxInfo,
    },
  } = useRoute<RouteProp<{params: ChangellyCheckoutProps}>>();

  const logger = useLogger();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const BWC = BwcProvider.getInstance();

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
    ({WALLET}) => WALLET.keys[fromWalletSelected.keyId],
  );
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
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
          fromWalletSelected.currencyAbbreviation.toLowerCase(),
          fromWalletSelected.network,
          addressFrom,
        ),
      );
    }

    const createFixTxData = {
      amountFrom: amountExpectedFrom,
      coinFrom: fromWalletSelected.currencyAbbreviation.toLowerCase(),
      coinTo: toWalletSelected.currencyAbbreviation.toLowerCase(),
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

          if (
            Math.abs(data.error.code) == 32602 ||
            Math.abs(data.error.code) == 32603
          ) {
            logger.debug(
              'Changelly rateId was expired or already used. Generating a new one',
            );
            if (tries < 2) {
              updateReceivingAmount(tries);
            } else {
              const msg =
                'Failed to create transaction for Changelly, please try again later.';
              showError(msg);
            }
          } else {
            showError(data.error.message);
          }
          return;
        }

        if (
          Number(data.result.changellyFee) > 0 ||
          Number(data.result.apiExtraFee > 0)
        ) {
          // changellyFee and apiExtraFee (Bitpay fee) are in percents
          const receivingPercentage =
            100 -
            Number(data.result.changellyFee) -
            Number(data.result.apiExtraFee);
          let exchangeFee =
            (Number(data.result.changellyFee) * data.result.amountTo) /
            receivingPercentage;
          let bitpayFee =
            (Number(data.result.apiExtraFee) * data.result.amountTo) /
            receivingPercentage;
          setTotalExchangeFee(exchangeFee + bitpayFee);
          logger.debug(
            `Changelly fee: ${exchangeFee} - BitPay fee: ${bitpayFee} - Total fee: ${
              exchangeFee + bitpayFee
            }`,
          );
        }

        // TODO: handle payin address for BCH
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
        setAmountExpectedFrom(data.result.amountExpectedFrom);
        setAmountTo(Number(data.result.amountTo));
        status = data.result.status;

        try {
          const rates = await dispatch(startGetRates());
          const presicion = dispatch(
            GetPrecision(toWalletSelected.currencyAbbreviation),
          );
          const newFiatAmountTo = dispatch(
            toFiat(
              Number(amountTo) * presicion!.unitToSatoshi,
              alternativeIsoCode,
              toWalletSelected.currencyAbbreviation.toLowerCase(),
              rates,
            ),
          );
          setFiatAmountTo(newFiatAmountTo);
        } catch (err) {
          logger.error('toFiat Error');
        }

        paymentTimeControl(data.result.payTill);

        const presicion = dispatch(
          GetPrecision(fromWalletSelected.currencyAbbreviation),
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

            dispatch(dismissOnGoingProcessModal());
            await sleep(400);

            if (useSendMax) {
              console.log('TODO: handle send max');
              // showWarningSheet();
            }
            return;
          })
          .catch(async err => {
            logger.error(err.message);
            const msg = 'Error creating transaction';
            showError(msg);
            return;
          });
      })
      .catch(async err => {
        logger.error(
          'Changelly createFixTransaction Error: ' + JSON.stringify(err),
        );
        const msg =
          'Changelly is not available at this moment. Please, try again later.';
        showError(msg);
        return;
      });
  };

  const paymentTimeControl = (expires: string): void => {
    const expirationTime = Math.floor(new Date(expires).getTime() / 1000);
    setPaymentExpired(false);
    setExpirationTime(expirationTime);

    const countDown = setInterval(() => {
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
      coinFrom: fromWalletSelected.currencyAbbreviation.toLowerCase(),
      coinTo: toWalletSelected.currencyAbbreviation.toLowerCase(),
    };
    changellyGetFixRateForAmount(fromWalletSelected, fixRateForAmountData)
      .then(data => {
        if (data.error) {
          const msg =
            'Changelly getFixRateForAmount Error: ' + data.error.message;
          showError(msg);
          return;
        }
        fixedRateId = data.result[0].id;
        setAmountTo(Number(data.result[0].amountTo));

        createFixTransaction(++tries);
      })
      .catch(err => {
        logger.error(JSON.stringify(err));
        let msg =
          'Changelly is not available at this moment. Please, try again later.';
        showError(msg);
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
        ' to ' +
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
        outputs,
        message: message,
        excludeUnconfirmedUtxos: true, // Do not use unconfirmed UTXOs
        customData: {
          changelly: payinAddress,
          service: 'changelly',
        },
      };

      if (dispatch(IsERCToken(wallet.currencyAbbreviation.toLowerCase()))) {
        let tokens = Object.values(TokenOpts);
        const token = tokens.find(
          token => token.symbol === wallet.currencyAbbreviation.toUpperCase(),
        );

        if (token && token.address) {
          txp.tokenAddress = token.address;
          if (txp.outputs) {
            for (const output of txp.outputs) {
              if (!output.data) {
                output.data = BWC.getCore()
                  .Transactions.get({chain: 'ERC20'})
                  .encodeData({
                    recipients: [
                      {address: output.toAddress, amount: output.amount},
                    ],
                    tokenAddress: token.address,
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
        if (
          wallet.currencyAbbreviation.toLowerCase() === 'btc' ||
          dispatch(GetChain(wallet.currencyAbbreviation.toLowerCase())) ===
            'eth'
        ) {
          txp.feeLevel = 'priority';
        } // Avoid expired order due to slow TX confirmation
      }

      if (destTag) {
        txp.destinationTag = destTag;
      }

      const ctxp = await createTxProposal(wallet, txp);
      return Promise.resolve(ctxp);
    } catch (err) {
      return Promise.reject({
        title: 'Could not create transaction',
        message: BWCErrorMessage(err),
      });
    }
  };

  const makePayment = async () => {
    try {
      dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.SENDING_PAYMENT),
      );
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
      switch (err) {
        case 'invalid password':
          dispatch(showBottomNotificationModal(WrongPasswordError()));
        case 'password canceled':
          setResetSwipeButton(true);
          break;
        default:
          logger.error(JSON.stringify(err));
        // TODO: handle this case
        // await showErrorMessage(
        //   CustomErrorMessage({
        //     errMsg: BWCErrorMessage(err),
        //     title: 'Uh oh, something went wrong',
        //   }),
        // );
      }
    }
  };

  const saveChangellyTx = () => {
    const newData: changellyTxData = {
      exchangeTxId: exchangeTxId!,
      date: Date.now(),
      amountTo: amountTo!,
      coinTo: toWalletSelected.currencyAbbreviation.toLowerCase(),
      addressTo: txData.addressTo,
      walletIdTo: toWalletSelected.id,
      amountFrom: amountFrom!,
      coinFrom: fromWalletSelected.currencyAbbreviation.toLowerCase(),
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

    analytics.track('BitPay App - Successful Crypto Swap', {
      fromWalletId: fromWalletSelected.id,
      toWalletId: toWalletSelected.id,
      fromCoin: fromWalletSelected.currencyAbbreviation,
      toCoin: toWalletSelected.currencyAbbreviation,
      amountFrom: amountFrom,
      exchange: 'changelly',
      appUser: user?.eid || '',
    });
  };

  const showError = async (msg?: string, title?: string, actions?: any) => {
    dispatch(dismissOnGoingProcessModal());
    await sleep(1000);
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title: title ? title : 'Error',
        message: msg ? msg : 'Unknown Error',
        enableBackdropDismiss: true,
        actions: actions
          ? actions
          : [
              {
                text: 'OK',
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
    dispatch(
      startOnGoingProcessModal(OnGoingProcessMessages.EXCHANGE_GETTING_DATA),
    );
    createFixTransaction(1);
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
          <H5>SUMMARY</H5>
        </RowDataContainer>
        <ItemDivisor />
        <RowDataContainer>
          <RowLabel>Selling</RowLabel>
          <SelectedOptionContainer>
            <SelectedOptionCol>
              {fromWalletData && (
                <CoinIconContainer>
                  <CurrencyImage img={fromWalletData.img} size={20} />
                </CoinIconContainer>
              )}
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
          <RowLabel>Receiving</RowLabel>
          <SelectedOptionContainer>
            <SelectedOptionCol>
              {toWalletData && (
                <CoinIconContainer>
                  <CurrencyImage img={toWalletData.img} size={20} />
                </CoinIconContainer>
              )}
              <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
                {toWalletSelected.walletName
                  ? toWalletSelected.walletName
                  : toWalletSelected.currencyName}
              </SelectedOptionText>
            </SelectedOptionCol>
          </SelectedOptionContainer>
        </RowDataContainer>
        <ItemDivisor />
        <RowDataContainer>
          <RowLabel>Paying</RowLabel>
          {!!amountFrom && (
            <RowData>
              {Number(amountFrom).toFixed(6)}{' '}
              {fromWalletSelected.currencyAbbreviation.toUpperCase()}
            </RowData>
          )}
        </RowDataContainer>
        <ItemDivisor />
        <RowDataContainer>
          <RowLabel>Miner Fee</RowLabel>
          {fee && (
            <RowData>
              {dispatch(
                FormatAmountStr(
                  dispatch(
                    GetChain(fromWalletSelected.currencyAbbreviation),
                  ).toLowerCase(),
                  fee,
                ),
              )}
            </RowData>
          )}
        </RowDataContainer>
        <ItemDivisor />
        <RowDataContainer>
          <RowLabel>Exchange Fee</RowLabel>
          {!!totalExchangeFee && (
            <RowData>
              {' '}
              {Number(totalExchangeFee).toFixed(6)}{' '}
              {toWalletSelected.currencyAbbreviation.toUpperCase()}
            </RowData>
          )}
        </RowDataContainer>
        <ItemDivisor />
        <RowDataContainer>
          <RowLabel>Expires</RowLabel>
          {!!remainingTimeStr && (
            <RowData
              style={{
                color: paymentExpired ? Caution : theme.dark ? White : Black,
              }}>
              {remainingTimeStr}
            </RowData>
          )}
        </RowDataContainer>
        <ItemDivisor />
        <RowDataContainer style={{marginTop: 25, marginBottom: 5}}>
          <H7>TOTAL TO RECEIVE</H7>
          {!!amountTo && (
            <H5>
              {amountTo} {toWalletSelected.currencyAbbreviation.toUpperCase()}
            </H5>
          )}
        </RowDataContainer>
        {!!fiatAmountTo && (
          <>
            <FiatAmountContainer>
              <FiatAmount>
                ~{fiatAmountTo} {alternativeIsoCode}
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
            Exchange services provided by Changelly. By clicking “Accept”, I
            acknowledge and understand that my transaction may trigger AML/KYC
            verification according to Changelly AML/KYC
          </CheckboxText>
        </CheckBoxContainer>
        <PoliciesContainer
          onPress={() => {
            setChangellyPoliciesModalVisible(true);
          }}>
          <PoliciesText>Review Changelly policies</PoliciesText>
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
