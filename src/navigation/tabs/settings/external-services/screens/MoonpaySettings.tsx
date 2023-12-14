import React, {useEffect, useState} from 'react';
import {TouchableOpacity} from 'react-native';
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
import {Settings, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {MoonpayPaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
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

export interface MoonpaySettingsProps {
  incomingPaymentRequest: {
    externalId: string;
    transactionId?: string;
    status?: string;
  };
}

const MoonpaySettings: React.FC = () => {
  const {t} = useTranslation();
  const moonpayHistory = useSelector(
    ({BUY_CRYPTO}: RootState) => BUY_CRYPTO.moonpay,
  );
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const logger = useLogger();
  const [paymentRequests, setTransactions] = useState(
    [] as MoonpayPaymentData[],
  );

  const route = useRoute<RouteProp<{params: MoonpaySettingsProps}>>();
  const {incomingPaymentRequest} = route.params || {};

  useEffect(() => {
    if (incomingPaymentRequest) {
      logger.debug(
        `Coming from payment request: ExternalID: ${
          incomingPaymentRequest.externalId
        }${
          incomingPaymentRequest.transactionId
            ? ` - TransactionID: ${incomingPaymentRequest.transactionId}`
            : ''
        }`,
      );
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      const moonpayPaymentRequests = Object.values(moonpayHistory).filter(
        pr => pr.env === (__DEV__ ? 'dev' : 'prod'),
      );
      setTransactions(moonpayPaymentRequests);
    }
  }, [isFocused]);

  return (
    <>
      <SettingsContainer>
        <Settings style={{paddingBottom: 500}}>
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
                    key={pr.external_id}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('MoonpayDetails', {
                        paymentRequest: pr,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {pr.fiat_total_amount} {pr.fiat_total_amount_currency}
                      </PrTxtFiatAmount>
                      {pr.status === 'failed' && (
                        <PrTxtStatus style={{color: '#df5264'}}>
                          {t('Payment request failed')}
                        </PrTxtStatus>
                      )}
                      {pr.status === 'completed' && (
                        <PrTxtStatus style={{color: '#01d1a2'}}>
                          {t('Payment request completed')}
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
                          'waitingPayment',
                          'pending',
                          'waitingAuthorization',
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
              {t('There are currently no transactions with Moonpay')}
            </NoPrMsg>
          )}
        </Settings>
      </SettingsContainer>
      <FooterSupport>
        <SupportTxt>{t('Having problems with Moonpay?')}</SupportTxt>
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser(
                'https://support.moonpay.com/hc/en-gb/requests/new',
              ),
            );
          }}>
          <Link>{t('Contact the Moonpay support team.')}</Link>
        </TouchableOpacity>
      </FooterSupport>
    </>
  );
};

export default MoonpaySettings;
