import React, {useEffect, useState} from 'react';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
  RouteProp,
  useRoute,
  useNavigation,
  useIsFocused,
} from '@react-navigation/native';
import moment from 'moment';
import {useSelector} from 'react-redux';
import {Link} from '../../../../../components/styled/Text';
import {useAppDispatch, useLogger} from '../../../../../utils/hooks';
import {RootState} from '../../../../../store';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {SettingsContainer, SettingsComponent} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {TransakPaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
import {
  NoPrMsg,
  PrTitle,
  PrRow,
  PrRowLeft,
  PrRowRight,
  PrTxtCryptoAmount,
  PrTxtDate,
  PrTxtFiatAmount,
  PrTxtStatus,
  FooterSupport,
  SupportTxt,
} from '../styled/ExternalServicesSettings';
import {useTranslation} from 'react-i18next';
import {ExternalServiceContainer} from '../styled/ExternalServicesDetails';

export interface TransakSettingsProps {
  incomingPaymentRequest: {
    transakExternalId: string;
    walletId?: string;
    status?: string;
  };
}

const TransakSettings: React.FC = () => {
  const {t} = useTranslation();
  const transakHistory = useSelector(
    ({BUY_CRYPTO}: RootState) => BUY_CRYPTO.transak,
  );
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const logger = useLogger();
  const [paymentRequests, setTransactions] = useState(
    [] as TransakPaymentData[],
  );

  const route = useRoute<RouteProp<{params: TransakSettingsProps}>>();
  const {incomingPaymentRequest} = route.params || {};

  useEffect(() => {
    if (incomingPaymentRequest) {
      logger.debug(
        `Coming from payment request: transakExternalId: ${incomingPaymentRequest.transakExternalId}`,
      );
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      const transakPaymentRequests = Object.values(transakHistory).filter(
        pr => pr.env === (__DEV__ ? 'dev' : 'prod'),
      );
      setTransactions(transakPaymentRequests);
    }
  }, [isFocused]);

  return (
    <>
      <SettingsContainer>
        <SettingsComponent style={{paddingBottom: 500}}>
          <ExternalServiceContainer style={{paddingBottom: 50}}>
            {!!paymentRequests?.length && (
              <PrTitle>{t('Payment Requests')}</PrTitle>
            )}
            {paymentRequests &&
              paymentRequests.length > 0 &&
              paymentRequests
                .sort((a, b) => b.created_on - a.created_on)
                .map(pr => {
                  return (
                    <PrRow
                      key={pr.external_id}
                      onPress={() => {
                        haptic('impactLight');
                        navigation.navigate('TransakDetails', {
                          paymentRequest: pr,
                        });
                      }}>
                      <PrRowLeft>
                        <PrTxtFiatAmount>
                          {pr.fiat_total_amount} {pr.fiat_total_amount_currency}
                        </PrTxtFiatAmount>
                        {pr.status === 'CANCELLED' && (
                          <PrTxtStatus style={{color: '#df5264'}}>
                            {t('Payment request cancelled')}
                          </PrTxtStatus>
                        )}
                        {pr.status === 'FAILED' && (
                          <PrTxtStatus style={{color: '#df5264'}}>
                            {t('Payment request failed')}
                          </PrTxtStatus>
                        )}
                        {pr.status === 'REFUNDED' && (
                          <PrTxtStatus>
                            {t('Payment request refunded')}
                          </PrTxtStatus>
                        )}
                        {pr.status === 'EXPIRED' && (
                          <PrTxtStatus style={{color: '#df5264'}}>
                            {t('Payment request expired')}
                          </PrTxtStatus>
                        )}
                        {pr.status === 'COMPLETED' && (
                          <PrTxtStatus style={{color: '#01d1a2'}}>
                            {t('Payment request completed')}
                          </PrTxtStatus>
                        )}
                        {!pr.status ||
                        [
                          'paymentRequestSent',
                          'AWAITING_PAYMENT_FROM_USER',
                        ].includes(pr.status) ? (
                          <PrTxtStatus>
                            {t('Attempted payment request')}
                          </PrTxtStatus>
                        ) : null}
                        {pr.status &&
                          [
                            'pending',
                            'PAYMENT_DONE_MARKED_BY_USER',
                            'PROCESSING',
                            'PENDING_DELIVERY_FROM_TRANSAK',
                            'ON_HOLD_PENDING_DELIVERY_FROM_TRANSAK',
                          ].includes(pr.status) && (
                            <PrTxtStatus>
                              {t('Processing payment request')}
                            </PrTxtStatus>
                          )}
                      </PrRowLeft>
                      <PrRowRight>
                        <PrTxtCryptoAmount>
                          {pr.crypto_amount} {pr.coin}
                        </PrTxtCryptoAmount>
                        <PrTxtDate>{moment(pr.created_on).fromNow()}</PrTxtDate>
                      </PrRowRight>
                    </PrRow>
                  );
                })}
            {(!paymentRequests || paymentRequests.length === 0) && (
              <NoPrMsg>
                {t('There are currently no transactions with Transak')}
              </NoPrMsg>
            )}
          </ExternalServiceContainer>
        </SettingsComponent>
      </SettingsContainer>
      <FooterSupport>
        <SupportTxt>Having problems with Transak?</SupportTxt>
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser(
                'https://support.transak.com/en/collections/3985810-customer-help-center',
              ),
            );
          }}>
          <Link>{t('Visit the Transak customer help center.')}</Link>
        </TouchableOpacity>
      </FooterSupport>
    </>
  );
};

export default TransakSettings;
