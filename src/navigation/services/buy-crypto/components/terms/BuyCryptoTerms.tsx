import React from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../../../../../contexts';
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
import {BuyCryptoExchangeKey} from '../../utils/buy-crypto-utils';

const styles = StyleSheet.create({
  exchangeTermsContainer: {
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 10,
    paddingLeft: 0,
  },
  termsText: {
    lineHeight: 20,
  },
  exchangeTermsTitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  exchangeTermsText: {
    fontSize: 13,
    lineHeight: 20,
  },
});

export const ExchangeTermsContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.exchangeTermsContainer, style]} {...rest} />
));
ExchangeTermsContainer.displayName = 'ExchangeTermsContainer';

export const TermsText = React.forwardRef<
  Text,
  React.ComponentProps<typeof Small>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <Small
      ref={ref}
      style={[
        styles.termsText,
        {color: theme.dark ? LuckySevens : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
TermsText.displayName = 'TermsText';

export const ExchangeTermsTitle = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.exchangeTermsTitle,
        {color: theme.dark ? White : Black},
        style,
      ]}
      {...rest}
    />
  );
});
ExchangeTermsTitle.displayName = 'ExchangeTermsTitle';

export const ExchangeTermsText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.exchangeTermsText,
        {color: theme.dark ? White : Black},
        style,
      ]}
      {...rest}
    />
  );
});
ExchangeTermsText.displayName = 'ExchangeTermsText';

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
