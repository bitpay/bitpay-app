import React, {useEffect, useState} from 'react';
import {
  useTheme,
  RouteProp,
  useRoute,
  useNavigation,
  StackActions,
  CommonActions,
} from '@react-navigation/native';
import styled from 'styled-components/native';
import SwipeButton from '../../../../components/swipe-button/SwipeButton';
import {
  Wallet,
  TransactionProposal,
} from '../../../../store/wallet/wallet.models';
import {createWalletAddress} from '../../../../store/wallet/effects/address/address';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {
  changellyCreateFixTransaction,
  changellyGetFixRateForAmount,
} from '../utils/changelly-utils';
import {toFiat} from '../../../../store/wallet/utils/wallet';
import {
  GetPrecision,
  IsERCToken,
  GetChain,
  GetProtoAddress,
} from '../../../../store/wallet/utils/currency';
import {FormatAmountStr} from '../../../../store/wallet/effects/amount/amount';
import {BaseText, H5, H7} from '../../../../components/styled/Text';
import {
  Black,
  SlateDark,
  ProgressBlue,
  White,
  LightBlack,
  NeutralSlate,
  Slate,
  Caution,
} from '../../../../styles/colors';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import Checkbox from '../../../../components/checkbox/Checkbox';
import {TokenOpts} from '../../../../constants/tokens';
import {BwcProvider} from '../../../../lib/bwc';
import {BWCErrorMessage} from '../../../../constants/BWCError';
import SelectorArrowRight from '../../../../../assets/img/selector-arrow-right.svg';
import ChangellyPoliciesModal from '../components/ChangellyPoliciesModal';
import {startGetRates} from '../../../../store/wallet/effects';
import {sleep} from '../../../../utils/helper-methods';
import {startOnGoingProcessModal} from '../../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../../store/app/app.actions';
import {WrongPasswordError} from '../../../../navigation/wallet/components/ErrorMessages';
import {publishAndSign} from '../../../../store/wallet/effects/send/send';
import PaymentSent from '../../../../navigation/wallet/components/PaymentSent';
import cloneDeep from 'lodash.clonedeep';
import {changellyTxData} from '../../../../store/swap-crypto/swap-crypto.models';
import {SwapCryptoActions} from '../../../../store/swap-crypto';

export const ItemDivisor = styled.View`
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : '#ebecee')};
  border-bottom-width: 1px;
  /* margin-bottom: 18px; */
`;

// Styled
export const SwapCheckoutContainer = styled.SafeAreaView`
  flex: 1;
  margin: 14px;
`;

export const RowDataContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0;
`;

export const FiatAmountContainer = styled.View`
  /* display: flex; */
  flex-direction: row;
  /* align-items: center; */
  justify-content: flex-end;
  /* margin-bottom: 20px; */
`;

export const CryptoUnit = styled(BaseText)`
  font-size: 15px;
  padding-top: 7px;
  padding-left: 5px;
`;

export const RowLabel = styled(BaseText)`
  font-size: 14px;
`;

export const RowData = styled(BaseText)`
  font-size: 16px;
`;

export const FiatAmount = styled(BaseText)`
  font-size: 14px;
  color: #667;
`;

const SelectedOptionContainer = styled.TouchableOpacity`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  padding: 0px 14px;
  background: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 12px;
  opacity: ${({disabled}) => (disabled ? 0.2 : 1)};
`;

const SelectedOptionText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 16px;
  font-weight: 500;
`;

const SelectedOptionCol = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const CoinIconContainer = styled.View`
  width: 30px;
  height: 25px;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const CheckBoxContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 10px 20px 0 0;
`;

const CheckboxText = styled(BaseText)`
  color: #757575;
  font-size: 11px;
  font-weight: 300;
  margin-left: 20px;
`;

const PoliciesContainer = styled.TouchableOpacity`
  flex-direction: row;
  justify-content: space-between;
  margin: 20px 0;
`;

const PoliciesText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : ProgressBlue)};
`;

const ArrowContainer = styled.View`
  margin-left: 10px;
