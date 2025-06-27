import React from 'react';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {
  ExchangeTermsContainer,
  ExchangeTermsText,
} from '../../styled/BuyCryptoTerms';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {Link} from '../../../../../components/styled/Text';
import {useAppDispatch} from '../../../../../utils/hooks';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {PaymentMethod} from '../../constants/BuyCryptoConstants';

const RampTerms: React.FC<{
  paymentMethod: PaymentMethod;
  country?: string;
}> = ({paymentMethod, country = 'US'}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();

  return (
    <ExchangeTermsContainer>
      <ExchangeTermsText>
        {t('What service fees am I paying?')}
      </ExchangeTermsText>
      {['applePay', 'creditCard', 'debitCard', 'other'].includes(
        paymentMethod.method,
      ) ? (
        <ExchangeTermsText>
          {t(
            'For card payments 3.9% of the transaction with a minimum of €2.49 or currency equivalent.',
          )}
        </ExchangeTermsText>
      ) : null}
      {['sepaBankTransfer', 'other'].includes(paymentMethod.method) ? (
        <ExchangeTermsText>
          {t(
            'For bank transfers from 1.49% to 2.99% of the transaction with a minimum of €2.49 or currency equivalent, depending on the amount and the selected transfer method',
          )}
        </ExchangeTermsText>
      ) : null}
      <ExchangeTermsText>
        {t(
          'Ramp Network also charges a dynamic network fee based on the blockchain network conditions, and a partner margin when purchasing crypto within their apps.',
        )}
      </ExchangeTermsText>
      <TouchableOpacity
        onPress={() => {
          haptic('impactLight');
          dispatch(
            openUrlWithInAppBrowser(
              'https://support.ramp.network/en/articles/10415-what-fees-does-ramp-charge-for-buying-and-selling-crypto',
            ),
          );
        }}>
        <Link style={{fontSize: 12}}>{t('Read more')}</Link>
      </TouchableOpacity>
      <ExchangeTermsText style={{marginTop: 6}}>
        {t(
          'This service is provided by a third party, and you are subject to their',
        )}
      </ExchangeTermsText>
      <TouchableOpacity
        onPress={() => {
          haptic('impactLight');
          dispatch(
            openUrlWithInAppBrowser(
              country == 'US'
                ? 'https://ramp.network/terms-of-service/#us-terms-of-service'
                : 'https://ramp.network/terms-of-service/#global-terms-of-service',
            ),
          );
        }}>
        <Link style={{fontSize: 12}}>{t('Terms of service')}</Link>
      </TouchableOpacity>
    </ExchangeTermsContainer>
  );
};

export default RampTerms;
