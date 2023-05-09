import React, {useState, useEffect, useCallback} from 'react';
import {useNavigation, useRoute, CommonActions} from '@react-navigation/native';
import {RouteProp, StackActions} from '@react-navigation/core';
import {WalletStackParamList} from '../../../WalletStack';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {
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
import PaymentSent from '../../../components/PaymentSent';
import {formatFiatAmount, sleep} from '../../../../../utils/helper-methods';
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
  DetailsListNoScroll,
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
  HeaderTitle,
  InfoDescription,
  InfoHeader,
  InfoTitle,
  Link,
} from '../../../../../components/styled/Text';
import styled from 'styled-components/native';
import ToggleSwitch from '../../../../../components/toggle-switch/ToggleSwitch';
import {useTranslation} from 'react-i18next';
import {
  ActiveOpacity,
  Hr,
  Info,
  InfoImageContainer,
  InfoTriangle,
  ScreenGutter,
} from '../../../../../components/styled/Containers';
import {Platform, TouchableOpacity} from 'react-native';
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
} from '../../../../../store/wallet/utils/currency';
import prompt from 'react-native-prompt-android';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import SendingToERC20Warning from '../../../components/SendingToERC20Warning';
import {HIGH_FEE_LIMIT} from '../../../../../constants/wallet';
import WarningSvg from '../../../../../../assets/img/warning.svg';

const VerticalPadding = styled.View`
  padding: ${ScreenGutter} 0;
`;
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
  selectInputs?: boolean;
  message?: string | undefined;
}

