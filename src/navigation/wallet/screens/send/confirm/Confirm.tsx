import React, {useState, useEffect, useCallback, useLayoutEffect} from 'react';
import {useNavigation, useRoute, CommonActions} from '@react-navigation/native';
import {RouteProp, StackActions} from '@react-navigation/core';
import {WalletStackParamList} from '../../../WalletStack';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {
  Recipient,
  TransactionProposal,
  TxDetails,
  Wallet,
} from '../../../../../store/wallet/wallet.models';
import SwipeButton from '../../../../../components/swipe-button/SwipeButton';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
  startSendPayment,
} from '../../../../../store/wallet/effects/send/send';
import PaymentSent from '../../../components/PaymentSent';
import {sleep} from '../../../../../utils/helper-methods';
import {
  logSegmentEvent,
  openUrlWithInAppBrowser,
  startOnGoingProcessModal,
} from '../../../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {
  Amount,
  ConfirmContainer,
  DetailsList,
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
import {BWCErrorMessage} from '../../../../../constants/BWCError';
import TransactionLevel from '../TransactionLevel';
import {
  BaseText,
  HeaderTitle,
  InfoDescription,
  Link,
} from '../../../../../components/styled/Text';
import styled from 'styled-components/native';
import ToggleSwitch from '../../../../../components/toggle-switch/ToggleSwitch';
import {useTranslation} from 'react-i18next';
import {
  ActiveOpacity,
  Hr,
  Info,
  InfoTriangle,
  ScreenGutter,
} from '../../../../../components/styled/Containers';
import {Alert, TouchableOpacity} from 'react-native';
import {GetFeeOptions} from '../../../../../store/wallet/effects/fee/fee';
import haptic from '../../../../../components/haptic-feedback/haptic';

const VerticalPadding = styled.View`
  padding: ${ScreenGutter} 0;
`;
export interface ConfirmParamList {
  wallet: Wallet;
  recipient: Recipient;
  txp: Partial<TransactionProposal>;
  txDetails: TxDetails;
  amount: number;
  speedup?: boolean;
  sendMax?: boolean;
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
    txDetails,
    txp: _txp,
    amount,
    speedup,
    sendMax,
  } = route.params;
  const [txp, setTxp] = useState(_txp);
  const allKeys = useAppSelector(({WALLET}) => WALLET.keys);
  const enableReplaceByFee = useAppSelector(
    ({WALLET}) => WALLET.enableReplaceByFee,
  );
  const customizeNonce = useAppSelector(({WALLET}) => WALLET.customizeNonce);

  const key = allKeys[wallet?.keyId!];
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [showTransactionLevel, setShowTransactionLevel] = useState(false);
  const [enableRBF, setEnableRBF] = useState(false);

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
  } = txDetails;

  const [fee, setFee] = useState(_fee);
  const [total, setTotal] = useState(_total);
  const [subTotal, setSubTotal] = useState(_subTotal);
  const [gasPrice, setGasPrice] = useState(_gasPrice);
  const [gasLimit, setGasLimit] = useState(_gasLimit);
  const [nonce, setNonce] = useState(_nonce);
  const [destinationTag, setDestinationTag] = useState(_destinationTag);
  const {currencyAbbreviation} = wallet;
  const feeOptions = dispatch(GetFeeOptions(currencyAbbreviation));
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>
          {t('Confirm ', {title: speedup ? t('Speed Up') : t('Payment')})}
        </HeaderTitle>
      ),
    });
  }, [navigation, speedup, t]);

  const isTxLevelAvailable = () => {
    const excludeCurrencies = ['bch', 'doge', 'ltc', 'xrp'];
    // TODO: exclude paypro, coinbase, usingMerchantFee txs,
    // const {payProUrl} = txDetails;
    return !excludeCurrencies.includes(currencyAbbreviation);
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
    Alert.prompt(
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
              destinationTag?: string;
            } = {};
            switch (type) {
              case 'nonce':
                opts.nonce = Number(value);
                break;
              case 'gasLimit':
                opts.gasLimit = Number(value);
                break;
              case 'destinationTag':
                opts.destinationTag = value;
                break;
              default:
                break;
            }
            updateTxProposal(opts);
          },
        },
      ],
      'plain-text',
      '',
      'number-pad',
    );
  };

  const onChangeEnableReplaceByFee = async (enableRBF?: boolean) => {
    updateTxProposal({
      enableRBF,
    });
  };

  const updateTxProposal = async (newOpts: any) => {
    try {
      dispatch(startOnGoingProcessModal(OnGoingProcessMessages.UPDATING_TXP));
      const {txDetails: _txDetails, txp: newTxp} = await dispatch(
        createProposalAndBuildTxDetails({
          wallet,
          recipient,
          amount,
          sendMax,
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

  let recipientData;

  if (
    recipient.type &&
    (recipient.type === 'coinbase' || recipient.type === 'contact')
  ) {
    recipientData = {
      recipientName: recipient.name,
      recipientAddress: sendingTo.recipientAddress,
      img: recipient.type,
    };
  } else {
    recipientData = sendingTo;
  }

  return (
    <ConfirmContainer>
      <DetailsList>
        <Header>Summary</Header>
        <SendingTo recipient={recipientData} hr />
        <Fee
          onPress={
            isTxLevelAvailable()
              ? () => setShowTransactionLevel(true)
              : undefined
          }
          fee={fee}
          feeOptions={feeOptions}
          hr
        />
        {enableReplaceByFee ? (
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
                      openUrlWithInAppBrowser('URL.HELP_DESTINATION_TAG'),
                    );
                  }}>
                  <Link>Learn More</Link>
                </TouchableOpacity>
              </VerticalPadding>
            </Info>
          </>
        ) : null}
        <Amount description={t('SubTotal')} amount={subTotal} />
        <Amount description={t('Total')} amount={total} />
      </DetailsList>

      <SwipeButton
        title={speedup ? t('Speed Up') : t('Slide to send')}
        forceReset={resetSwipeButton}
        onSwipeComplete={async () => {
          try {
            dispatch(
              startOnGoingProcessModal(OnGoingProcessMessages.SENDING_PAYMENT),
            );
            await sleep(400);
            await dispatch(startSendPayment({txp, key, wallet, recipient}));
            dispatch(dismissOnGoingProcessModal());
            dispatch(
              logSegmentEvent(
                'track',
                'Sent Crypto',
                {
                  context: 'Confirm',
                  coin: currencyAbbreviation || '',
                },
                true,
              ),
            );
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
                await showErrorMessage(
                  CustomErrorMessage({
                    errMsg: BWCErrorMessage(err),
                    title: t('Uh oh, something went wrong'),
                  }),
                );
                await sleep(500);
                setResetSwipeButton(true);
            }
          }
        }}
      />

      <PaymentSent
        isVisible={showPaymentSentModal}
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
          } else if (recipient.type === 'contact') {
            navigation.dispatch(StackActions.popToTop());
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

      <TransactionLevel
        feeLevel={fee.feeLevel}
        wallet={wallet}
        isVisible={showTransactionLevel}
        onCloseModal={(selectedLevel, customFeePerKB) =>
          onCloseTxLevelModal(selectedLevel, customFeePerKB)
        }
        customFeePerKB={fee.feeLevel === 'custom' ? txp?.feePerKb : undefined}
        feePerSatByte={
          fee.feeLevel === 'custom' && txp?.feePerKb
            ? txp?.feePerKb / 1000
            : undefined
        }
        isSpeedUpTx={speedup}
      />
    </ConfirmContainer>
  );
};

export default Confirm;
