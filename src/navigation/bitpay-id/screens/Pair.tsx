import {RouteProp, useRoute} from '@react-navigation/core';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import AlertBox from '../../../components/alert-box/AlertBox';
import {ScreenGutter} from '../../../components/styled/Containers';
import {navigationRef} from '../../../Root';
import {RootState} from '../../../store';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {PairingBitPayIdStatus} from '../../../store/bitpay-id/bitpay-id.reducer';
import {CardActions} from '../../../store/card';
import {VirtualDesignCurrency} from '../../../store/card/card.types';
import {BitpayIdStackParamList} from '../BitpayIdStack';

export type PairScreenParamList =
  | {
      secret?: string;
      code?: string;
      dashboardRedirect?: string;
      vcd?: VirtualDesignCurrency;
    }
  | undefined;

type PairScreenProps = StackScreenProps<BitpayIdStackParamList, 'Pair'>;

const PairingContainer = styled.View`
  padding: ${ScreenGutter};
`;

const Pair: React.FC<PairScreenProps> = ({navigation}) => {
  const dispatch = useDispatch();
  const route = useRoute<RouteProp<BitpayIdStackParamList, 'Pair'>>();
  const pairingStatus = useSelector<RootState, PairingBitPayIdStatus>(
    ({BITPAY_ID}) => BITPAY_ID.pairingBitPayIdStatus,
  );
  const pairingError = useSelector<RootState, string>(
    ({BITPAY_ID}) => BITPAY_ID.pairingBitPayIdError || '',
  );

  const {secret, code} = route.params || {};
  const virtualDesignCurrency = route.params?.vcd as
    | VirtualDesignCurrency
    | undefined;
  const dashboardRedirect = Boolean(route.params?.dashboardRedirect);

  useEffect(() => {
    if (secret) {
      dispatch(BitPayIdEffects.startDeeplinkPairing(secret, code));
    }
  }, [dispatch, secret, code]);

  useEffect(() => {
    if (pairingStatus === 'success') {
      if (dashboardRedirect) {
        navigationRef.navigate('Card', {screen: 'Home'});
      } else {
        navigation.navigate('Profile');
      }

      dispatch(
        CardActions.virtualDesignCurrencyUpdated(
          virtualDesignCurrency || 'bitpay-b',
        ),
      );
      dispatch(BitPayIdActions.updatePairingBitPayIdStatus(null));
    }
  }, [
    navigation,
    dispatch,
    pairingStatus,
    dashboardRedirect,
    virtualDesignCurrency,
  ]);

  return (
    <PairingContainer>
      {!secret ? (
        <AlertBox type="warning">No pairing data received.</AlertBox>
      ) : pairingStatus === 'failed' ? (
        <AlertBox type="warning">
          Pairing failed: {pairingError || 'An unexpected error occurred.'}
        </AlertBox>
      ) : null}
    </PairingContainer>
  );
};

export default Pair;
