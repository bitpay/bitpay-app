import {StackScreenProps} from '@react-navigation/stack';
import React, {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import Spinner from '../../../components/spinner/Spinner';
import {ScreenGutter} from '../../../components/styled/Containers';
import {RootState} from '../../../store';
import {AppActions} from '../../../store/app';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {PairingBitPayIdStatus} from '../../../store/bitpay-id/bitpay-id.reducer';
import {BitpayIdStackParamList} from '../BitpayIdStack';

export type PairScreenParamList =
  | {
      secret?: string;
      code?: string;
    }
  | undefined;

const PairingContainer = styled.View`
  padding: ${ScreenGutter};
  align-items: center;
`;

const SpinnerWrapper = styled.View`
  margin-top: 20px;
`;

const Pair: React.FC<
  StackScreenProps<BitpayIdStackParamList, 'Pair'>
> = props => {
  const {navigation, route} = props;
  const {secret, code} = route.params || {};

  const dispatch = useDispatch();
  const pairingStatus = useSelector<RootState, PairingBitPayIdStatus>(
    ({BITPAY_ID}) => BITPAY_ID.pairingBitPayIdStatus,
  );
  const pairingError = useSelector<RootState, string>(
    ({BITPAY_ID}) => BITPAY_ID.pairingBitPayIdError || '',
  );

  useEffect(() => {
    if (secret) {
      dispatch(BitPayIdEffects.startDeeplinkPairing(secret, code));
    } else {
      const goToProfile = () => {
        navigation.replace('Profile');
      };

      dispatch(
        AppActions.showBottomNotificationModal({
          title: 'Pairing failed',
          message: 'No pairing data received.',
          type: 'warning',
          actions: [
            {
              text: 'OK',
              action: goToProfile,
            },
          ],
          enableBackdropDismiss: true,
          onBackdropDismiss: goToProfile,
        }),
      );
    }
  }, [dispatch, navigation, secret, code]);

  useEffect(() => {
    if (pairingStatus) {
      const goToProfile = () => {
        navigation.replace('Profile');
        dispatch(BitPayIdActions.updatePairingBitPayIdStatus(null));
      };

      if (pairingStatus === 'success') {
        goToProfile();
      } else if (pairingStatus === 'failed') {
        dispatch(
          AppActions.showBottomNotificationModal({
            type: 'error',
            title: 'Pairing failed',
            message: pairingError,
            actions: [
              {
                primary: true,
                action: goToProfile,
                text: 'OK',
              },
            ],
            enableBackdropDismiss: true,
            onBackdropDismiss: goToProfile,
          }),
        );
      }
    }
  }, [dispatch, navigation, pairingStatus, pairingError]);

  return (
    <PairingContainer>
      <SpinnerWrapper>
        <Spinner size={60} />
      </SpinnerWrapper>
    </PairingContainer>
  );
};

export default Pair;
