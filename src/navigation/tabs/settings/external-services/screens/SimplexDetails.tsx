import React from 'react';
import {Text, View, TouchableOpacity} from 'react-native';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import moment from 'moment';
import {Link} from '../../../../../components/styled/Text';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {simplexPaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
const simplexIcon = require('../../../../../../assets/img/services/simplex/icon-simplex.png');
import {useAppDispatch} from '../../../../../utils/hooks';
import {
  showBottomNotificationModal,
  dismissBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
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

export interface SimplexDetailsProps {
  paymentRequest: simplexPaymentData;
}

const SimplexDetails: React.FC = () => {
  const {
    params: {paymentRequest},
  } = useRoute<RouteProp<{params: SimplexDetailsProps}>>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  return (
    <SettingsContainer>
      <Settings>
        <RowDataContainer>
          <CryptoAmountContainer>
            <CryptoTitle>Approximate receiving amount</CryptoTitle>
            <CryptoContainer>
              <CryptoAmount>{paymentRequest.crypto_amount}</CryptoAmount>
              <CryptoUnit>{paymentRequest.coin}</CryptoUnit>
            </CryptoContainer>
          </CryptoAmountContainer>
          <IconContainer source={simplexIcon} />
        </RowDataContainer>

        <RowDataContainer>
          <RowLabel>Approximate receiving fiat amount</RowLabel>
          <RowData>
            {paymentRequest.fiat_base_amount}{' '}
            {paymentRequest.fiat_total_amount_currency}
          </RowData>
        </RowDataContainer>
        <LabelTip type="warn">
          <LabelTipText>
            The final crypto amount you receive when the transaction is complete
            may differ because it is based on Simplex's exchange rate.
          </LabelTipText>
        </LabelTip>

        <RowDataContainer>
          <RowLabel>Paying</RowLabel>
          <RowData>
            {paymentRequest.fiat_total_amount}{' '}
            {paymentRequest.fiat_total_amount_currency}
          </RowData>
        </RowDataContainer>

        <RowDataContainer>
          <RowLabel>Created</RowLabel>
          <RowData>
            {moment(paymentRequest.created_on).format('MMM DD, YYYY hh:mm a')}
          </RowData>
        </RowDataContainer>

        {['failed', 'success'].includes(paymentRequest.status) && (
          <View>
            <RowLabel>Status</RowLabel>
            <View>
              {paymentRequest.status == 'failed' && (
                <Text style={{color: '#df5264'}}>Payment request rejected</Text>
              )}
              {paymentRequest.status == 'success' && (
                <Text style={{color: '#01d1a2'}}>Payment request approved</Text>
              )}
            </View>
          </View>
        )}

        <LabelTip type="info">
          <LabelTipText>
            If you have successfully completed the entire payment process,
            remember that receiving crypto usually takes up to 3 hours.
          </LabelTipText>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              dispatch(
                openUrlWithInAppBrowser(
                  'https://payment-status.simplex.com/#/',
                ),
              );
            }}>
            <Link style={{marginTop: 15}}>
              What is the status of my payment?
            </Link>
          </TouchableOpacity>
        </LabelTip>

        <ColumnDataContainer>
          <RowLabel>Deposit address</RowLabel>
          <ColumnData>{paymentRequest.address}</ColumnData>
        </ColumnDataContainer>

        <ColumnDataContainer>
          <RowLabel>Payment ID</RowLabel>
          <ColumnData>{paymentRequest.payment_id}</ColumnData>
        </ColumnDataContainer>

        <ColumnDataContainer>
          <RowLabel>Order ID</RowLabel>
          <ColumnData>{paymentRequest.order_id}</ColumnData>
        </ColumnDataContainer>

        <RemoveCta
          onPress={async () => {
            haptic('impactLight');
            dispatch(
              showBottomNotificationModal({
                type: 'question',
                title: 'Removing Payment Request Data',
                message:
                  "The data of this payment request will be deleted. Make sure you don't need it",
                enableBackdropDismiss: true,
                actions: [
                  {
                    text: 'REMOVE',
                    action: () => {
                      dispatch(dismissBottomNotificationModal());
                      dispatch(
                        BuyCryptoActions.removePaymentRequestSimplex({
                          paymentId: paymentRequest.payment_id,
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

export default SimplexDetails;
