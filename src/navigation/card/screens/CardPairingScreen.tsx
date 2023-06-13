import {StackActions} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useCallback} from 'react';
import {RootStacks, navigationRef} from '../../../Root';
import {CardActions} from '../../../store/card';
import {VirtualDesignCurrency} from '../../../store/card/card.types';
import {incomingData} from '../../../store/scan/scan.effects';
import {useAppDispatch} from '../../../utils/hooks';
import BasePairing from '../../bitpay-id/components/BasePairing';
import {TabsScreens} from '../../tabs/TabsStack';
import {CardScreens, CardStackParamList} from '../CardStack';

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
  StackScreenProps<CardStackParamList, CardScreens.PAIRING>
> = props => {
  const {route} = props;
  const {secret, code, paymentUrl, dashboardRedirect} = route.params || {};
  const dispatch = useAppDispatch();

  const goToHomeTab = () => {
    navigationRef.dispatch(StackActions.replace('Tabs', {screen: 'Home'}));
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
      navigationRef.dispatch(StackActions.replace('Tabs', {screen: 'Home'}));
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
      const navState = navigationRef.getState();

      // @ts-ignore
      if (navState.routeNames.some(name => name === RootStacks.TABS)) {
        navigationRef.navigate(RootStacks.TABS, {
          screen: TabsScreens.CARD,
        });
      } else {
        navigationRef.dispatch(StackActions.replace(RootStacks.TABS, {screen: TabsScreens.CARD}));
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
