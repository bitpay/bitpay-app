import {StackScreenProps} from '@react-navigation/stack';
import React, {useCallback} from 'react';
import {CardActions} from '../../../store/card';
import {VirtualDesignCurrency} from '../../../store/card/card.types';
import {useAppDispatch} from '../../../utils/hooks';
import BasePairing from '../../bitpay-id/components/BasePairing';
import {CardScreens, CardStackParamList} from '../CardStack';

export type CardPairingScreenParamList =
  | {
      secret?: string;
      code?: string;
      dashboardRedirect?: string;
      vcd?: VirtualDesignCurrency;
    }
  | undefined;

const CardPairingScreen: React.FC<
  StackScreenProps<CardStackParamList, CardScreens.PAIRING>
> = props => {
  const {navigation, route} = props;
  const {secret, code} = route.params || {};

  const dispatch = useAppDispatch();

  const onSuccess = useCallback(() => {
    const virtualDesignCurrency = route.params?.vcd as
      | VirtualDesignCurrency
      | undefined;

    dispatch(
      CardActions.virtualDesignCurrencyUpdated(
        virtualDesignCurrency || 'bitpay-b',
      ),
    );
  }, [dispatch, route.params?.vcd]);

  const onComplete = useCallback(() => {
    const navState = navigation.getState();

    if (navState.routes.some(r => r.name === 'CardHome')) {
      navigation.navigate('CardHome');
    } else {
      navigation.replace('CardHome');
    }
  }, [navigation]);

  return (
    <BasePairing
      secret={secret}
      code={code}
      onSuccess={onSuccess}
      onComplete={onComplete}
    />
  );
};

export default CardPairingScreen;
