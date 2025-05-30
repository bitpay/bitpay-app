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

const TransakTerms: React.FC<{
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
            'For card payments from 3.5% to 5.5% of the transaction depending on the fiat currency.',
          )}
        </ExchangeTermsText>
      ) : null}
      {['sepaBankTransfer', 'other'].includes(paymentMethod.method) ? (
        <ExchangeTermsText>
          {t(
            'For bank transfers 0.99% of the transaction with a minimum of €1.00 or currency equivalent.',
          )}
        </ExchangeTermsText>
      ) : null}
      {['other'].includes(paymentMethod.method) ? (
        <ExchangeTermsText>
          {t(
            'Other payment methods can range from 0.99% to 7.99% the transaction, depending on the country and the payment method selected.',
          )}
        </ExchangeTermsText>
      ) : null}
      <ExchangeTermsText>
        {t(
          'Transak also charges a dynamic network fee based on the blockchain network conditions, and a partner margin when purchasing crypto within their apps.',
        )}
      </ExchangeTermsText>
      <TouchableOpacity
        onPress={() => {
          haptic('impactLight');
          dispatch(
            openUrlWithInAppBrowser(
              'https://support.transak.com/en/articles/7845942-how-does-transak-calculate-prices-and-fees',
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
              country === 'US'
                ? 'https://transak.com/terms-of-service-us'
                : 'https://transak.com/terms-of-service',
            ),
          );
        }}>
        <Link style={{fontSize: 12}}>{t('Terms of service')}</Link>
      </TouchableOpacity>
    </ExchangeTermsContainer>
  );
};

export default TransakTerms;
