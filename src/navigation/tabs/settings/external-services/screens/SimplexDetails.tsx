import React from 'react';
import {Text, TouchableOpacity} from 'react-native';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import moment from 'moment';
import {Link} from '../../../../../components/styled/Text';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import SimplexLogo from '../../../../../components/icons/external-services/simplex/simplex-logo';
import {simplexPaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
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
import {useTranslation} from 'react-i18next';

export interface SimplexDetailsProps {
  paymentRequest: simplexPaymentData;
}

const SimplexDetails: React.FC = () => {
  const {t} = useTranslation();
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
            <CryptoTitle>{t('Approximate receiving amount')}</CryptoTitle>
            <CryptoContainer>
              <CryptoAmount>{paymentRequest.crypto_amount}</CryptoAmount>
              <CryptoUnit>{paymentRequest.coin}</CryptoUnit>
            </CryptoContainer>
          </CryptoAmountContainer>
          <SimplexLogo iconOnly={true} width={45} height={45} />
        </RowDataContainer>

        <RowDataContainer>
          <RowLabel>{t('Approximate receiving fiat amount')}</RowLabel>
          <RowData>
            {paymentRequest.fiat_base_amount}{' '}
            {paymentRequest.fiat_total_amount_currency}
          </RowData>
        </RowDataContainer>
        <LabelTip type="warn">
          <LabelTipText>
            {t(
              "The final crypto amount you receive when the transaction is complete may differ because it is based on Simplex's exchange rate.",
            )}
          </LabelTipText>
        </LabelTip>

        <RowDataContainer>
          <RowLabel>{t('Paying')}</RowLabel>
          <RowData>
            {paymentRequest.fiat_total_amount}{' '}
            {paymentRequest.fiat_total_amount_currency}
          </RowData>
        </RowDataContainer>

        <RowDataContainer>
          <RowLabel>{t('Created')}</RowLabel>
          <RowData>
            {moment(paymentRequest.created_on).format('MMM DD, YYYY hh:mm a')}
          </RowData>
        </RowDataContainer>

        {['failed', 'success'].includes(paymentRequest.status) && (
          <RowDataContainer>
            <RowLabel>{t('Status')}</RowLabel>
            <RowData>
              {paymentRequest.status === 'failed' && (
                <Text style={{color: '#df5264'}}>
                  {t('Payment request rejected')}
                </Text>
              )}
              {paymentRequest.status === 'success' && (
                <Text style={{color: '#01d1a2'}}>
                  {t('Payment request approved')}
                </Text>
              )}
            </RowData>
          </RowDataContainer>
        )}

        <LabelTip type="info">
          <LabelTipText>
            {t(
              'If you have successfully completed the entire payment process, remember that receiving crypto usually takes up to 3 hours.',
            )}
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
              {t('What is the status of my payment?')}
            </Link>
          </TouchableOpacity>
        </LabelTip>

        <ColumnDataContainer>
          <RowLabel>{t('Deposit address')}</RowLabel>
          <ColumnData>{paymentRequest.address}</ColumnData>
        </ColumnDataContainer>

        <ColumnDataContainer>
          <RowLabel>{t('Payment ID')}</RowLabel>
          <ColumnData>{paymentRequest.payment_id}</ColumnData>
        </ColumnDataContainer>

        <ColumnDataContainer>
          <RowLabel>{t('Order ID')}</RowLabel>
          <ColumnData>{paymentRequest.order_id}</ColumnData>
        </ColumnDataContainer>

        <RemoveCta
          onPress={async () => {
            haptic('impactLight');
            dispatch(
              showBottomNotificationModal({
                type: 'question',
                title: t('Removing payment request data'),
                message: t(
                  "The data of this payment request will be deleted. Make sure you don't need it",
                ),
                enableBackdropDismiss: true,
                actions: [
                  {
                    text: t('REMOVE'),
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
                    text: t('GO BACK'),
                    action: () => {
                      console.log('Removing payment Request CANCELED');
                    },
                  },
                ],
              }),
            );
          }}>
          <Text style={{color: 'red'}}>{t('Remove')}</Text>
        </RemoveCta>
      </Settings>
    </SettingsContainer>
  );
};

export default SimplexDetails;
