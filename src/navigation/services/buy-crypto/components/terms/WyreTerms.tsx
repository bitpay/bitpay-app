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

const WyreTerms: React.FC<{
  country?: string;
  fiatCurrency?: string;
}> = ({country = 'US', fiatCurrency}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();

  return (
    <ExchangeTermsContainer>
      <ExchangeTermsText>
        {t('What service fees am I paying?')}
      </ExchangeTermsText>
      {country == 'US' ? (
        <ExchangeTermsText>
          {t(
            '5 USD minimum fee or 2.9% of the amount + 0.30 USD, whichever is greater + Required miners fee.',
          )}
        </ExchangeTermsText>
      ) : null}
      {country != 'US' ? (
        <ExchangeTermsText>
          {t(
            '5 USD minimum fee or 3.9% of the amount + 0.30 USD, whichever is greater + Required miners fee.',
          )}
        </ExchangeTermsText>
      ) : null}
      {fiatCurrency?.toUpperCase() != 'USD' ? (
        <ExchangeTermsText>
          {t('Or its equivalent in .', {
            fiatCurrency: fiatCurrency?.toUpperCase(),
          })}
        </ExchangeTermsText>
      ) : null}
      <TouchableOpacity
        onPress={() => {
          haptic('impactLight');
          dispatch(
            openUrlWithInAppBrowser(
              'https://support.sendwyre.com/hc/en-us/articles/360059565013-Wyre-card-processing-fees',
            ),
          );
        }}>
        <Link style={{fontSize: 12, top: 2}}>{t('Read more')}</Link>
      </TouchableOpacity>
      <ExchangeTermsText style={{marginTop: 4}}>
        {t(
          'This service is provided by a third party, and you are subject to their',
        )}
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser(
                'https://www.sendwyre.com/user-agreement/',
              ),
            );
          }}>
          <Link style={{fontSize: 12, top: 2}}>{t('User Agreement')}</Link>
        </TouchableOpacity>
      </ExchangeTermsText>
    </ExchangeTermsContainer>
  );
};

export default WyreTerms;
