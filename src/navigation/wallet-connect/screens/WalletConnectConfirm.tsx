import React, {useCallback, useLayoutEffect, useState, useEffect} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import styled from 'styled-components/native';
import {RouteProp} from '@react-navigation/core';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  Recipient,
  TransactionProposal,
  TxDetails,
  Wallet,
} from '../../../store/wallet/wallet.models';
import SwipeButton from '../../../components/swipe-button/SwipeButton';
import {sleep} from '../../../utils/helper-methods';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {WalletConnectStackParamList} from '../WalletConnectStack';
import PaymentSent from '../../wallet/components/PaymentSent';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  CustomErrorMessage,
  WrongPasswordError,
} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {
  Amount,
  ConfirmContainer,
  DetailsList,
  ExchangeRate,
  Fee,
  Header,
  SendingFrom,
  SendingTo,
  SharedDetailRow,
} from '../../wallet/screens/send/confirm/Shared';
import {GetFeeOptions} from '../../../store/wallet/effects/fee/fee';
import {Trans, useTranslation} from 'react-i18next';
import Banner from '../../../components/banner/Banner';
import {BaseText} from '../../../components/styled/Text';
import {Hr} from '../../../components/styled/Containers';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {
  walletConnectV2ApproveCallRequest,
  walletConnectV2RejectCallRequest,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {
  walletConnectApproveCallRequest,
  walletConnectRejectCallRequest,
} from '../../../store/wallet-connect/wallet-connect.effects';
import {startSendPayment} from '../../../store/wallet/effects/send/send';

const HeaderRightContainer = styled.View`
  margin-right: 15px;
`;

export interface WalletConnectConfirmParamList {
  wallet: Wallet;
  recipient: Recipient;
  txp: Partial<TransactionProposal>;
  txDetails: TxDetails;
  request: any;
  amount: number;
  data: string;
  peerName?: string;
  version: number;
  peerId?: string;
}

const WalletConnectConfirm = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<WalletConnectStackParamList, 'WalletConnectConfirm'>>();
  const {
    wallet,
    txp,
    txDetails,
    request,
    peerName,
    version,
    peerId,
    recipient,
  } = route.params;
  const key = useAppSelector(({WALLET}) => WALLET.keys[wallet.keyId]);
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);

  const {
    fee,
    sendingTo,
    sendingFrom,
    subTotal,
    gasLimit,
    gasPrice,
    nonce,
    total,
    rateStr,
  } = txDetails;

  const feeOptions = GetFeeOptions(wallet.chain);

  const approveCallRequest = async () => {
    try {
      dispatch(startOnGoingProcessModal('SENDING_PAYMENT'));
      if (version === 1) {
        const broadcastedTx = (await dispatch<any>(
          startSendPayment({txp, key, wallet, recipient}),
        )) as any;

        const response = {
          id: request.payload.id,
          result: broadcastedTx.txid,
        };
        await dispatch(walletConnectApproveCallRequest(peerId!, response));
      } else {
        await dispatch(walletConnectV2ApproveCallRequest(request, wallet));
      }
      dispatch(dismissOnGoingProcessModal());
      await sleep(1000);
      dispatch(
        Analytics.track('Sent Crypto', {
          context: 'WalletConnect Confirm',
          coin: wallet?.currencyAbbreviation || '',
        }),
      );
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
  };

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const rejectCallRequest = useCallback(async () => {
    haptic('impactLight');
    try {
      dispatch(startOnGoingProcessModal('REJECTING_CALL_REQUEST'));
      if (version === 1) {
        const response = {
          id: request.payload.id,
          error: {message: t('User rejected call request')},
        };
        (await dispatch<any>(
          walletConnectRejectCallRequest(peerId!, response),
        )) as any;
      } else {
        await dispatch(walletConnectV2RejectCallRequest(request));
      }
      dispatch(dismissOnGoingProcessModal());
      await sleep(1000);
      navigation.goBack();
    } catch (err) {
      await showErrorMessage(
        CustomErrorMessage({
          errMsg: BWCErrorMessage(err),
          title: t('Uh oh, something went wrong'),
        }),
      );
    }
  }, [dispatch, navigation, request, showErrorMessage, t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderRightContainer>
          <Button onPress={rejectCallRequest} buttonType="pill">
            {t('Reject')}
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation, rejectCallRequest, t]);

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
    <ConfirmContainer>
      <DetailsList>
        <Header>Summary</Header>
        <Banner
          type={'warning'}
          description={''}
          transComponent={
            <Trans
              i18nKey="WalletConnectBannerConfirm"
              values={{peerName}}
              components={[<BaseText style={{fontWeight: 'bold'}} />]}
            />
          }
        />
        <Hr />
        <SendingTo recipient={sendingTo} hr />
        <Fee fee={fee} feeOptions={feeOptions} hideFeeOptions={true} hr />
        {gasPrice !== undefined ? (
          <SharedDetailRow
            description={t('Gas price')}
            value={gasPrice.toFixed(2) + ' Gwei'}
            hr
          />
        ) : null}
        {gasLimit !== undefined ? (
          <SharedDetailRow description={t('Gas limit')} value={gasLimit} hr />
        ) : null}
        {nonce !== undefined && nonce !== null ? (
          <SharedDetailRow description={'Nonce'} value={nonce} hr />
        ) : null}
        <SendingFrom sender={sendingFrom} hr />
        {rateStr ? (
          <ExchangeRate description={t('Exchange Rate')} rateStr={rateStr} />
        ) : null}
        <Amount description={t('SubTotal')} amount={subTotal} />
        <Amount description={t('Total')} amount={total} />
      </DetailsList>
      <SwipeButton
        title={t('Slide to approve')}
        onSwipeComplete={approveCallRequest}
        forceReset={resetSwipeButton}
      />

      <PaymentSent
        isVisible={showPaymentSentModal}
        onCloseModal={() => {
          setShowPaymentSentModal(false);
          navigation.goBack();
        }}
      />
    </ConfirmContainer>
  );
};

export default WalletConnectConfirm;
