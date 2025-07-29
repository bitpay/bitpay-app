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
import {BanxaPaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
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

export interface BanxaSettingsProps {
  incomingPaymentRequest: {
    banxaExternalId: string;
    banxaOrderId?: string;
    walletId?: string;
    status?: string;
  };
}

const BanxaSettings: React.FC = () => {
  const {t} = useTranslation();
  const banxaHistory = useSelector(
    ({BUY_CRYPTO}: RootState) => BUY_CRYPTO.banxa,
  );
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const logger = useLogger();
  const [paymentRequests, setTransactions] = useState([] as BanxaPaymentData[]);

  const route = useRoute<RouteProp<{params: BanxaSettingsProps}>>();
  const {incomingPaymentRequest} = route.params || {};

  useEffect(() => {
    if (incomingPaymentRequest) {
      logger.debug(
        `Coming from payment request: banxaExternalId: ${incomingPaymentRequest.banxaExternalId}`,
      );
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      const banxaPaymentRequests = Object.values(banxaHistory).filter(
        pr => pr.env === (__DEV__ ? 'dev' : 'prod'),
      );
      setTransactions(banxaPaymentRequests);
    }
  }, [isFocused]);

  return (
    <>
      <SettingsContainer>
        <SettingsComponent style={{paddingBottom: 500}}>
          <ExternalServiceContainer style={{paddingBottom: 50}}>
            {paymentRequests && paymentRequests.length > 0 && (
              <PrTitle>{t('Payment Requests')}</PrTitle>
            )}
            {paymentRequests &&
              paymentRequests.length > 0 &&
              paymentRequests
                .sort((a, b) => b.created_on - a.created_on)
                .map(pr => {
                  return (
                    <PrRow
                      key={pr.order_id}
                      onPress={() => {
                        haptic('impactLight');
                        navigation.navigate('BanxaDetails', {
                          paymentRequest: pr,
                        });
                      }}>
                      <PrRowLeft>
                        <PrTxtFiatAmount>
                          {pr.fiat_total_amount} {pr.fiat_total_amount_currency}
                        </PrTxtFiatAmount>
                        {pr.status === 'declined' && (
                          <PrTxtStatus style={{color: '#df5264'}}>
                            {t('Payment request declined')}
                          </PrTxtStatus>
                        )}
                        {pr.status === 'expired' && (
                          <PrTxtStatus style={{color: '#df5264'}}>
                            {t('Payment request expired')}
                          </PrTxtStatus>
                        )}
                        {pr.status === 'failed' && (
                          <PrTxtStatus style={{color: '#df5264'}}>
                            {t('Payment request failed')}
                          </PrTxtStatus>
                        )}
                        {pr.status === 'cancelled' && (
                          <PrTxtStatus style={{color: '#df5264'}}>
                            {t('Payment request cancelled')}
                          </PrTxtStatus>
                        )}
                        {pr.status === 'complete' && (
                          <PrTxtStatus style={{color: '#01d1a2'}}>
                            {t('Payment request completed')}
                          </PrTxtStatus>
                        )}
                        {pr.status === 'refunded' && (
                          <PrTxtStatus>
                            {t('Payment request refunded')}
                          </PrTxtStatus>
                        )}
                        {!pr.status ||
                          (pr.status === 'paymentRequestSent' && (
                            <PrTxtStatus>
                              {t('Attempted payment request')}
                            </PrTxtStatus>
                          ))}
                        {pr.status &&
                          [
                            'pending',
                            'pendingPayment',
                            'waitingPayment',
                            'paymentReceived',
                            'inProgress',
                            'coinTransferred',
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
                {t('There are currently no transactions with Banxa')}
              </NoPrMsg>
            )}
          </ExternalServiceContainer>
        </SettingsComponent>
      </SettingsContainer>
      <FooterSupport>
        <SupportTxt>{t('Having problems with Banxa?')}</SupportTxt>
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser(
                'https://support.banxa.com/en/support/solutions/',
              ),
            );
          }}>
          <Link>{t('Contact the Banxa support team.')}</Link>
        </TouchableOpacity>
      </FooterSupport>
    </>
  );
};

export default BanxaSettings;
