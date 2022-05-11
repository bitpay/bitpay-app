import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect} from 'react';
import styled from 'styled-components/native';
import Spinner from '../../../components/spinner/Spinner';
import {ScreenGutter} from '../../../components/styled/Containers';
import {AppActions} from '../../../store/app';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {CardActions} from '../../../store/card';
import {VirtualDesignCurrency} from '../../../store/card/card.types';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {CardStackParamList} from '../CardStack';

export type CardPairingScreenParamList =
  | {
      secret?: string;
      code?: string;
      dashboardRedirect?: string;
      vcd?: VirtualDesignCurrency;
    }
  | undefined;

const PairingContainer = styled.View`
  padding: ${ScreenGutter};
  align-items: center;
`;

const SpinnerWrapper = styled.View`
  margin-top: 20px;
`;

const CardPairingScreen: React.FC<
  StackScreenProps<CardStackParamList, 'Pairing'>
> = props => {
  const {navigation, route} = props;
  const {secret, code} = route.params || {};

  const dispatch = useAppDispatch();
  const pairingStatus = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.pairingBitPayIdStatus,
  );
  const pairingError = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.pairingBitPayIdError || '',
  );

  useEffect(() => {
    if (secret) {
      dispatch(BitPayIdEffects.startDeeplinkPairing(secret, code));
    } else {
      const goToCardHome = () => {
        navigation.replace('CardHome');
      };

      dispatch(
        AppActions.showBottomNotificationModal({
          title: 'Pairing failed',
          message: 'No pairing data received.',
          type: 'warning',
          actions: [
            {
              text: 'OK',
              action: goToCardHome,
            },
          ],
          enableBackdropDismiss: true,
          onBackdropDismiss: goToCardHome,
        }),
      );
    }
  }, [dispatch, navigation, secret, code]);

  useEffect(() => {
    if (pairingStatus) {
      const goToCardHome = () => {
        navigation.replace('CardHome');
        dispatch(BitPayIdActions.updatePairingBitPayIdStatus(null));
      };

      if (pairingStatus === 'success') {
        const virtualDesignCurrency = route.params?.vcd as
          | VirtualDesignCurrency
          | undefined;

        dispatch(
          CardActions.virtualDesignCurrencyUpdated(
            virtualDesignCurrency || 'bitpay-b',
          ),
        );

        goToCardHome();
      } else if (pairingStatus === 'failed') {
        dispatch(
          AppActions.showBottomNotificationModal({
            type: 'error',
            title: 'Pairing failed',
            message: pairingError,
            actions: [
              {
                primary: true,
                action: goToCardHome,
                text: 'OK',
              },
            ],
            enableBackdropDismiss: true,
            onBackdropDismiss: goToCardHome,
          }),
        );
      }
    }
  }, [dispatch, navigation, route, pairingStatus, pairingError]);

  return (
    <PairingContainer>
      <SpinnerWrapper>
        <Spinner size={60} />
      </SpinnerWrapper>
    </PairingContainer>
  );
};

export default CardPairingScreen;
