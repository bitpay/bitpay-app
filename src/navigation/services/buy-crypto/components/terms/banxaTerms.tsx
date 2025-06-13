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

const BanxaTerms: React.FC<{
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
            'For debit/credit card or Apple Pay payments, fees are 1.99% of the transaction.',
          )}
        </ExchangeTermsText>
      ) : null}
      {['sepaBankTransfer', 'other'].includes(paymentMethod.method) ? (
        <ExchangeTermsText>
          {t(
            'Most bank transfers do not charge a fee. But there may be exceptions for particular cases.',
          )}
        </ExchangeTermsText>
      ) : null}
      {['other'].includes(paymentMethod.method) ? (
        <ExchangeTermsText>
          {t('For payments through PIX 3.00% of the transaction.')}
        </ExchangeTermsText>
      ) : null}
      <ExchangeTermsText>
        {t(
          'Banxa also charges a service fee, which is included in the unit price for the transaction, based the cost of each payment method.',
        )}
      </ExchangeTermsText>
      <TouchableOpacity
        onPress={() => {
          haptic('impactLight');
          dispatch(
            openUrlWithInAppBrowser(
              'https://support.banxa.com/en/support/solutions/articles/44002465167-how-does-banxa-set-the-price-of-cryptocurrency-',
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
              'https://banxa.com/wp-content/uploads/2023/06/Customer-Terms-and-Conditions-19-June-2023.pdf',
            ),
          );
        }}>
        <Link style={{fontSize: 12}}>{t('Terms of use')}</Link>
      </TouchableOpacity>
    </ExchangeTermsContainer>
  );
};

export default BanxaTerms;
