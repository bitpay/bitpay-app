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
import {SimplexPaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
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
import {SimplexSellOrderData} from '../../../../../store/sell-crypto/models/simplex-sell.models';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import CustomTabBar from '../../../../../components/custom-tab-bar/CustomTabBar';
import {ExternalServiceContainer} from '../styled/ExternalServicesDetails';

export interface SimplexSettingsProps {
  incomingPaymentRequest: {
    flow?: 'buy' | 'sell';
    success?: string;
    paymentId?: string;
    quoteId?: string;
    userId?: string;
    externalId?: string;
    transactionId?: string;
  };
}

const SimplexSettings: React.FC = () => {
  const {t} = useTranslation();
  const simplexHistory = useSelector(
    ({BUY_CRYPTO}: RootState) => BUY_CRYPTO.simplex,
  );
  const simplexSellHistory = useSelector(
    ({SELL_CRYPTO}: RootState) => SELL_CRYPTO.simplex,
  );
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const logger = useLogger();
  const [paymentRequests, setTransactions] = useState(
    [] as SimplexPaymentData[],
  );
  const [sellOrders, setSellOrders] = useState([] as SimplexSellOrderData[]);

  const Tab = createMaterialTopTabNavigator();
  const TabTitle = {
    buy: t('Buy History'),
    sell: t('Sell History'),
  };

  const route = useRoute<RouteProp<{params: SimplexSettingsProps}>>();
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
                    key={pr.payment_id}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('SimplexDetails', {
                        paymentRequest: pr,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {pr.fiat_total_amount} {pr.fiat_total_amount_currency}
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
                          {t('Attempted payment request')}
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
              {t('There are currently no transactions with Simplex')}
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
                      navigation.navigate('SimplexSellDetails', {
                        sellOrder: so,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {so.crypto_amount} {so.coin}
                      </PrTxtFiatAmount>
                      {!so.status ? (
                        <PrTxtStatus>{t('Sell order started')}</PrTxtStatus>
                      ) : null}
                      {so.status &&
                      ['bitpayFromCheckout', 'bitpayTxSent'].includes(
                        so.status,
                      ) ? (
                        <PrTxtStatus>{t('Processing sell order')}</PrTxtStatus>
                      ) : (
                        <PrTxtStatus>{t('Sell order started')}</PrTxtStatus>
                      )}
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
              {t('There are currently no transactions with Simplex')}
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
        `Coming from payment request: ExternalID: ${
          incomingPaymentRequest.externalId
        }${
          incomingPaymentRequest.transactionId
            ? ` - TransactionID: ${incomingPaymentRequest.transactionId}`
            : ''
        }`,
      );
    }

    if (incomingPaymentRequest?.flow === 'sell') {
      logger.debug(
        `Coming from sell order: ExternalID: ${
          incomingPaymentRequest.externalId
        }${
          incomingPaymentRequest.transactionId
            ? ` - TransactionID: ${incomingPaymentRequest.transactionId}`
            : ''
        }`,
      );
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      const simplexPaymentRequests = Object.values(simplexHistory).filter(
        pr => pr.env === (__DEV__ ? 'dev' : 'prod'),
      );
      setTransactions(simplexPaymentRequests);

      const simplexSellOrders = Object.values(simplexSellHistory).filter(
        pr => pr.env === (__DEV__ ? 'dev' : 'prod'),
      );
      setSellOrders(simplexSellOrders);
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
          tabBar={props => <CustomTabBar {...props} />}>
          <Tab.Screen
            name={TabTitle.buy}
            initialParams={route.params}
            component={memoizedBuyCryptoHistory}
          />
          <Tab.Screen
            name={TabTitle.sell}
            initialParams={route.params}
            component={memoizedSellCryptoHistory}
          />
        </Tab.Navigator>
      </SettingsContainer>
      <FooterSupport>
        <SupportTxt>{t('Having problems with Simplex?')}</SupportTxt>
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser('https://www.simplex.com/support/'),
            );
          }}>
          <Link>{t('Contact the Simplex support team.')}</Link>
        </TouchableOpacity>
      </FooterSupport>
    </>
  );
};

export default SimplexSettings;
