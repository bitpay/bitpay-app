import React, {useEffect, useState} from 'react';
import {useNavigation, useIsFocused} from '@react-navigation/native';
import moment from 'moment';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../../store';
import {SettingsContainer, SettingsComponent} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {WyrePaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
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
} from '../styled/ExternalServicesSettings';
import {useTranslation} from 'react-i18next';
import {AppActions} from '../../../../../store/app';
import {useAppDispatch} from '../../../../../utils/hooks';
import {sleep} from '../../../../../utils/helper-methods';
import {ExternalServiceContainer} from '../styled/ExternalServicesDetails';

export interface WyreSettingsProps {
  incomingPaymentRequest?: WyrePaymentData;
  paymentRequestError?: boolean;
}

const WyreSettings: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const wyreHistory = useSelector(({BUY_CRYPTO}: RootState) => BUY_CRYPTO.wyre);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [paymentRequests, setTransactions] = useState([] as WyrePaymentData[]);

  useEffect(() => {
    const showWyreWarning = async () => {
      await sleep(600);
      dispatch(
        AppActions.showBottomNotificationModal({
          title: t('Warning'),
          message: t('Please note that Wyre is out of service.'),
          type: 'warning',
          actions: [
            {
              text: t('OK'),
              action: () => {},
            },
          ],
          enableBackdropDismiss: true,
          onBackdropDismiss: () => {},
        }),
      );
    };

    showWyreWarning();
  }, []);

  useEffect(() => {
    if (isFocused) {
      const wyrePaymentRequests = Object.values(wyreHistory).filter(
        pr => pr.env === (__DEV__ ? 'dev' : 'prod'),
      );
      setTransactions(wyrePaymentRequests);
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
                      key={pr.orderId}
                      onPress={() => {
                        haptic('impactLight');
                        navigation.navigate('WyreDetails', {
                          paymentRequest: pr,
                        });
                      }}>
                      <PrRowLeft>
                        <PrTxtFiatAmount>
                          {pr.sourceAmount} {pr.sourceCurrency}
                        </PrTxtFiatAmount>
                        {pr.status === 'failed' && (
                          <PrTxtStatus style={{color: '#df5264'}}>
                            {t('Payment request rejected')}
                          </PrTxtStatus>
                        )}
                        {pr.status === 'success' && (
                          <PrTxtStatus style={{color: '#01d1a2'}}>
                            {t('Payment request approved')}
                          </PrTxtStatus>
                        )}
                        {pr.status === 'paymentRequestSent' && (
                          <PrTxtStatus>
                            {t('Processing payment request')}
                          </PrTxtStatus>
                        )}
                      </PrRowLeft>
                      <PrRowRight>
                        <PrTxtCryptoAmount>
                          {pr.destAmount} {pr.destCurrency}
                        </PrTxtCryptoAmount>
                        <PrTxtDate>{moment(pr.created_on).fromNow()}</PrTxtDate>
                      </PrRowRight>
                    </PrRow>
                  );
                })}
            {(!paymentRequests || paymentRequests.length == 0) && (
              <NoPrMsg>
                {t('There are currently no transactions with Wyre')}
              </NoPrMsg>
            )}
          </ExternalServiceContainer>
        </SettingsComponent>
      </SettingsContainer>
    </>
  );
};

export default WyreSettings;
