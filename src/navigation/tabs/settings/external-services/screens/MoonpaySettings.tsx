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
import {MoonpayPaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
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
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {MoonpaySellOrderData} from '../../../../../store/sell-crypto/models/moonpay-sell.models';
import CustomTabBar from '../../../../../components/custom-tab-bar/CustomTabBar';
import {ExternalServiceContainer} from '../styled/ExternalServicesDetails';

export interface MoonpaySettingsProps {
  incomingPaymentRequest?: {
    externalId: string;
    flow: 'buy' | 'sell';
    transactionId?: string;
    status?: string;
  };
}

const MoonpaySettings: React.FC = () => {
  const {t} = useTranslation();
  const moonpayHistory = useSelector(
    ({BUY_CRYPTO}: RootState) => BUY_CRYPTO.moonpay,
  );
  const moonpaySellHistory = useSelector(
    ({SELL_CRYPTO}: RootState) => SELL_CRYPTO.moonpay,
  );
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const logger = useLogger();
  const [paymentRequests, setTransactions] = useState(
    [] as MoonpayPaymentData[],
  );
  const [sellOrders, setSellOrders] = useState([] as MoonpaySellOrderData[]);
  const Tab = createMaterialTopTabNavigator();
  const TabTitle = {
    buy: t('Buy History'),
    sell: t('Sell History'),
  };

  const route = useRoute<RouteProp<{params: MoonpaySettingsProps}>>();
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
                      navigation.navigate('MoonpayDetails', {
                        paymentRequest: pr,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {pr.fiat_total_amount} {pr.fiat_total_amount_currency}
                      </PrTxtFiatAmount>
                      {pr.status === 'failed' && (
                        <PrTxtStatus style={{color: '#df5264'}}>
                          {t('Payment request failed')}
                        </PrTxtStatus>
                      )}
                      {pr.status === 'completed' && (
                        <PrTxtStatus style={{color: '#01d1a2'}}>
                          {t('Payment request completed')}
                        </PrTxtStatus>
                      )}
                      {!pr.status ||
                        (pr.status === 'paymentRequestSent' && (
                          <PrTxtStatus>
                            {t('Attempted payment request')}
                          </PrTxtStatus>
                        ))}
                      {pr.status &&
                        [
                          'waitingPayment',
                          'pending',
                          'waitingAuthorization',
                        ].includes(pr.status) && (
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
              {t('There are currently no transactions with Moonpay')}
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
                      navigation.navigate('MoonpaySellDetails', {
                        sellOrder: so,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {so.crypto_amount} {so.coin}
                      </PrTxtFiatAmount>
                      {so.status === 'failed' && (
                        <PrTxtStatus style={{color: '#df5264'}}>
                          {t('Sell order failed')}
                        </PrTxtStatus>
                      )}
                      {so.status === 'bitpayCanceled' && (
                        <PrTxtStatus style={{color: '#df5264'}}>
                          {t('Sell order canceled')}
                        </PrTxtStatus>
                      )}
                      {so.status &&
                        ['waitingForDeposit', 'bitpayPending'].includes(
                          so.status,
                        ) && (
                          <PrTxtStatus>{t('Waiting for deposit')}</PrTxtStatus>
                        )}
                      {so.status === 'completed' && (
                        <PrTxtStatus style={{color: '#01d1a2'}}>
                          {t('Sell order completed')}
                        </PrTxtStatus>
                      )}
                      {!so.status ||
                        (so.status === 'createdOrder' && (
                          <PrTxtStatus>{t('Sell order started')}</PrTxtStatus>
                        ))}
                      {so.status &&
                        ['pending', 'bitpayTxSent'].includes(so.status) && (
                          <PrTxtStatus>
                            {t('Processing sell order')}
                          </PrTxtStatus>
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
              {t('There are currently no transactions with Moonpay')}
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
      const moonpayPaymentRequests = Object.values(moonpayHistory).filter(
        pr => pr.env === (__DEV__ ? 'dev' : 'prod'),
      );
      setTransactions(moonpayPaymentRequests);

      const moonpaySellOrders = Object.values(moonpaySellHistory).filter(
        pr => pr.env === (__DEV__ ? 'dev' : 'prod'),
      );
      setSellOrders(moonpaySellOrders);
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
        <SupportTxt>{t('Having problems with Moonpay?')}</SupportTxt>
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser(
                'https://support.moonpay.com/hc/en-gb/requests/new',
              ),
            );
          }}>
          <Link>{t('Contact the Moonpay support team.')}</Link>
        </TouchableOpacity>
      </FooterSupport>
    </>
  );
};

export default MoonpaySettings;