export const Setting = styled.TouchableOpacity`
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
  const route = useRoute<RouteProp<WalletStackParamList, 'Confirm'>>();
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
    selectInputs,
    message,
  } = route.params;
  const [txp, setTxp] = useState(_txp);
  const allKeys = useAppSelector(({WALLET}) => WALLET.keys);
  const enableReplaceByFee = useAppSelector(
    ({WALLET}) => WALLET.enableReplaceByFee,
  );
  const customizeNonce = useAppSelector(({WALLET}) => WALLET.customizeNonce);
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const {isoCode} = useAppSelector(({APP}) => APP.defaultAltCurrency);

  const key = allKeys[wallet?.keyId!];
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [showTransactionLevel, setShowTransactionLevel] = useState(false);
  const [enableRBF, setEnableRBF] = useState(enableReplaceByFee);
  const [showSendingERC20Modal, setShowSendingERC20Modal] = useState(true);
  const [showHighFeeWarningMessage, setShowHighFeeWarningMessage] =
    useState(false);

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
  const {currencyAbbreviation, chain} = wallet;
  const feeOptions = GetFeeOptions(chain);
  const {unitToSatoshi} =
    dispatch(GetPrecision(currencyAbbreviation, chain)) || {};
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>
          {t('Confirm ', {title: speedup ? t('Speed Up') : t('Payment')})}
        </HeaderTitle>
      ),
    });
  }, [navigation, speedup, t]);

  const isTxLevelAvailable = () => {
    const includedCurrencies = ['btc', 'eth', 'matic'];
    // TODO: exclude paypro, coinbase, usingMerchantFee txs,
    // const {payProUrl} = txDetails;
    return includedCurrencies.includes(currencyAbbreviation.toLowerCase());
  };

  const onCloseTxLevelModal = async (
    newLevel?: any,
    customFeePerKB?: number,
  ) => {
    setShowTransactionLevel(false);
    if (newLevel) {
      updateTxProposal({
        feeLevel: newLevel,
        feePerKb: customFeePerKB,
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

  const onChangeEnableReplaceByFee = async (enableRBF?: boolean) => {
    updateTxProposal({
      enableRBF,
    });
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
          actions: [
            {
              text: t('OK'),
              action: () => {},
            },
          ],
        }),
      );
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
    const {feeUnitAmount} = dispatch(GetFeeUnits(currencyAbbreviation, chain));
    let feePerKb: number;
    if (txp.feePerKb) {
      feePerKb = txp.feePerKb;
    } else {
      feePerKb = await getFeeRatePerKb({wallet, feeLevel: fee.feeLevel});
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
        recipientAmountStr: `${r.amount} ${currencyAbbreviation.toUpperCase()}`,
        recipientAltAmountStr: formatFiatAmount(
          dispatch(
            toFiat(amountSat, isoCode, currencyAbbreviation, chain, rates),
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
    };
  } else {
    recipientData = sendingTo;
  }

  return (
    <ConfirmContainer>
      <ConfirmScrollView
        extraScrollHeight={50}
        contentContainerStyle={{paddingBottom: 50}}
        keyboardShouldPersistTaps={'handled'}>
        <DetailsListNoScroll keyboardShouldPersistTaps={'handled'}>
          <Header>Summary</Header>
          <SendingTo
            recipient={recipientData}
            recipientList={recipientListData}
            hr
          />
          <Fee
            onPress={
              isTxLevelAvailable() && !selectInputs
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
          {enableReplaceByFee &&
          !selectInputs &&
          currencyAbbreviation.toLowerCase() === 'btc' ? (
            <>
              <Setting activeOpacity={1}>
                <SettingTitle>{t('Enable Replace-By-Fee')}</SettingTitle>
                <ToggleSwitch
                  onChange={value => {
                    setEnableRBF(value);
                    onChangeEnableReplaceByFee(value);
                  }}
                  isEnabled={enableRBF}
                />
              </Setting>
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
              value={gasLimit}
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
            <ExchangeRate description={t('Exchange Rate')} rateStr={rateStr} />
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
          {txp && currencyAbbreviation !== 'xrp' ? (
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
          />
          <Amount
            description={t('Total')}
            amount={total}
            height={83}
            chain={chain}
            network={wallet.credentials.network}
            showInfoIcon={!!subTotal}
            infoIconOnPress={() => {
              dispatch(showConfirmAmountInfoSheet('total'));
            }}
          />
        </DetailsListNoScroll>

        <PaymentSent
          isVisible={showPaymentSentModal}
          title={
            wallet.credentials.n > 1 ? t('Proposal created') : t('Payment Sent')
          }
          onCloseModal={async () => {
            setShowPaymentSentModal(false);
            if (recipient.type === 'coinbase') {
              navigation.dispatch(
                CommonActions.reset({
                  index: 2,
                  routes: [
                    {
                      name: 'Tabs',
                      params: {screen: 'Home'},
                    },
                    {
                      name: 'Coinbase',
                      params: {
                        screen: 'CoinbaseRoot',
                      },
                    },
                  ],
                }),
              );
            } else {
              navigation.dispatch(StackActions.popToTop());
              navigation.dispatch(
                StackActions.replace('WalletDetails', {
                  walletId: wallet!.id,
                  key,
                }),
              );
              await sleep(0);
              setShowPaymentSentModal(false);
            }
          }}
        />
        {isTxLevelAvailable() ? (
          <TransactionLevel
            feeLevel={fee.feeLevel}
            wallet={wallet}
            isVisible={showTransactionLevel}
            onCloseModal={(selectedLevel, customFeePerKB) =>
              onCloseTxLevelModal(selectedLevel, customFeePerKB)
            }
            customFeePerKB={
              fee.feeLevel === 'custom' ? txp?.feePerKb : undefined
            }
            feePerSatByte={
              fee.feeLevel === 'custom' && txp?.feePerKb
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
        onSwipeComplete={async () => {
          try {
            dispatch(startOnGoingProcessModal('SENDING_PAYMENT'));
            await sleep(500);
            await dispatch(startSendPayment({txp, key, wallet, recipient}));
            dispatch(dismissOnGoingProcessModal());
            dispatch(
              Analytics.track('Sent Crypto', {
                context: 'Confirm',
                coin: currencyAbbreviation || '',
              }),
            );
            await sleep(500);
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
                await showErrorMessage(
                  CustomErrorMessage({
                    errMsg: BWCErrorMessage(err),
                    title: t('Uh oh, something went wrong'),
                  }),
                );
            }
          }
        }}
      />
    </ConfirmContainer>
  );
};

export default Confirm;
