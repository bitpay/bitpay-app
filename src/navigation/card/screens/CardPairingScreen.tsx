import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback} from 'react';
import {CardActions} from '../../../store/card';
import {VirtualDesignCurrency} from '../../../store/card/card.types';
import {useAppDispatch} from '../../../utils/hooks';
import BasePairing from '../../bitpay-id/components/BasePairing';
import {CardScreens, CardStackParamList} from '../CardStack';
import {incomingData} from '../../../store/scan/scan.effects';
import {StackActions, useNavigation} from '@react-navigation/native';

export type CardPairingScreenParamList =
  | {
      secret?: string;
      code?: string;
      dashboardRedirect?: string;
      vcd?: VirtualDesignCurrency;
      paymentUrl?: string;
    }
  | undefined;

const CardPairingScreen: React.FC<
  NativeStackScreenProps<CardStackParamList, CardScreens.PAIRING>
> = props => {
  const {route} = props;
  const {secret, code, paymentUrl, dashboardRedirect} = route.params || {};
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const goToHomeTab = () => {
    const navState = navigation.getState();

    // @ts-ignore
    if (navState.routeNames.some(name => name === 'Home')) {
      navigation.navigate('Tabs', {
        screen: 'Home',
      });
    } else {
      navigation.dispatch(StackActions.replace('Tabs', {screen: 'Home'}));
    }
  };

  const onSuccess = useCallback(() => {
    if (dashboardRedirect) {
      const virtualDesignCurrency = route.params?.vcd as
        | VirtualDesignCurrency
        | undefined;

      dispatch(
        CardActions.virtualDesignCurrencyUpdated(
          virtualDesignCurrency || 'bitpay-b',
        ),
      );
      return;
    }

    goToHomeTab();

    if (paymentUrl) {
      navigation.dispatch(StackActions.replace('Tabs', {screen: 'Home'}));
      //  Reconstructing the url since paymentUrl from deeplink is not in the right format
      if (paymentUrl.includes('bitpay.com')) {
        let url = 'https://';
        url = paymentUrl.includes('test')
          ? `${url}test.bitpay.com`
          : `${url}bitpay.com`;

        const invoiceId = paymentUrl.split('/i/')[1].split('?')[0];
        url = `${url}/i/${invoiceId}`;
        dispatch(incomingData(url));
      }
    }
  }, []);

  const onComplete = useCallback(() => {
    if (!paymentUrl) {
      const navState = navigation.getState();
      // @ts-ignore
      if (navState.routeNames.some(name => name === 'CardHome')) {
        navigation.navigate('Tabs', {
          screen: 'Card',
          params: {screen: 'CardHome'},
        });
      } else {
        navigation.dispatch(StackActions.replace('Card', {screen: 'CardHome'}));
      }
    }
  }, []);

  const onFailure = useCallback(() => {
    if (paymentUrl) {
      goToHomeTab();
    }
  }, []);

  return (
    <BasePairing
      secret={secret}
      code={code}
      onSuccess={onSuccess}
      onComplete={onComplete}
      onFailure={onFailure}
    />
  );
};

export default CardPairingScreen;
