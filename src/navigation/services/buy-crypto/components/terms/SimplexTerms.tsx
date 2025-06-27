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

const SimplexTerms: React.FC<{
  paymentMethod?: PaymentMethod;
}> = ({paymentMethod}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();

  return (
    <ExchangeTermsContainer>
      <ExchangeTermsText>
        {t('What service fees am I paying?')}
      </ExchangeTermsText>
      {paymentMethod?.method == 'sepaBankTransfer' ? (
        <ExchangeTermsText>{t('1.5% of the amount.')}</ExchangeTermsText>
      ) : null}
      {paymentMethod?.method != 'sepaBankTransfer' ? (
        <>
          <ExchangeTermsText>
            {t(
              'Can range from 3.5% to 5% of the transaction, depending on the volume of traffic (with a minimum of 10 USD or its equivalent in any other fiat currency) + 1% of the transaction.',
            )}
          </ExchangeTermsText>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              dispatch(
                openUrlWithInAppBrowser(
                  'https://support.simplex.com/hc/en-gb/articles/360014078420-What-fees-am-I-paying-',
                ),
              );
            }}>
            <Link style={{fontSize: 12}}>{t('Read more')}</Link>
          </TouchableOpacity>
        </>
      ) : null}
      <ExchangeTermsText style={{marginTop: 6}}>
        {t(
          'This service is provided by a third party, and you are subject to their',
        )}
      </ExchangeTermsText>
      <TouchableOpacity
        onPress={() => {
          haptic('impactLight');
          dispatch(
            openUrlWithInAppBrowser('https://www.simplex.com/terms-of-use/'),
          );
        }}>
        <Link style={{fontSize: 12}}>{t('Terms of use')}</Link>
      </TouchableOpacity>
    </ExchangeTermsContainer>
  );
};

export default SimplexTerms;
