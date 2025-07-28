import {
  BaseText,
  H7,
  H6,
  HeaderTitle,
  H2,
  H4,
} from '../../../components/styled/Text';
import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import {useAppDispatch, useLogger, useAppSelector} from '../../../utils/hooks';
import {
  buildTransactionDetails,
  getDetailsTitle,
  IsMultisigEthInfo,
  IsReceived,
  TxForPaymentFeeEVM,
  TxActions,
  RemoveTxProposal,
  RejectTxProposal,
} from '../../../store/wallet/effects/transactions/transactions';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
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
import {
  getBadgeImg,
  getCurrencyAbbreviation,
  sleep,
} from '../../../utils/helper-methods';
import {GetAmFormatDate, GetAmTimeAgo} from '../../../store/wallet/utils/time';
import SendToPill from '../components/SendToPill';
import {SUPPORTED_CURRENCIES} from '../../../constants/currencies';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import DefaultSvg from '../../../../assets/img/currencies/default.svg';
import SecureLockIcon from '../../../../assets/img/secure-lock.svg';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import SwipeButton from '../../../components/swipe-button/SwipeButton';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {dismissOnGoingProcessModal} from '../../../store/app/app.actions';
import {
  broadcastTx,
  publishAndSign,
} from '../../../store/wallet/effects/send/send';
import {
  CustomErrorMessage,
  WrongPasswordError,
} from '../components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {
  startUpdateWalletStatus,
  waitForTargetAmountAndUpdateWallet,
} from '../../../store/wallet/effects/status/status';
import {useTranslation} from 'react-i18next';
import {findWalletById} from '../../../store/wallet/utils/wallet';
import {
  Key,
  TransactionProposal,
  Wallet,
} from '../../../store/wallet/wallet.models';
import {
  DetailColumn,
  DetailContainer,
  DetailRow,
  SendingTo,
  SendToPillContainer,
} from './send/confirm/Shared';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {LogActions} from '../../../store/log';
import {GetPayProDetails} from '../../../store/wallet/effects/paypro/paypro';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {AppActions} from '../../../store/app';

const TxpDetailsContainer = styled.SafeAreaView`
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

const TxDescriptionMsgContainer = styled.View`
  margin: 20px 0;
  justify-content: flex-start;
`;

const TxDescriptionMsgText = styled(BaseText)`
  font-size: 16px;
  color: #9b9bab;
  margin-top: 10px;
  justify-content: flex-start;
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

let countDown: NodeJS.Timeout | undefined;

