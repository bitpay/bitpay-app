import React, {useEffect} from 'react';
import {Text, View} from 'react-native';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import moment from 'moment';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {wyrePaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
import WyreIcon from '../../../../../../assets/img/services/wyre/logo-wyre.svg';
import {useDispatch} from 'react-redux';
import {AppActions} from '../../../../../store/app';
import {BuyCryptoActions} from '../../../../../store/buy-crypto';
import {
  RowDataContainer,
  CryptoAmountContainer,
  CryptoTitle,
  CryptoContainer,
  CryptoAmount,
  CryptoUnit,
  IconContainer,
  RowLabel,
  RowData,
  LabelTip,
  LabelTipText,
  ColumnDataContainer,
  ColumnData,
  RemoveCta,
} from '../styled/ExternalServicesDetails';

export interface WyreDetailsProps {
  paymentRequest: wyrePaymentData;
}

const WyreDetails: React.FC = () => {
  const {
    params: {paymentRequest},
  } = useRoute<RouteProp<{params: WyreDetailsProps}>>();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  useEffect(() => {
    if (paymentRequest.purchaseAmount) {
      paymentRequest.fiatBaseAmount = paymentRequest.purchaseAmount;
    } else if (paymentRequest.fee) {
      paymentRequest.fiatBaseAmount =
        +paymentRequest.sourceAmount - +paymentRequest.fee;
    }
  }, []);

  return (
    <SettingsContainer>
      <Settings>
        <RowDataContainer>
          <CryptoAmountContainer>
            <CryptoTitle>Approximate receiving amount</CryptoTitle>
            <CryptoContainer>
              <CryptoAmount>{paymentRequest.destAmount}</CryptoAmount>
              <CryptoUnit>{paymentRequest.destCurrency}</CryptoUnit>
            </CryptoContainer>
          </CryptoAmountContainer>
          <WyreIcon />
        </RowDataContainer>

        <RowDataContainer>
          <RowLabel>Approximate receiving fiat amount</RowLabel>
          <RowData>
            {paymentRequest.fiatBaseAmount} {paymentRequest.sourceCurrency}
          </RowData>
        </RowDataContainer>
        <LabelTip type="warn">
          <LabelTipText>
            The final crypto amount you receive when the transaction is complete
            may differ because it is based on Wyre's exchange rate.
          </LabelTipText>
        </LabelTip>

        <RowDataContainer>
          <RowLabel>Paying</RowLabel>
          <RowData>
            {paymentRequest.sourceAmount} {paymentRequest.sourceCurrency}
          </RowData>
        </RowDataContainer>

        <RowDataContainer>
          <RowLabel>Created</RowLabel>
          <RowData>
            {moment(paymentRequest.created_on).format('MM/DD/YYYY hh:mm a')}
          </RowData>
        </RowDataContainer>

        {['failed', 'success'].includes(paymentRequest.status) && (
          <View>
            <RowLabel>Status</RowLabel>
            <View>
              {paymentRequest.status == 'paymentRequestSent' && (
                <Text style={{color: '#df5264'}}>Payment request sent</Text>
              )}
              {paymentRequest.status == 'failed' && (
                <Text style={{color: '#df5264'}}>Payment request rejected</Text>
              )}
              {paymentRequest.status == 'success' && (
                <Text style={{color: '#01d1a2'}}>Payment request approved</Text>
              )}
            </View>
          </View>
        )}

        <ColumnDataContainer>
          <RowLabel>Deposit address</RowLabel>
          <ColumnData>{paymentRequest.dest}</ColumnData>
        </ColumnDataContainer>

        <ColumnDataContainer>
          <RowLabel>Payment method</RowLabel>
          <ColumnData>{paymentRequest.paymentMethodName}</ColumnData>
        </ColumnDataContainer>

        <ColumnDataContainer>
          <RowLabel>Transfer ID</RowLabel>
          <ColumnData>{paymentRequest.transferId}</ColumnData>
        </ColumnDataContainer>

        <ColumnDataContainer>
          <RowLabel>Order ID</RowLabel>
          <ColumnData>{paymentRequest.orderId}</ColumnData>
        </ColumnDataContainer>

        <ColumnDataContainer>
          <RowLabel>Blockchain Network Tx</RowLabel>
          <ColumnData>{paymentRequest.blockchainNetworkTx}</ColumnData>
        </ColumnDataContainer>

        <RemoveCta
          onPress={async () => {
            haptic('impactLight');
            dispatch(
              AppActions.showBottomNotificationModal({
                type: 'question',
                title: 'Removing Payment Request Data',
                message:
                  "The data of this payment request will be deleted. Make sure you don't need it",
                enableBackdropDismiss: true,
                actions: [
                  {
                    text: 'REMOVE',
                    action: () => {
                      console.log('Removing payment Request');
                      dispatch(AppActions.dismissBottomNotificationModal());
                      dispatch(
                        BuyCryptoActions.removePaymentRequestWyre({
                          orderId: paymentRequest.orderId,
                        }),
                      );
                      navigation.goBack();
                    },
                    primary: true,
                  },
                  {
                    text: 'GO BACK',
                    action: () => {
                      console.log('Removing payment Request CANCELED');
                    },
                  },
                ],
              }),
            );
          }}>
          <Text style={{color: 'red'}}>Remove</Text>
        </RemoveCta>
      </Settings>
    </SettingsContainer>
  );
};

export default WyreDetails;
