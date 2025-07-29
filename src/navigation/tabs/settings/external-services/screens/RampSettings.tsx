import React, {useCallback, useEffect, useState} from 'react';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
  RouteProp,
  useRoute,
  useNavigation,
  useIsFocused,
} from '@react-navigation/native';
import moment from 'moment';
import {useSelector} from 'react-redux';
import {Link} from '../../../../../components/styled/Text';
import {useAppDispatch, useLogger} from '../../../../../utils/hooks';
import {RootState} from '../../../../../store';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {SettingsContainer, SettingsComponent} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {RampPaymentData} from '../../../../../store/buy-crypto/models/ramp.models';
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
  FooterSupport,
  SupportTxt,
} from '../styled/ExternalServicesSettings';
import {useTranslation} from 'react-i18next';
import {RampSellOrderData} from '../../../../../store/sell-crypto/models/ramp-sell.models';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {ScreenOptions} from '../../../../../styles/tabNavigator';
import {ExternalServiceContainer} from '../styled/ExternalServicesDetails';

export interface RampSettingsProps {
  incomingPaymentRequest: {
    flow?: 'buy' | 'sell';
    rampExternalId: string;
    walletId?: string;
    status?: string;
  };
}

const RampSettings: React.FC = () => {
  const {t} = useTranslation();
  const rampHistory = useSelector(({BUY_CRYPTO}: RootState) => BUY_CRYPTO.ramp);
  const rampSellHistory = useSelector(
    ({SELL_CRYPTO}: RootState) => SELL_CRYPTO.ramp,
  );
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const logger = useLogger();
  const [paymentRequests, setTransactions] = useState([] as RampPaymentData[]);
  const [sellOrders, setSellOrders] = useState([] as RampSellOrderData[]);

  const Tab = createMaterialTopTabNavigator();
  const TabTitle = {
    buy: t('Buy History'),
    sell: t('Sell History'),
  };

  const route = useRoute<RouteProp<{params: RampSettingsProps}>>();
  const {incomingPaymentRequest} = route.params || {};

  const memoizedBuyCryptoHistory = useCallback(
    () => (
      <SettingsComponent style={{marginTop: 20, paddingBottom: 500}}>
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
                    key={pr.external_id}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('RampDetails', {
                        paymentRequest: pr,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {pr.fiat_total_amount} {pr.fiat_total_amount_currency}
                      </PrTxtFiatAmount>
                      {!pr.status ||
                        (pr.status === 'paymentRequestSent' && (
                          <PrTxtStatus>
                            {t('Attempted payment request')}
                          </PrTxtStatus>
                        ))}
                      {pr.status && ['pending'].includes(pr.status) && (
                        <PrTxtStatus>
                          {t('Processing payment request')}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {pr.crypto_amount} {pr.coin}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(pr.created_on).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
          {(!paymentRequests || paymentRequests.length === 0) && (
            <NoPrMsg>
              {t('There are currently no transactions with Ramp Network')}
            </NoPrMsg>
          )}
        </ExternalServiceContainer>
      </SettingsComponent>
    ),
    [paymentRequests],
  );

  const memoizedSellCryptoHistory = useCallback(
    () => (
      <SettingsComponent style={{marginTop: 20, paddingBottom: 500}}>
        <ExternalServiceContainer style={{paddingBottom: 50}}>
          {!!sellOrders?.length && <PrTitle>{t('Sell Orders')}</PrTitle>}
          {sellOrders &&
            sellOrders.length > 0 &&
            sellOrders
              .sort((a, b) => b.created_on - a.created_on)
              .map(so => {
                return (
                  <PrRow
                    key={so.external_id}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('RampSellDetails', {
                        sellOrder: so,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {so.crypto_amount} {so.coin}
                      </PrTxtFiatAmount>
                      {!so.status ||
                      ['created', 'createdOrder'].includes(so.status) ? (
                        <PrTxtStatus>{t('Sell order started')}</PrTxtStatus>
                      ) : null}
                      {so.status ? (
                        <>
                          {['bitpayFromCheckout', 'bitpayTxSent'].includes(
                            so.status,
                          ) && (
                            <PrTxtStatus>
                              {t('Processing sell order')}
                            </PrTxtStatus>
                          )}

                          {so.status === 'released' && (
                            <PrTxtStatus style={{color: '#01d1a2'}}>
                              {t('Sell order completed')}
                            </PrTxtStatus>
                          )}

                          {so.status === 'expired' && (
                            <PrTxtStatus style={{color: '#df5264'}}>
                              {t('Sell order expired')}
                            </PrTxtStatus>
                          )}
                        </>
                      ) : null}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {Number(so.fiat_receiving_amount).toFixed(2)}{' '}
                        {so.fiat_currency}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(so.created_on).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
          {(!sellOrders || sellOrders.length === 0) && (
            <NoPrMsg>
              {t('There are currently no transactions with Ramp Network')}
            </NoPrMsg>
          )}
        </ExternalServiceContainer>
      </SettingsComponent>
    ),
    [sellOrders],
  );

  useEffect(() => {
    if (incomingPaymentRequest?.flow === 'buy') {
      logger.debug(
        `Coming from payment request: rampExternalId: ${incomingPaymentRequest.rampExternalId}`,
      );
    }

    if (incomingPaymentRequest?.flow === 'sell') {
      logger.debug(
        `Coming from sell order: rampExternalId: ${incomingPaymentRequest.rampExternalId}`,
      );
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      const rampPaymentRequests = Object.values(rampHistory).filter(
        pr => pr.env === (__DEV__ ? 'dev' : 'prod'),
      );
      setTransactions(rampPaymentRequests);

      const rampSellOrders = Object.values(rampSellHistory).filter(
        pr => pr.env === (__DEV__ ? 'dev' : 'prod'),
      );
      setSellOrders(rampSellOrders);
    }
  }, [isFocused]);

  return (
    <>
      <SettingsContainer>
        <Tab.Navigator
          initialRouteName={
            incomingPaymentRequest?.flow === 'sell'
              ? TabTitle.sell
              : TabTitle.buy
          }
          screenOptions={{...ScreenOptions()}}>
          <Tab.Screen
            name={TabTitle.buy}
            key={'buy'}
            initialParams={route.params}
            component={memoizedBuyCryptoHistory}
          />
          <Tab.Screen
            name={TabTitle.sell}
            key={'sell'}
            initialParams={route.params}
            component={memoizedSellCryptoHistory}
          />
        </Tab.Navigator>
      </SettingsContainer>
      <FooterSupport>
        <SupportTxt>{t('Having problems with Ramp Network?')}</SupportTxt>
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser(
                'https://support.ramp.network/en/articles/455-get-help-from-ramp-support',
              ),
            );
          }}>
          <Link>{t('Contact the Ramp Network support team.')}</Link>
        </TouchableOpacity>
      </FooterSupport>
    </>
  );
};

export default RampSettings;