`;

export interface ChangellyCheckoutProps {
  fromWalletSelected: Wallet;
  toWalletSelected: Wallet;
  fromWalletData: any;
  toWalletData: any;
  fixedRateId: string;
  amountFrom: number;
  rate: number;
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
      rate,
      useSendMax,
      sendMaxInfo,
    },
  } = useRoute<RouteProp<{params: ChangellyCheckoutProps}>>();

  // const logger = useLogger();
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
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  // const [addressToPay, setAddressToPay] = useState<string>();
  const [txData, setTxData] = useState<any>();

  const alternativeIsoCode = 'USD';
  let addressFrom: string; // Refund address
  let addressTo: string; // Receiving address
  let payinExtraId: string;
  let status: string;
  let payinAddress: string;

  const createFixTransaction = async () => {
    dispatch(
      startOnGoingProcessModal(OnGoingProcessMessages.EXCHANGE_GETTING_DATA),
    );
    await sleep(400);
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
      addressFrom = GetProtoAddress(
        fromWalletSelected.currencyAbbreviation.toLowerCase(),
        fromWalletSelected.network,
        addressFrom,
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
          console.log(
            'Changelly createFixTransaction Error: ' + data.error.message,
          );

          if (
            Math.abs(data.error.code) == 32602 ||
            Math.abs(data.error.code) == 32603
          ) {
            console.log(
              'Changelly rateId was expired or already used. Generating a new one',
            );
            updateReceivingAmount();
          } else {
            console.log(data.error.message);
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
          console.log(
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

        // setAddressToPay(cloneDeep(payinAddress));

        payinExtraId = data.result.payinExtraId
          ? data.result.payinExtraId
          : undefined; // (destinationTag) Used for coins like: XRP, XLM, EOS, IGNIS, BNB, XMR, ARDOR, DCT, XEM
        setExchangeTxId(data.result.id);
        setAmountExpectedFrom(data.result.amountExpectedFrom);
        // amountTo = data.result.amountTo;
        setAmountTo(Number(data.result.amountTo));
        status = data.result.status;

        try {
          const rates = await dispatch(startGetRates());
          const newFiatAmountTo = toFiat(
            Number(amountTo) *
              GetPrecision(toWalletSelected.currencyAbbreviation)!
                .unitToSatoshi,
            alternativeIsoCode,
            toWalletSelected.currencyAbbreviation.toLowerCase(),
            rates,
          );
          setFiatAmountTo(newFiatAmountTo);
        } catch (err) {
          console.log('toFiat Error: ', err);
        }

        paymentTimeControl(data.result.payTill);

        // To Sat
        const depositSat = Number(
          (
            amountExpectedFrom *
            GetPrecision(fromWalletSelected.currencyAbbreviation)!.unitToSatoshi
          ).toFixed(0),
        );

        createTx(fromWalletSelected, payinAddress, depositSat, payinExtraId)
          .then(async ctxp => {
            console.log('========== CTXP: ', ctxp);
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
            console.log(err.message);
            dispatch(dismissOnGoingProcessModal());
            await sleep(400);
            return;
          });
      })
      .catch(async err => {
        console.log('Changelly createFixTransaction Error: ', err);
        console.log(
          'Changelly is not available at this moment. Please, try again later.',
        );
        dispatch(dismissOnGoingProcessModal());
        await sleep(400);
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

  const updateReceivingAmount = () => {
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
          console.log(msg);
          return;
        }
        fixedRateId = data.result[0].id;
        // amountTo = Number(data.result[0].amountTo);
        setAmountTo(Number(data.result[0].amountTo));
        rate = Number(data.result[0].result); // result == rate

        createFixTransaction();
      })
      .catch(err => {
        console.log(err);
        let msg =
          'Changelly is not available at this moment. Please, try again later.';
        console.log(msg);
      });
  };

  const createTx = (
    wallet: Wallet,
    payinAddress: string,
    depositSat: number,
    destTag?: string,
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
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

      if (IsERCToken(wallet.currencyAbbreviation.toLowerCase())) {
        let tokens = Object.values(TokenOpts);
        const token = tokens.find(
          token => token.symbol == wallet.currencyAbbreviation.toUpperCase(),
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
          wallet.currencyAbbreviation.toLowerCase() == 'btc' ||
          GetChain(wallet.currencyAbbreviation.toLowerCase()) == 'eth'
        ) {
          txp.feeLevel = 'priority';
        } // Avoid expired order due to slow TX confirmation
      }

      if (destTag) {
        txp.destinationTag = destTag;
      }

      createTxProposal(wallet, txp)
        .then(ctxp => {
          return resolve(ctxp);
        })
        .catch(err => {
          return reject({
            title: 'Could not create transaction',
            message: BWCErrorMessage(err),
          });
        });
    });
  };

  const createTxProposal = (
    wallet: Wallet,
    txp: Partial<TransactionProposal>,
  ): Promise<TransactionProposal> => {
    return new Promise((resolve, reject) => {
      wallet.createTxProposal(
        txp,
        (err: any, createdTxp: any) => {
          if (err) {
            return reject(err);
          }
          console.log('Transaction created');
          return resolve(createdTxp);
        },
        null,
      );
    });
  };

  const makePayment = async () => {
    // onGoingProcessProvider.set('broadcastingTx');

    console.log('------- txData: ', txData);

    try {
      dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.SENDING_PAYMENT),
      );
      await sleep(400);

      const broadcastedTx = (await dispatch<any>(
        publishAndSign({txp: ctxp!, key, wallet: fromWalletSelected}),
      )) as any;
      console.log('====== broadcastedTx: ', broadcastedTx);
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
          console.log(err);
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

    console.log('Saved exchange with: ', newData);
  };

  useEffect(() => {
    createFixTransaction();
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
    <>
      <SwapCheckoutContainer>
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
          {!!amountExpectedFrom && (
            <RowData>
              {amountExpectedFrom}{' '}
              {fromWalletSelected.currencyAbbreviation.toUpperCase()}
            </RowData>
          )}
        </RowDataContainer>
        <ItemDivisor />
        <RowDataContainer>
          <RowLabel>Miner Fee</RowLabel>
          {fee && (
            <RowData>
              {FormatAmountStr(
                GetChain(fromWalletSelected.currencyAbbreviation).toLowerCase(),
                fee,
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
              {totalExchangeFee}{' '}
              {toWalletSelected.currencyAbbreviation.toUpperCase()}
            </RowData>
          )}
        </RowDataContainer>
        <ItemDivisor />
        <RowDataContainer>
          <RowLabel>Expires</RowLabel>
          {!!remainingTimeStr && (
            <RowData style={{color: paymentExpired ? Caution : Black}}>
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
      </SwapCheckoutContainer>

      {termsAccepted && !paymentExpired && !!exchangeTxId && (
        <SwipeButton
          title={'Slide to send'}
          onSwipeComplete={async () => {
            try {
              console.log('TODO: Swipe completed!');
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
    </>
  );
};

export default ChangellyCheckout;
