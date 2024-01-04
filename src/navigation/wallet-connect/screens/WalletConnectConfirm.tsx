import React, {useCallback, useLayoutEffect, useState, useEffect} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import styled from 'styled-components/native';
import {RouteProp} from '@react-navigation/core';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  Recipient,
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
import {WalletConnectGroupParamList} from '../WalletConnectGroup';
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
import {
  GetFeeOptions,
  getFeeRatePerKb,
} from '../../../store/wallet/effects/fee/fee';
import {Trans, useTranslation} from 'react-i18next';
import Banner from '../../../components/banner/Banner';
import {BaseText} from '../../../components/styled/Text';
import {Hr} from '../../../components/styled/Containers';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {
  walletConnectV2ApproveCallRequest,
  walletConnectV2RejectCallRequest,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {buildTxDetails} from '../../../store/wallet/effects/send/send';

const HeaderRightContainer = styled.View``;

export interface WalletConnectConfirmParamList {
  wallet: Wallet;
  recipient: Recipient;
  peerName?: string;
  request: any;
}

const WalletConnectConfirm = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<WalletConnectGroupParamList, 'WalletConnectConfirm'>>();
  const {wallet, request, peerName, recipient} = route.params;
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);

  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const [txDetails, setTxDetails] = useState<TxDetails>();

  const _setTxDetails = async () => {
    try {
      const feePerKb = await getFeeRatePerKb({wallet, feeLevel: 'normal'});
      const _txDetails = await dispatch(
        buildTxDetails({
          wallet,
          rates,
          defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
          recipient,
          context: 'walletConnect',
          request,
          feePerKb,
        }),
      );
      setTxDetails(_txDetails);
    } catch (err) {
      await showErrorMessage(
        CustomErrorMessage({
          errMsg: BWCErrorMessage(err),
          title: t('Uh oh, something went wrong'),
        }),
      );
    }
  };

  useEffect(() => {
    _setTxDetails();
  }, []);

  const feeOptions = GetFeeOptions(wallet.chain);

  const approveCallRequest = async () => {
    try {
      dispatch(startOnGoingProcessModal('SENDING_PAYMENT'));
      await dispatch(walletConnectV2ApproveCallRequest(request, wallet));
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
      await dispatch(walletConnectV2RejectCallRequest(request));
      dispatch(dismissOnGoingProcessModal());
      await sleep(1000);
      navigation.goBack();
    } catch (err) {
      dispatch(dismissOnGoingProcessModal());
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
          height={100}
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
        <SendingTo recipient={txDetails?.sendingTo} hr />
        <Fee
          fee={txDetails?.fee}
          feeOptions={feeOptions}
          hideFeeOptions={true}
          hr
        />
        {txDetails?.gasPrice !== undefined ? (
          <SharedDetailRow
            description={t('Gas price')}
            value={txDetails?.gasPrice.toFixed(2) + ' Gwei'}
            hr
          />
        ) : null}
        {txDetails?.gasLimit !== undefined ? (
          <SharedDetailRow
            description={t('Gas limit')}
            value={txDetails?.gasLimit}
            hr
          />
        ) : null}
        {txDetails?.nonce !== undefined && txDetails?.nonce !== null ? (
          <SharedDetailRow description={'Nonce'} value={txDetails?.nonce} hr />
        ) : null}
        <SendingFrom sender={txDetails?.sendingFrom} hr />
        {txDetails?.rateStr ? (
          <ExchangeRate
            description={t('Exchange Rate')}
            rateStr={txDetails?.rateStr}
          />
        ) : null}
        <Amount description={t('SubTotal')} amount={txDetails?.subTotal} />
        <Amount description={t('Total')} amount={txDetails?.total} />
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
