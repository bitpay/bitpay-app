import React, {useEffect, useState} from 'react';
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

const SardineTerms: React.FC<{
  quoteData: any;
}> = ({quoteData}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const [networkFee, setNetworkFee] = useState<number>();
  const [transactionFee, setTransactionFee] = useState<number>();

  useEffect(() => {
    if (quoteData?.total) {
      if (quoteData.networkFee) {
        setNetworkFee(
          Number(((quoteData.networkFee * 100) / quoteData.total).toFixed(2)),
        );
      }
      if (quoteData.transactionFee) {
        setTransactionFee(
          Number(
            ((quoteData.transactionFee * 100) / quoteData.total).toFixed(2),
          ),
        );
      }
    }
  }, [quoteData]);

  return (
    <ExchangeTermsContainer>
      <ExchangeTermsText>
        {t('What service fees am I paying?')}
      </ExchangeTermsText>
      <ExchangeTermsText style={{maxWidth: '80%'}}>
        {t('SardineTermsFeeInfo', {
          networkFee,
          transactionFee,
        })}
      </ExchangeTermsText>
      <ExchangeTermsText>
        {t(
          'The network fee is paid to crypto miners to ensure that the transaction is processed on the crypto network.',
        )}
      </ExchangeTermsText>
      <ExchangeTermsText style={{marginTop: 6}}>
        {t(
          'This service is provided by a third party, and you are subject to their',
        )}
      </ExchangeTermsText>
      <TouchableOpacity
        onPress={() => {
          haptic('impactLight');
          dispatch(openUrlWithInAppBrowser('https://crypto.sardine.ai/terms'));
        }}>
        <Link style={{fontSize: 12}}>{t('Terms of service')}</Link>
      </TouchableOpacity>
    </ExchangeTermsContainer>
  );
};

export default SardineTerms;
