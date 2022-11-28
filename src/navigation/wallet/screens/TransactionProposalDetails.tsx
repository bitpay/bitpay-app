import {
  BaseText,
  H7,
  H6,
  HeaderTitle,
  H2,
  Link,
  TextAlign,
} from '../../../components/styled/Text';
import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  buildTransactionDetails,
  getDetailsTitle,
  IsMultisigEthInfo,
  IsReceived,
  NotZeroAmountEVM,
  TxActions,
  RemoveTxProposal,
  RejectTxProposal,
} from '../../../store/wallet/effects/transactions/transactions';
import styled from 'styled-components/native';
import {Hr, ScreenGutter} from '../../../components/styled/Containers';
import {IsCustomERCToken} from '../../../store/wallet/utils/currency';
import {TransactionIcons} from '../../../constants/TransactionIcons';
import Button from '../../../components/button/Button';
import MultipleOutputsTx from '../components/MultipleOutputsTx';
import {
  Black,
  Caution,
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../styles/colors';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import Banner from '../../../components/banner/Banner';
import Info from '../../../components/icons/info/Info';
import TransactionDetailSkeleton from '../components/TransactionDetailSkeleton';
import {sleep} from '../../../utils/helper-methods';
import {GetAmFormatDate, GetAmTimeAgo} from '../../../store/wallet/utils/time';
import SendToPill from '../components/SendToPill';
import {SUPPORTED_CURRENCIES} from '../../../constants/currencies';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import DefaultSvg from '../../../../assets/img/currencies/default.svg';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import SwipeButton from '../../../components/swipe-button/SwipeButton';
import {
  logSegmentEvent,
  startOnGoingProcessModal,
} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {dismissOnGoingProcessModal} from '../../../store/app/app.actions';
import {publishAndSign} from '../../../store/wallet/effects/send/send';
import PaymentSent from '../components/PaymentSent';
import {
  CustomErrorMessage,
  WrongPasswordError,
} from '../components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {startUpdateWalletStatus} from '../../../store/wallet/effects/status/status';
import {useTranslation} from 'react-i18next';
import {findWalletById} from '../../../store/wallet/utils/wallet';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {
  DetailColumn,
  DetailContainer,
  DetailRow,
  SendToPillContainer,
} from './send/confirm/Shared';

const TxsDetailsContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const SubTitle = styled(BaseText)`
  font-size: 14px;
  font-weight: 300;
`;

const TimelineContainer = styled.View`
  padding: 15px 0;
`;

const TimelineItem = styled.View`
  padding: 10px 0;
`;

const TimelineDescription = styled.View`
  margin: 0 10px;
`;

const TimelineBorderLeft = styled.View<{isFirst: boolean; isLast: boolean}>`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  position: absolute;
  top: ${({isFirst}) => (isFirst ? '45px' : 0)};
  bottom: ${({isLast}) => (isLast ? '15px' : 0)};
  left: 18px;
  width: 1px;
  z-index: -1;
`;
const TimelineTime = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const IconBackground = styled.View`
  height: 35px;
  width: 35px;
  border-radius: 50px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const NumberIcon = styled(IconBackground)`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
`;

const MemoMsgContainer = styled.View`
  justify-content: flex-end;
  max-width: 80%;
`;
const TimelineList = ({actions}: {actions: TxActions[]}) => {
  return (
    <>
      {actions.map(
        (
          {type, time, description, by}: TxActions,
          index: number,
          {length}: {length: number},
        ) => {
          return (
            <DetailRow key={index}>
              <TimelineBorderLeft
                isFirst={index === 0}
                isLast={index === length - 1}
              />
              <TimelineItem>
                <DetailRow>
                  {type === 'rejected' ? (
                    <IconBackground>
                      <Info size={35} bgColor={Caution} />
                    </IconBackground>
                  ) : null}

                  {type === 'broadcasted' ? (
                    <IconBackground>
                      {TransactionIcons.broadcast}
                    </IconBackground>
                  ) : null}

                  {type !== 'broadcasted' && type !== 'rejected' ? (
                    <NumberIcon>
                      <H7>{length - index}</H7>
                    </NumberIcon>
                  ) : null}

                  <TimelineDescription>
                    <H7>{description}</H7>
                    {by ? <H7>{by}</H7> : null}
                  </TimelineDescription>
                </DetailRow>
              </TimelineItem>

              <TimelineTime>{GetAmTimeAgo(time * 1000)}</TimelineTime>
            </DetailRow>
          );
        },
      )}
    </>
  );
};

const TransactionProposalDetails = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {
    params: {transactionId, walletId, keyId},
  } = useRoute<RouteProp<WalletStackParamList, 'TransactionProposalDetails'>>();
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const key = useAppSelector(({WALLET}) => WALLET.keys[keyId]) as Key;
  const wallet = findWalletById(key.wallets, walletId) as Wallet;
  const transaction = wallet.pendingTxps.find(txp => txp.id === transactionId);
  const [txs, setTxs] = useState<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [lastSigner, setLastSigner] = useState(false);

  const title = getDetailsTitle(transaction, wallet);
  let {currencyAbbreviation, chain, network} = wallet;
  currencyAbbreviation = currencyAbbreviation.toLowerCase();
  const isTestnet = network === 'testnet';

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>{title}</HeaderTitle>,
    });
  }, [navigation, title]);

  const init = async () => {
    try {
      if (!transaction) {
        navigation.goBack();
        return;
      }
      const _transaction = await dispatch(
        buildTransactionDetails({
          transaction,
          wallet,
          defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
        }),
      );
      setTxs(_transaction);
      setLastSigner(
        _transaction.actions.filter((a: any) => a?.type === 'accept').length ===
          _transaction.requiredSignatures - 1,
      );
      await sleep(500);
      setIsLoading(false);
    } catch (e) {
      await sleep(500);
      setIsLoading(false);
      console.log(e);
    }
  };

  useEffect(() => {
    init();
  }, [transaction, wallet]);

  const getIcon = () => {
    return SUPPORTED_CURRENCIES.includes(txs.coin) ? (
      CurrencyListIcons[txs.coin]({width: 18, height: 18})
    ) : (
      <DefaultSvg width={18} height={18} />
    );
  };

  const removePaymentProposal = async () => {
    try {
      dispatch(
        showBottomNotificationModal({
          type: 'warning',
          title: t('Warning!'),
          message: t('Are you sure you want to remove this transaction?'),
          enableBackdropDismiss: true,
          actions: [
            {
              text: t('YES'),
              action: async () => {
                await RemoveTxProposal(wallet, txs);
                dispatch(startUpdateWalletStatus({key, wallet, force: true}));
                navigation.goBack();
              },
              primary: true,
            },
            {
              text: t('CANCEL'),
              action: () => {},
              primary: true,
            },
          ],
        }),
      );
    } catch (e) {
      console.log(e);
    }
  };

  const rejectPaymentProposal = async () => {
    try {
      dispatch(
        showBottomNotificationModal({
          type: 'warning',
          title: t('Warning!'),
          message: t('Are you sure you want to reject this transaction?'),
          enableBackdropDismiss: true,
          actions: [
            {
              text: t('YES'),
              action: async () => {
                await RejectTxProposal(wallet, txs);
                dispatch(startUpdateWalletStatus({key, wallet, force: true}));
                navigation.goBack();
              },
              primary: true,
            },
            {
              text: t('CANCEL'),
              action: () => {},
              primary: true,
            },
          ],
        }),
      );
    } catch (e) {
      console.log(e);
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

  return (
    <TxsDetailsContainer>
      {isLoading ? (
        <TransactionDetailSkeleton />
      ) : txs ? (
        <ScrollView>
          <>
            {NotZeroAmountEVM(txs.amount, currencyAbbreviation) ? (
              <H2 medium={true}>{txs.amountStr}</H2>
            ) : null}

            {!IsCustomERCToken(currencyAbbreviation, chain) ? (
              <SubTitle>
                {!txs.fiatRateStr
                  ? '...'
                  : isTestnet
                  ? t('Test Only - No Value')
                  : txs.fiatRateStr}
              </SubTitle>
            ) : null}

            {!NotZeroAmountEVM(txs.amount, currencyAbbreviation) ? (
              <SubTitle>{t('Interaction with contract')}</SubTitle>
            ) : null}
          </>

          {(txs && !txs.removed && txs.canBeRemoved) ||
          (txs && txs.status == 'accepted' && !txs.broadcastedOn) ? (
            <>
              {!txs.payProUrl ? (
                <Banner
                  height={110}
                  type={'info'}
                  description={t(
                    '* A payment proposal can be deleted if 1) you are the creator, and no other copayer has signed, or 2) 10 minutes have passed since the proposal was created.',
                  )}
                />
              ) : (
                <Banner
                  type={'warning'}
                  description={t(
                    'Your payment proposal was rejected by the receiver. Please, delete it and try again.',
                  )}
                />
              )}
              <Button
                onPress={removePaymentProposal}
                buttonType={'link'}
                buttonStyle={'danger'}>
                <Link>{t('Delete payment proposal')}</Link>
              </Button>
            </>
          ) : null}

          {txs &&
          !txs.removed &&
          txs.pendingForUs &&
          !txs.multisigContractAddress &&
          wallet.credentials.n > 1 ? (
            <Button
              onPress={rejectPaymentProposal}
              buttonType={'link'}
              buttonStyle={'danger'}>
              <Link>{t('Reject Payment Proposal')}</Link>
            </Button>
          ) : null}

          <DetailContainer>
            <H6>{t('DETAILS')}</H6>
          </DetailContainer>
          <Hr />

          {txs.feeStr && !IsReceived(txs.action) ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>{t('Miner fee')}</H7>
                  <DetailColumn>
                    <H6>{txs.feeStr}</H6>
                    {!isTestnet ? (
                      <H7>
                        {txs.feeFiatStr}{' '}
                        {txs.feeRateStr
                          ? '(' + txs.feeRateStr + t(' of total amount') + ')'
                          : null}
                      </H7>
                    ) : (
                      <SubTitle>{t('Test Only - No Value')}</SubTitle>
                    )}
                  </DetailColumn>
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          <MultipleOutputsTx tx={txs} />

          <>
            <DetailContainer>
              <DetailRow>
                <H7>{t('Sending from')}</H7>
                <SendToPillContainer>
                  <SendToPill
                    icon={getIcon()}
                    description={wallet.credentials.walletName}
                  />
                </SendToPillContainer>
              </DetailRow>
            </DetailContainer>
            <Hr />
          </>

          {txs.creatorName ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>{t('Created by')}</H7>

                  <H7>{txs.creatorName}</H7>
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          <DetailContainer>
            <DetailRow>
              <H7>{t('Date')}</H7>
              <H7>
                {GetAmFormatDate((txs.ts || txs.createdOn || txs.time) * 1000)}
              </H7>
            </DetailRow>
          </DetailContainer>

          <Hr />

          {txs.message ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>{t('Memo')}</H7>
                  <MemoMsgContainer>
                    <TextAlign align={'right'}>
                      <H7>{txs.message}</H7>
                    </TextAlign>
                  </MemoMsgContainer>
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          {/*  TODO: Add Notify unconfirmed transaction  row */}

          {!IsMultisigEthInfo(wallet) && txs.actionsList?.length ? (
            <>
              <TimelineContainer>
                <H7>{t('Timeline')}</H7>

                <TimelineList actions={txs.actionsList} />
              </TimelineContainer>

              <Hr />
            </>
          ) : null}
        </ScrollView>
      ) : null}

      {txs && !txs.removed && txs.pendingForUs && !key.isReadOnly ? (
        <SwipeButton
          title={lastSigner ? t('Slide to send') : t('Slide to accept')}
          forceReset={resetSwipeButton}
          onSwipeComplete={async () => {
            try {
              dispatch(
                startOnGoingProcessModal(
                  lastSigner
                    ? t(OnGoingProcessMessages.SENDING_PAYMENT)
                    : t(OnGoingProcessMessages.ACCEPTING_PAYMENT),
                ),
              );
              await sleep(400);
              await dispatch(publishAndSign({txp: txs, key, wallet}));
              dispatch(dismissOnGoingProcessModal());
              dispatch(
                logSegmentEvent('track', 'Sent Crypto', {
                  context: 'Transaction Proposal Details',
                  coin: currencyAbbreviation || '',
                }),
              );
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
      ) : null}

      <PaymentSent
        isVisible={showPaymentSentModal}
        title={lastSigner ? t('Payment Sent') : t('Payment Accepted')}
        onCloseModal={async () => {
          setShowPaymentSentModal(false);
          await sleep(300);
          navigation.goBack();
        }}
      />
    </TxsDetailsContainer>
  );
};

export default TransactionProposalDetails;
