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
import {SimplexPaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
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

export interface SimplexSettingsProps {
  incomingPaymentRequest: {
    success: string;
    paymentId: string;
    quoteId: string;
    userId: string;
  };
}

const SimplexSettings: React.FC = () => {
  const {t} = useTranslation();
  const simplexHistory = useSelector(
    ({BUY_CRYPTO}: RootState) => BUY_CRYPTO.simplex,
  );
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const logger = useLogger();
  const [paymentRequests, setTransactions] = useState(
    [] as SimplexPaymentData[],
  );

  const route = useRoute<RouteProp<{params: SimplexSettingsProps}>>();
  const {incomingPaymentRequest} = route.params || {};

  useEffect(() => {
    if (incomingPaymentRequest) {
      logger.debug(
        `Coming from payment request: ${incomingPaymentRequest.paymentId}`,
      );
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      const simplexPaymentRequests = Object.values(simplexHistory).filter(
        pr => pr.env === (__DEV__ ? 'dev' : 'prod'),
      );
      setTransactions(simplexPaymentRequests);
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
                    key={pr.payment_id}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('SimplexDetails', {
                        paymentRequest: pr,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {pr.fiat_total_amount} {pr.fiat_total_amount_currency}
                      </PrTxtFiatAmount>
                      {pr.status === 'failed' && (
                        <PrTxtStatus style={{color: '#df5264'}}>
                          {t('Payment request rejected')}
                        </PrTxtStatus>
                      )}
                      {pr.status === 'success' && (
                        <PrTxtStatus style={{color: '#01d1a2'}}>
                          {t('Payment request approved')}
                        </PrTxtStatus>
                      )}
                      {pr.status === 'paymentRequestSent' && (
                        <PrTxtStatus>
                          {t('Attempted payment request')}
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
              {t('There are currently no transactions with Simplex')}
            </NoPrMsg>
          )}
        </Settings>
      </SettingsContainer>
      <FooterSupport>
        <SupportTxt>{t('Having problems with Simplex?')}</SupportTxt>
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser('https://www.simplex.com/support/'),
            );
          }}>
          <Link>{t('Contact the Simplex support team.')}</Link>
        </TouchableOpacity>
      </FooterSupport>
    </>
  );
};

export default SimplexSettings;
