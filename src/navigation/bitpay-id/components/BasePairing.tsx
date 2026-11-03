import React, {useEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';
import {SafeAreaView, View, ViewProps, StyleSheet} from 'react-native';
import Spinner from '../../../components/spinner/Spinner';
import {ScreenGutter} from '../../../components/styled/Containers';
import {RootState} from '../../../store';
import {AppActions} from '../../../store/app';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {PairingBitPayIdStatus} from '../../../store/bitpay-id/bitpay-id.reducer';

type BasePairingParamList = {
  secret?: string;
  code?: string;
  onSuccess?: (...args: any[]) => any;
  onFailure?: (...args: any[]) => any;
  onComplete?: (...args: any[]) => any;
};

const styles = StyleSheet.create({
  pairingContainer: {
    padding: parseInt(ScreenGutter, 10),
    alignItems: 'center',
  },
  spinnerWrapper: {
    marginTop: 20,
  },
});

const PairingContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SafeAreaView>) => (
  <SafeAreaView style={[styles.pairingContainer, style]} {...rest} />
);

const SpinnerWrapper = ({style, ...rest}: ViewProps) => (
  <View style={[styles.spinnerWrapper, style]} {...rest} />
);

const BasePairing = (props: BasePairingParamList) => {
  const {t} = useTranslation();
  const {secret, code, onSuccess, onFailure, onComplete} = props;

  const dispatch = useDispatch();
  const pairingStatus = useSelector<RootState, PairingBitPayIdStatus>(
    ({BITPAY_ID}) => BITPAY_ID.pairingBitPayIdStatus,
  );
  const pairingError = useSelector<RootState, string>(
    ({BITPAY_ID}) => BITPAY_ID.pairingBitPayIdError || '',
  );

  const hasSession = useSelector<RootState, boolean>(
    ({APP, BITPAY_ID}) => !!BITPAY_ID.apiToken[APP.network],
  );
  const prompted = useRef(false);

  useEffect(() => {
    if (prompted.current) {
      return;
    }
    prompted.current = true;

    const done = () => {
      onFailure?.();
      onComplete?.();
    };

    if (secret) {
      dispatch(
        AppActions.showBottomNotificationModal({
          title: t('Connect BitPay ID'),
          message: hasSession
            ? t(
                'A link is asking to connect a BitPay ID and replace the account currently signed in on this device. Only continue if you started this action yourself.',
              )
            : t(
                'A link is asking to connect a BitPay ID to this app. Only continue if you started this action yourself.',
              ),
          type: 'warning',
          actions: [
            {
              text: t('Connect'),
              action: () =>
                dispatch(BitPayIdEffects.startDeeplinkPairing(secret, code)),
            },
            {
              text: t('Cancel'),
              action: done,
            },
          ],
          enableBackdropDismiss: true,
          onBackdropDismiss: done,
        }),
      );
    } else {
      dispatch(
        AppActions.showBottomNotificationModal({
          title: t('Pairing failed'),
          message: t('No pairing data received.'),
          type: 'warning',
          actions: [
            {
              text: t('OK'),
              action: done,
            },
          ],
          enableBackdropDismiss: true,
          onBackdropDismiss: done,
        }),
      );
    }
  }, [dispatch, onFailure, onComplete, secret, code, hasSession, t]);

  useEffect(() => {
    if (pairingStatus) {
      const done = () => {
        onComplete?.();
        dispatch(BitPayIdActions.updatePairingBitPayIdStatus(null));
      };

      const success = () => {
        onSuccess?.();
        done();
      };

      const failure = () => {
        onFailure?.();
        done();
      };

      if (pairingStatus === 'success') {
        success();
      } else if (pairingStatus === 'failed') {
        dispatch(
          AppActions.showBottomNotificationModal({
            type: 'error',
            title: t('Pairing failed'),
            message: pairingError,
            actions: [
              {
                primary: true,
                action: failure,
                text: t('OK'),
              },
            ],
            enableBackdropDismiss: true,
            onBackdropDismiss: failure,
          }),
        );
      }
    }
  }, [
    dispatch,
    onSuccess,
    onFailure,
    onComplete,
    pairingStatus,
    pairingError,
    t,
  ]);

  return (
    <PairingContainer>
      <SpinnerWrapper>
        <Spinner size={78} />
      </SpinnerWrapper>
    </PairingContainer>
  );
};

export default BasePairing;
