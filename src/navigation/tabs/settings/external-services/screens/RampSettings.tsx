import React, {useEffect, useState} from 'react';
import {TouchableOpacity} from 'react-native-gesture-handler';
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
import {RampPaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
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

export interface RampSettingsProps {
  incomingPaymentRequest: {
    rampExternalId: string;
    walletId?: string;
    status?: string;
  };
}

const RampSettings: React.FC = () => {
  const {t} = useTranslation();
  const rampHistory = useSelector(({BUY_CRYPTO}: RootState) => BUY_CRYPTO.ramp);
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const logger = useLogger();
  const [paymentRequests, setTransactions] = useState([] as RampPaymentData[]);

  const route = useRoute<RouteProp<{params: RampSettingsProps}>>();
  const {incomingPaymentRequest} = route.params || {};

  useEffect(() => {
    if (incomingPaymentRequest) {
      logger.debug(
        `Coming from payment request: rampExternalId: ${incomingPaymentRequest.rampExternalId}`,
      );
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      const rampPaymentRequests = Object.values(rampHistory).filter(
        pr => pr.env === (__DEV__ ? 'dev' : 'prod'),
      );
      setTransactions(rampPaymentRequests);
    }
  }, [isFocused]);

  return (
    <>
      <SettingsContainer>
        <SettingsComponent style={{paddingBottom: 500}}>
          {!!paymentRequests?.length && <PrTitle>{t('Payment Requests')}</PrTitle>}
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
                      navigation.navigate('RampDetails', {
                        paymentRequest: pr,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {pr.fiat_total_amount} {pr.fiat_total_amount_currency}
                      </PrTxtFiatAmount>
                      {!pr.status ||
                        (pr.status === 'paymentRequestSent' && (
                          <PrTxtStatus>
                            {t('Attempted payment request')}
                          </PrTxtStatus>
                        ))}
                      {pr.status && ['pending'].includes(pr.status) && (
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
              {t('There are currently no transactions with Ramp Network')}
            </NoPrMsg>
          )}
        </SettingsComponent>
      </SettingsContainer>
      <FooterSupport>
        <SupportTxt>{t('Having problems with Ramp Network?')}</SupportTxt>
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser(
                'https://support.ramp.network/en/articles/455-get-help-from-ramp-support',
              ),
            );
          }}>
          <Link>{t('Contact the Ramp Network support team.')}</Link>
        </TouchableOpacity>
      </FooterSupport>
    </>
  );
};

export default RampSettings;
