import React from 'react';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {BaseText, Link, Small} from '../../../../../components/styled/Text';
import {useAppDispatch} from '../../../../../utils/hooks';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {PaymentMethod} from '../../constants/BuyCryptoConstants';
import {isEuCountry} from '../../../../../store/location/location.effects';
import {
  Black,
  LuckySevens,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import styled from 'styled-components';
import {BuyCryptoExchangeKey} from '../../utils/buy-crypto-utils';

export const ExchangeTermsContainer = styled.View`
  padding: 0 0 10px 0;
`;

export const TermsText = styled(Small)`
  line-height: 20px;
  color: ${({theme: {dark}}) => (dark ? LuckySevens : SlateDark)};
`;

export const ExchangeTermsTitle = styled(BaseText)`
  font-size: 16px;
  line-height: 24px;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
`;

export const ExchangeTermsText = styled(BaseText)`
  font-size: 13px;
  line-height: 20px;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
`;

const BuyCryptoTerms: React.FC<{
  exchangeKey: BuyCryptoExchangeKey;
  paymentMethod?: PaymentMethod;
  country?: string;
}> = ({exchangeKey, paymentMethod, country = 'US'}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();

  const getLinks = (
    exchangeKey: BuyCryptoExchangeKey,
    pm: PaymentMethod | undefined,
  ) => {
    switch (exchangeKey) {
      case 'banxa':
        return {
          fees: 'https://support.banxa.com/en/support/solutions/articles/44002465167-how-does-banxa-set-the-price-of-cryptocurrency-',
          terms:
            'https://banxa.com/wp-content/uploads/2023/06/Customer-Terms-and-Conditions-19-June-2023.pdf',
        };
      case 'moonpay':
        return {
          fees: isEuCountry(country)
            ? 'https://www.moonpay.com/legal/europe_pricing_disclosure'
            : 'https://www.moonpay.com/legal/pricing_disclosure',
          terms:
            country == 'US'
              ? 'https://www.moonpay.com/legal/terms_of_use_usa'
              : 'https://www.moonpay.com/legal/terms_of_use',
        };
      case 'ramp':
        return {
          fees: 'https://support.rampnetwork.com/en/articles/10415-what-fees-does-ramp-charge-for-buying-and-selling-crypto',
          terms:
            country == 'US'
              ? 'https://rampnetwork.com/terms-of-service/#us-terms-of-service'
              : 'https://rampnetwork.com/terms-of-service/#global-terms-of-service',
        };
      case 'sardine':
        return {
          fees: 'https://docs.payments.sardine.ai/overview/pricing',
          terms: 'https://crypto.sardine.ai/terms',
        };
      case 'simplex':
        return {
          fees: 'https://www.simplex.com/kb/what-fees-do-you-charge-for-card-payments',
          terms: 'https://www.simplex.com/terms-of-use/',
        };
      case 'transak':
        return {
          fees: 'https://support.transak.com/en/articles/7845942-how-does-transak-calculate-prices-and-fees',
          terms:
            country === 'US'
              ? 'https://transak.com/terms-of-service-us'
              : 'https://transak.com/terms-of-service',
        };
    }
  };

  return (
    <ExchangeTermsContainer>
      {getLinks(exchangeKey, paymentMethod) ? (
        <>
          <ExchangeTermsTitle>
            {t('What service fees am I paying?')}
          </ExchangeTermsTitle>
          <ExchangeTermsText style={{marginTop: 6}}>
            {t("To learn more about the fees that you're paying,") + ' '}
          </ExchangeTermsText>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              dispatch(
                openUrlWithInAppBrowser(
                  getLinks(exchangeKey, paymentMethod).fees,
                ),
              );
            }}>
            <Link style={{fontSize: 13}}>{t('Read more.')}</Link>
          </TouchableOpacity>
        </>
      ) : null}
      <ExchangeTermsText style={{marginTop: 6}}>
        {t(
          'This service is provided by a third party, and you are subject to their',
        ) + ' '}
      </ExchangeTermsText>
      <TouchableOpacity
        onPress={() => {
          haptic('impactLight');
          dispatch(
            openUrlWithInAppBrowser(
              getLinks(exchangeKey, paymentMethod)?.terms,
            ),
          );
        }}>
        <Link style={{fontSize: 13}}>{t('Terms of service.')}</Link>
      </TouchableOpacity>
    </ExchangeTermsContainer>
  );
};

export default BuyCryptoTerms;
