import React, {useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import styled from 'styled-components/native';
import {
  Column,
  Hr,
  Row,
  ScreenGutter,
} from '../../../../components/styled/Containers';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../../WalletStack';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {ScrollView, View} from 'react-native';
import {H4, H5, H6, H7} from '../../../../components/styled/Text';
import {
  Recipient,
  TransactionProposal,
  TxDetails,
  Wallet,
} from '../../../../store/wallet/wallet.models';
import SwipeButton from '../../../../components/swipe-button/SwipeButton';
import {startSendPayment} from '../../../../store/wallet/effects/send/send';
import PaymentSent from '../../components/PaymentSent';
import {sleep} from '../../../../utils/helper-methods';
import {startOnGoingProcessModal} from '../../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../../components/modal/ongoing-process/OngoingProcess';
import {dismissOnGoingProcessModal} from '../../../../store/app/app.actions';
import SendToPill from '../../components/SendToPill';
import {SUPPORTED_CURRENCIES} from '../../../../constants/currencies';
import {CurrencyListIcons} from '../../../../constants/SupportedCurrencyOptions';
import DefaultSvg from '../../../../../assets/img/currencies/default.svg';

const ConfirmContainer = styled.SafeAreaView`
  flex: 1;
  width: 100%;
`;

const Header = styled.View`
  margin-top: 10px;
  height: 80px;
  justify-content: center;
`;

const DetailContainer = styled.View`
  min-height: 80px;
  margin: 5px 0;
  justify-content: center;
`;

const DetailRow = styled(Row)`
  align-items: center;
  justify-content: space-between;
`;

const DetailColumn = styled(Column)`
  align-items: flex-end;
`;

const DetailsList = styled(ScrollView)`
  padding: 0 ${ScreenGutter};
`;

export interface ConfirmParamList {
  wallet: Wallet;
  recipient: Recipient;
  txp: Partial<TransactionProposal>;
  txDetails: TxDetails;
}

const Confirm = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'Confirm'>>();
  const {wallet, recipient, txDetails: _txDetails, txp: _txp} = route.params;
  const key = useAppSelector(({WALLET}) => WALLET.keys[wallet.keyId]);

  const [txDetails] = useState(_txDetails);
  const [txp] = useState(_txp);
  const [showPaymentSentModal, setShowPaymentSentModal] = useState(false);

  const {
    currency,
    fee,
    sendingFrom,
    sendingTo: {recipientName, recipientAddress},
    subTotal,
    total,
  } = txDetails;

  const getIcon = () => {
    return SUPPORTED_CURRENCIES.includes(currency) ? (
      CurrencyListIcons[currency]({width: 18, height: 18})
    ) : (
      <DefaultSvg width={18} height={18} />
    );
  };
  console.log(txp);
  return (
    <ConfirmContainer>
      <DetailsList>
        <Header>
          <H6>SUMMARY</H6>
        </Header>
        <Hr />
        <DetailContainer>
          <DetailRow>
            <H7>Sending to</H7>

            <SendToPill
              icon={getIcon()}
              description={recipientName || recipientAddress || ''}
            />
          </DetailRow>
        </DetailContainer>
        <Hr />
        <DetailContainer>
          <DetailRow>
            <H7>Miner fee</H7>
            <DetailColumn>
              <H5>{fee.feeLevel.toUpperCase()}</H5>
              <H6>{fee.cryptoAmount}</H6>
              <H7>
                {fee.fiatAmount} ({fee.percentageOfTotalAmount} of total amount)
              </H7>
            </DetailColumn>
          </DetailRow>
        </DetailContainer>
        <Hr />
        <DetailContainer>
          <DetailRow>
            <H7>Sending from</H7>
            <H5>{sendingFrom.walletName}</H5>
          </DetailRow>
        </DetailContainer>
        <Hr />
        <DetailContainer>
          <DetailRow>
            <H6>SUBTOTAL</H6>
            <DetailColumn>
              <H4>{subTotal.cryptoAmount}</H4>
              <H7>{subTotal.fiatAmount}</H7>
            </DetailColumn>
          </DetailRow>
        </DetailContainer>
        <DetailContainer>
          <DetailRow>
            <H6>TOTAL</H6>
            <View>
              <DetailColumn>
                <H4>{total.cryptoAmount}</H4>
                <H7>{total.fiatAmount}</H7>
              </DetailColumn>
            </View>
          </DetailRow>
        </DetailContainer>
      </DetailsList>
      <SwipeButton
        title={'Slide to send'}
        onSwipeComplete={async () => {
          try {
            dispatch(
              startOnGoingProcessModal(OnGoingProcessMessages.SENDING_PAYMENT),
            );
            await sleep(300);
            await dispatch(startSendPayment({txp, key, wallet, recipient}));
            dispatch(dismissOnGoingProcessModal());
            await sleep(400);
            setShowPaymentSentModal(true);
          } catch (err) {}
        }}
      />

      <PaymentSent
        isVisible={showPaymentSentModal}
        onCloseModal={async () => {
          navigation.navigate('Wallet', {
            screen: 'WalletDetails',
            params: {
              walletId: wallet.id,
              key,
            },
          });
          await sleep(300);
          setShowPaymentSentModal(false);
        }}
      />
    </ConfirmContainer>
  );
};

export default Confirm;