const TransactionProposalDetails = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const navigation = useNavigation();
  const {
    params: {transactionId, walletId, keyId},
  } = useRoute<RouteProp<WalletGroupParamList, 'TransactionProposalDetails'>>();
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const key = useAppSelector(({WALLET}) => WALLET.keys[keyId]) as Key;
  const wallet = findWalletById(key.wallets, walletId) as Wallet;
  const transaction = wallet.pendingTxps.find(txp => txp.id === transactionId);
  const [txp, setTxp] = useState<any>();
  const [payProDetails, setPayProDetails] = useState<any>();
  const [paymentExpired, setPaymentExpired] = useState<boolean>(false);
  const [remainingTimeStr, setRemainingTimeStr] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [payproIsLoading, setPayproIsLoading] = useState(true);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  const [lastSigner, setLastSigner] = useState(false);
  const [isForFee, setIsForFee] = useState(false);

  const title = getDetailsTitle(transaction, wallet);
  let {currencyAbbreviation, chain, network, tokenAddress} = wallet;
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
      setTxp(_transaction);
      if (_transaction.actions) {
        setLastSigner(
          _transaction.actions.filter((a: any) => a?.type === 'accept')
            .length ===
            (_transaction.requiredSignatures as number) - 1,
        );
      }
      setIsForFee(
        _transaction.action !== 'received' &&
          TxForPaymentFeeEVM(
            wallet.currencyAbbreviation,
            transaction.coin,
            transaction.chain,
            transaction.amount,
          ),
      );
      await sleep(500);
      setIsLoading(false);
    } catch (err) {
      await sleep(500);
      setIsLoading(false);
      const e = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(LogActions.error('[TransactionProposalDetails] ', e));
    }
  };

  const checkPayPro = async () => {
    try {
      setPayproIsLoading(true);
      await sleep(400);
      dispatch(startOnGoingProcessModal('FETCHING_PAYMENT_INFO'));
      const address = (await dispatch<Promise<string>>(
        createWalletAddress({wallet: wallet, newAddress: false}),
      )) as string;
      const payload = {
        address,
      };
      const _payProDetails = await dispatch(
        GetPayProDetails({
          paymentUrl: txp.payProUrl,
          coin: txp.coin,
          chain: txp.chain,
          payload,
        }),
      );
      paymentTimeControl(_payProDetails.expires);
      setPayProDetails(_payProDetails);
      await sleep(500);
      setPayproIsLoading(false);
      dispatch(dismissOnGoingProcessModal());
    } catch (err) {
      setPayproIsLoading(false);
      await sleep(1000);
      dispatch(dismissOnGoingProcessModal());
      logger.warn('Error fetching this invoice: ' + BWCErrorMessage(err));
      await sleep(600);
      await dispatch(
        showBottomNotificationModal(
          CustomErrorMessage({
            errMsg: BWCErrorMessage(err),
            title: t('Error fetching this invoice'),
          }),
        ),
      );
    }
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
    countDown?: NodeJS.Timeout,
  ): void => {
    const now = Math.floor(Date.now() / 1000);

    if (now > expirationTime) {
      setPaymentExpired(true);
      setRemainingTimeStr(t('Expired'));
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

  const getIcon = () => {
    const _currencyAbbreviation = getCurrencyAbbreviation(
      wallet.currencyAbbreviation,
      wallet.chain,
    );

    return CurrencyListIcons[_currencyAbbreviation] ? (
      CurrencyListIcons[_currencyAbbreviation]({width: 18, height: 18})
    ) : (
      <DefaultSvg width={18} height={18} />
    );
  };

  const broadcastTxp = async (txp: TransactionProposal) => {
    dispatch(startOnGoingProcessModal('BROADCASTING_TXP'));

    try {
      logger.debug('Trying to broadcast Txp');
      const broadcastedTx = await broadcastTx(wallet, txp);
      logger.debug(`Transaction broadcasted: ${broadcastedTx.txid}`);
      const {fee, amount} = broadcastedTx as {
        fee: number;
        amount: number;
      };
      const targetAmount = wallet.balance.sat - (fee + amount);

      dispatch(
        waitForTargetAmountAndUpdateWallet({
          key,
          wallet,
          targetAmount,
        }),
      );
      await sleep(1000);
      dispatch(dismissOnGoingProcessModal());
      dispatch(
        AppActions.showPaymentSentModal({
          isVisible: true,
          onCloseModal,
          title: lastSigner ? t('Payment Sent') : t('Payment Accepted'),
        }),
      );
      await sleep(1000);
      navigation.goBack();
    } catch (err: any) {
      logger.error(
        `Could not broadcast Txp. Coin: ${txp.coin} - Chain: ${txp.chain} - Network: ${wallet.network} - Raw: ${txp.raw}`,
      );
      let msg: string = t('Could not broadcast payment');
      if (typeof err?.message === 'string') {
        msg = msg + `: ${err.message}`;
      }
      await sleep(1000);
      dispatch(dismissOnGoingProcessModal());
      await sleep(600);
      await dispatch(
        showBottomNotificationModal(
          CustomErrorMessage({
            errMsg: msg,
            title: t('Error'),
          }),
        ),
      );
    }
  };

  const removePaymentProposal = async () => {
    try {
      dispatch(
        showBottomNotificationModal({
          type: 'warning',
          title: t('Warning!'),
          message: t('Are you sure you want to delete this transaction?'),
          enableBackdropDismiss: true,
          actions: [
            {
              text: t('DELETE'),
              action: async () => {
                await RemoveTxProposal(wallet, txp);
                dispatch(startUpdateWalletStatus({key, wallet, force: true}));
                navigation.goBack();
              },
              primary: true,
            },
            {
              text: t('CANCEL'),
              action: () => {},
            },
          ],
        }),
      );
    } catch (err) {
      const e = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(LogActions.error('[removePaymentProposal] ', e));
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
              text: t('REJECT'),
              action: async () => {
                await RejectTxProposal(wallet, txp);
                dispatch(startUpdateWalletStatus({key, wallet, force: true}));
                navigation.goBack();
              },
              primary: true,
            },
            {
              text: t('CANCEL'),
              action: () => {},
            },
          ],
        }),
      );
    } catch (err) {
      const e = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(LogActions.error('[rejectPaymentProposal] ', e));
    }
  };

  const onSwipeComplete = async () => {
    try {
      dispatch(
        startOnGoingProcessModal(
          lastSigner ? 'SENDING_PAYMENT' : 'ACCEPTING_PAYMENT',
        ),
      );
      await sleep(400);
      await dispatch(publishAndSign({txp, key, wallet}));
      await sleep(400);
      dispatch(dismissOnGoingProcessModal());
      dispatch(
        Analytics.track('Sent Crypto', {
          context: 'Transaction Proposal Details',
          coin: currencyAbbreviation || '',
        }),
      );
      dispatch(
        AppActions.showPaymentSentModal({
          isVisible: true,
          onCloseModal,
          title: lastSigner ? t('Payment Sent') : t('Payment Accepted'),
        }),
      );
      await sleep(1000);
      navigation.goBack();
    } catch (err) {
      await sleep(500);
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
          await showErrorMessage(
            CustomErrorMessage({
              errMsg: BWCErrorMessage(err),
              title: t('Uh oh, something went wrong'),
            }),
          );
      }
    }
  };

  const onCloseModal = async () => {
    await sleep(1000);
    dispatch(AppActions.dismissPaymentSentModal());
    await sleep(1000);
    dispatch(AppActions.clearPaymentSentModalOptions());
  };

  useEffect(() => {
    init();
  }, [transaction, wallet]);

  useEffect(() => {
    if (txp?.payProUrl) {
      checkPayPro();
    }
  }, [txp]);

  useEffect(() => {
    if (!resetSwipeButton) {
      return;
    }
    const timer = setTimeout(() => {
      setResetSwipeButton(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [resetSwipeButton]);

  useEffect(() => {
    return () => {
      if (countDown) {
        clearInterval(countDown);
      }
    };
  }, []);

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  return (
    <TxpDetailsContainer>
      {isLoading ? (
        <TransactionDetailSkeleton />
      ) : txp ? (
        <ScrollView>
          <>
            {!isForFee ? <H2 medium={true}>{txp.amountStr}</H2> : null}

            {!IsCustomERCToken(tokenAddress, chain) && !isForFee ? (
              <SubTitle>
                {!txp.fiatRateStr
                  ? '...'
                  : isTestnet
                  ? t('Test Only - No Value')
                  : txp.fiatRateStr}
              </SubTitle>
            ) : null}

            {isForFee ? <H4>{t('Interaction with contract')}</H4> : null}
          </>

          {txp.removed ? (
            <Banner
              type={'info'}
              height={60}
              description={t('The payment was removed by creator.')}
            />
          ) : null}

          {txp.status === 'broadcasted' ? (
            <Banner
              type={'success'}
              height={60}
              description={t('Payment was successfully sent.')}
            />
          ) : null}

          {txp.status === 'rejected' ? (
            <Banner
              type={'success'}
              height={60}
              description={t('Payment Rejected.')}
            />
          ) : null}

          {txp.status === 'accepted' &&
          (!txp.payProUrl ||
            (payProDetails && !payproIsLoading && !paymentExpired)) ? (
            <>
              <Banner
                type={'info'}
                height={60}
                description={t('Payment accepted, but not yet broadcasted.')}
              />
              <Button
                onPress={() => {
                  broadcastTxp(txp);
                }}
                buttonType={'link'}>
                {t('Broadcast Payment')}
              </Button>
            </>
          ) : null}

          {(!txp.removed && txp.canBeRemoved) ||
          (txp.status === 'accepted' && !txp.broadcastedOn) ? (
            <>
              {!txp.payProUrl && wallet.credentials.n > 1 ? (
                <Banner
                  height={110}
                  type={'info'}
                  description={t(
                    '* A payment proposal can be deleted if 1) you are the creator, and no other copayer has signed, or 2) 10 minutes have passed since the proposal was created.',
                  )}
                />
              ) : null}
              {txp.payProUrl &&
              !payproIsLoading &&
              (!payProDetails || paymentExpired) ? (
                <Banner
                  type={'warning'}
                  description={t(
                    'Your payment proposal expired or was rejected by the receiver. Please, delete it and try again.',
                  )}
                />
              ) : null}
              <Button
                style={{marginTop: 10}}
                onPress={removePaymentProposal}
                buttonType={'link'}
                buttonStyle={'danger'}>
                {t('Delete payment proposal')}
              </Button>
            </>
          ) : null}

          {!txp.removed &&
          txp.pendingForUs &&
          !paymentExpired &&
          !txp.multisigContractAddress &&
          wallet.credentials.n > 1 ? (
            <Button
              onPress={rejectPaymentProposal}
              buttonType={'link'}
              buttonStyle={'danger'}>
              {t('Reject Payment Proposal')}
            </Button>
          ) : null}

          <DetailContainer>
            <H6>{t('DETAILS')}</H6>
          </DetailContainer>
          <Hr />

          {txp.nonce ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>{t('Nonce')}</H7>

                  <H7>{txp.nonce}</H7>
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          {txp.feeStr && !IsReceived(txp.action) ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>{t('Miner fee')}</H7>
                  <DetailColumn>
                    <H6>{txp.feeStr}</H6>
                    {!isTestnet ? (
                      <H7>
                        {txp.feeFiatStr}{' '}
                        {txp.feeRateStr
                          ? '(' +
                            txp.feeRateStr +
                            ' ' +
                            t('of total amount') +
                            ')'
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

          {txp.payProUrl ? (
            <SendingTo
              recipient={{
                recipientName: txp.payProUrl
                  .replace('https://', '')
                  .split('/')[0],
                img: () => (
                  <SecureLockIcon
                    height={18}
                    width={18}
                    style={{marginTop: -2}}
                  />
                ),
              }}
              hr
            />
          ) : (
            <MultipleOutputsTx tx={txp} tokenAddress={wallet.tokenAddress} />
          )}

          <>
            <DetailContainer>
              <DetailRow>
                <H7>{t('Sending from')}</H7>
                <SendToPillContainer>
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
                    description={
                      wallet.walletName || wallet.credentials.walletName
                    }
                  />
                </SendToPillContainer>
              </DetailRow>
            </DetailContainer>
            <Hr />
          </>

          {txp.creatorName ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>{t('Created by')}</H7>

                  <H7>{txp.creatorName}</H7>
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          <DetailContainer>
            <DetailRow>
              <H7>{t('Date')}</H7>
              <H7>
                {GetAmFormatDate((txp.ts || txp.createdOn || txp.time) * 1000)}
              </H7>
            </DetailRow>
          </DetailContainer>

          <Hr />

          {txp.message &&
          (!payProDetails || payProDetails.memo !== txp.message) ? (
            <>
              <TxDescriptionMsgContainer>
                <H7>{t('Tx Description')}</H7>
                <TxDescriptionMsgText>{txp.message}</TxDescriptionMsgText>
              </TxDescriptionMsgContainer>
              <Hr />
            </>
          ) : null}

          {/*  TODO: Add Notify unconfirmed transaction  row */}

          {payProDetails ? (
            <>
              <DetailContainer>
                <H6>{t('Payment request')}</H6>
              </DetailContainer>
              <Hr />
              {paymentExpired ? (
                <DetailContainer>
                  <DetailRow>
                    <H7>{t('Expired')}</H7>
                    <H7>
                      {GetAmTimeAgo(new Date(payProDetails.expires).getTime())}
                    </H7>
                  </DetailRow>
                </DetailContainer>
              ) : (
                <DetailContainer>
                  <DetailRow>
                    <H7>{t('Expires')}</H7>
                    <H7>{remainingTimeStr}</H7>
                  </DetailRow>
                </DetailContainer>
              )}

              {payProDetails.memo ? (
                <>
                  <Hr />
                  <TxDescriptionMsgContainer>
                    <H7>{t('Merchant Message')}</H7>
                    <TxDescriptionMsgText>
                      {payProDetails.memo}
                    </TxDescriptionMsgText>
                  </TxDescriptionMsgContainer>
                </>
              ) : null}
              <Hr />
            </>
          ) : null}

          {!IsMultisigEthInfo(wallet) && txp.actionsList?.length ? (
            <>
              <TimelineContainer>
                <DetailContainer>
                  <H6>{t('Timeline')}</H6>
                </DetailContainer>

                <TimelineList actions={txp.actionsList} />
              </TimelineContainer>

              <Hr />
            </>
          ) : null}
        </ScrollView>
      ) : null}

      {txp &&
      !txp.removed &&
      txp.pendingForUs &&
      !key.isReadOnly &&
      (!txp.payProUrl ||
        (payProDetails && !payproIsLoading && !paymentExpired)) ? (
        <SwipeButton
          title={lastSigner ? t('Slide to send') : t('Slide to accept')}
          forceReset={resetSwipeButton}
          onSwipeComplete={onSwipeComplete}
        />
      ) : null}
    </TxpDetailsContainer>
  );
};

export default TransactionProposalDetails;
