import React from 'react';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from 'react-native';
import {
  ExchangeTermsContainer,
  ExchangeTermsText,
} from '../../styled/BuyCryptoTerms';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {Link} from '../../../../../components/styled/Text';
import {useAppDispatch} from '../../../../../utils/hooks';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {PaymentMethod} from '../../constants/BuyCryptoConstants';

const MoonpayTerms: React.FC<{
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
            'For card payments 4.5% of the transaction with a minimum of €3.99/£3.99/$3.99 or currency equivalent.',
          )}
        </ExchangeTermsText>
      ) : null}
      {['sepaBankTransfer', 'other'].includes(paymentMethod.method) ? (
        <ExchangeTermsText>
          {t(
            'For bank transfers 1% of the transaction with a minimum of €3.99/£3.99/$3.99 or currency equivalent',
          )}
        </ExchangeTermsText>
      ) : null}
      {['other'].includes(paymentMethod.method) ? (
        <ExchangeTermsText>
          {t('For payments through PIX 2.95% of the transaction.')}
        </ExchangeTermsText>
      ) : null}
      <ExchangeTermsText>
        {t(
          'Moonpay also charges a dynamic network fee on all BTC, ETH and ERC20 tokens purchases, based on the blockchain network conditions.',
        )}
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser(
                'https://support.moonpay.com/customers/docs/moonpay-fees',
              ),
            );
          }}>
          <Link style={{fontSize: 12, marginLeft: 2, top: 2}}>
            {t('Read more')}
          </Link>
        </TouchableOpacity>
      </ExchangeTermsText>
      <ExchangeTermsText style={{marginTop: 4}}>
        {t(
          'This service is provided by a third party, and you are subject to their',
        )}
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser(
                country == 'US'
                  ? 'https://www.moonpay.com/legal/terms_of_use_usa'
                  : 'https://www.moonpay.com/legal/terms_of_use',
              ),
            );
          }}>
          <Link style={{fontSize: 12, top: 2}}>{t('Terms of use')}</Link>
        </TouchableOpacity>
      </ExchangeTermsText>
    </ExchangeTermsContainer>
  );
};

export default MoonpayTerms;
