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
import {SardinePaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
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

export interface SardineSettingsProps {
  incomingPaymentRequest: {
    sardineExternalId: string;
    walletId?: string;
    status?: string;
  };
}

const SardineSettings: React.FC = () => {
  const {t} = useTranslation();
  const sardineHistory = useSelector(
    ({BUY_CRYPTO}: RootState) => BUY_CRYPTO.sardine,
  );
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const logger = useLogger();
  const [paymentRequests, setTransactions] = useState(
    [] as SardinePaymentData[],
  );

  const route = useRoute<RouteProp<{params: SardineSettingsProps}>>();
  const {incomingPaymentRequest} = route.params || {};

  useEffect(() => {
    if (incomingPaymentRequest) {
      logger.debug(
        `Coming from payment request: sardineExternalId: ${incomingPaymentRequest.sardineExternalId}`,
      );
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      const sardinePaymentRequests = Object.values(sardineHistory).filter(
        pr => pr.env === (__DEV__ ? 'dev' : 'prod') && !!pr.order_id,
      );
      setTransactions(sardinePaymentRequests);
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
                        navigation.navigate('SardineDetails', {
                          paymentRequest: pr,
                        });
                      }}>
                      <PrRowLeft>
                        <PrTxtFiatAmount>
                          {pr.fiat_total_amount} {pr.fiat_total_amount_currency}
                        </PrTxtFiatAmount>
                        {['Declined', 'Expired'].includes(pr.status) && (
                          <PrTxtStatus style={{color: '#df5264'}}>
                            {pr.status === 'Declined'
                              ? t('Payment request declined')
                              : t('Payment request expired')}
                          </PrTxtStatus>
                        )}
                        {['Complete', 'Completed'].includes(pr.status) && (
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
                            'pending',
                            'UserCustody',
                            'Processed',
                            'Draft',
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
                {t('There are currently no transactions with Sardine')}
              </NoPrMsg>
            )}
          </ExternalServiceContainer>
        </SettingsComponent>
      </SettingsContainer>
      <FooterSupport>
        <SupportTxt>{t('Having problems with Sardine?')}</SupportTxt>
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser('https://crypto.sardine.ai/support'),
            );
          }}>
          <Link>{t('Contact the Sardine support team.')}</Link>
        </TouchableOpacity>
      </FooterSupport>
    </>
  );
};

export default SardineSettings;
