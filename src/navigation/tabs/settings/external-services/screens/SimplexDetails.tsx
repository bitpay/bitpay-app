import React, {useEffect, useState} from 'react';
import {Text} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import moment from 'moment';
import {Link} from '../../../../../components/styled/Text';
import {SettingsComponent, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import SimplexLogo from '../../../../../components/icons/external-services/simplex/simplex-logo';
import {SimplexPaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
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
  RowLabel,
  RowData,
  LabelTip,
  LabelTipText,
  ColumnDataContainer,
  ColumnData,
  RemoveCta,
  CopiedContainer,
  CopyImgContainerRight,
  ExternalServiceContainer,
} from '../styled/ExternalServicesDetails';
import {useTranslation} from 'react-i18next';
import CopiedSvg from '../../../../../../assets/img/copied-success.svg';
import {BitpaySupportedCoins} from '../../../../../constants/currencies';
export interface SimplexDetailsProps {
  paymentRequest: SimplexPaymentData;
}

const copyText = (text: string) => {
  haptic('impactLight');
  Clipboard.setString(text);
};

const SimplexDetails: React.FC = () => {
  const {t} = useTranslation();
  const {
    params: {paymentRequest},
  } = useRoute<RouteProp<{params: SimplexDetailsProps}>>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [copiedDepositAddress, setCopiedDepositAddress] = useState(false);
  const [copiedPaymentId, setCopiedPaymentId] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedDepositAddress(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedDepositAddress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedPaymentId(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedPaymentId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedOrderId(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedOrderId]);

  return (
    <SettingsContainer>
      <SettingsComponent>
        <ExternalServiceContainer>
          <RowDataContainer>
            <CryptoAmountContainer>
              <CryptoTitle>{t('Approximate receiving amount')}</CryptoTitle>
              <CryptoContainer>
                <CryptoAmount>{paymentRequest.crypto_amount}</CryptoAmount>
                <CryptoUnit>{paymentRequest.coin}</CryptoUnit>
              </CryptoContainer>
            </CryptoAmountContainer>
            <SimplexLogo iconOnly={true} />
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

          {paymentRequest.chain && (
            <RowDataContainer>
              <RowLabel>{t('Deposit Blockchain')}</RowLabel>
              <RowData>
                {BitpaySupportedCoins[paymentRequest.chain.toLowerCase()]
                  ?.name || paymentRequest.chain.toUpperCase()}
              </RowData>
            </RowDataContainer>
          )}

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
            <TouchableOpacity
              onPress={() => {
                copyText(paymentRequest.address || '');
                setCopiedDepositAddress(true);
              }}>
              <RowLabel>{t('Deposit address')}</RowLabel>
              <CopiedContainer>
                <ColumnData style={{maxWidth: '90%'}}>
                  {paymentRequest.address}
                </ColumnData>
                <CopyImgContainerRight style={{minWidth: '10%'}}>
                  {copiedDepositAddress ? <CopiedSvg width={17} /> : null}
                </CopyImgContainerRight>
              </CopiedContainer>
            </TouchableOpacity>
          </ColumnDataContainer>

          <ColumnDataContainer>
            <TouchableOpacity
              onPress={() => {
                copyText(paymentRequest.payment_id);
                setCopiedPaymentId(true);
              }}>
              <RowLabel>{t('Payment ID')}</RowLabel>
              <CopiedContainer>
                <ColumnData style={{maxWidth: '90%'}}>
                  {paymentRequest.payment_id}
                </ColumnData>
                <CopyImgContainerRight style={{minWidth: '10%'}}>
                  {copiedPaymentId ? <CopiedSvg width={17} /> : null}
                </CopyImgContainerRight>
              </CopiedContainer>
            </TouchableOpacity>
          </ColumnDataContainer>

          <ColumnDataContainer>
            <TouchableOpacity
              onPress={() => {
                copyText(paymentRequest.order_id);
                setCopiedOrderId(true);
              }}>
              <RowLabel>{t('Order ID')}</RowLabel>
              <CopiedContainer>
                <ColumnData style={{maxWidth: '90%'}}>
                  {paymentRequest.order_id}
                </ColumnData>
                <CopyImgContainerRight style={{minWidth: '10%'}}>
                  {copiedOrderId ? <CopiedSvg width={17} /> : null}
                </CopyImgContainerRight>
              </CopiedContainer>
            </TouchableOpacity>
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
        </ExternalServiceContainer>
      </SettingsComponent>
    </SettingsContainer>
  );
};

export default SimplexDetails;
