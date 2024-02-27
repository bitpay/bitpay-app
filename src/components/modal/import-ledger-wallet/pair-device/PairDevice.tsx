import Transport from '@ledgerhq/hw-transport';
import TransportHID from '@ledgerhq/react-native-hid';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import React from 'react';
import {useState} from 'react';
import {LISTEN_TIMEOUT, OPEN_TIMEOUT} from '../../../../constants/config';
import {useAppDispatch} from '../../../../utils/hooks';
import {BleError} from 'react-native-ble-plx';
import {LedgerIntro} from './LedgerIntro';
import {LogActions} from '../../../../store/log';
import {checkPermissionsBLE} from '../utils';
import {DeviceFound} from './DeviceFound';
import {LearnHow} from './LearnHow';
import {PairingError} from './PairingError';
import {SearchingForDevices} from './SearchingForDevices';
import {sleep} from '../../../../utils/helper-methods';

interface Props {
  onPaired: (transport: Transport) => void;
}

const isBleError = (e: any): e is BleError => {
  return e instanceof BleError;
};

const isError = (e: any): e is Error => {
  return e instanceof Error;
};

export const PairDevice: React.FC<Props> = props => {
  const dispatch = useAppDispatch();
  const [isSearching, setIsSearching] = useState(false);
  const [transportType, setTransportType] = useState<'ble' | 'hid' | null>(
    null,
  );
  const [isLearnHowVisible, setLearnHowVisible] = useState(false);
  const [error, setError] = useState('');
  const [transport, setTransport] = useState<Transport | null>(null);

  const onConnectBle = async () => {
    setTransportType('ble');
    setIsSearching(true);
    setError('');

    let openedTransport: Transport | null = null;
    let errorMsg = '';

    const {isAuthorized} = await checkPermissionsBLE();

    if (!isAuthorized) {
      setError('App is not authorized to use Bluetooth.');
      return;
    }

    try {
      const result = await Promise.all([
        TransportBLE.create(OPEN_TIMEOUT, LISTEN_TIMEOUT),
        sleep(5000), // Ensure at least 5 seconds delay for a better user experience
      ]);
      openedTransport = result[0];
    } catch (err) {
      if (isBleError(err)) {
        errorMsg = `Code (Android): ${err.androidErrorCode}, Code (iOS): ${err.iosErrorCode}, message: ${err.message}, reason: ${err.reason}`;
      } else if (isError(err)) {
        errorMsg = err.message;
      } else {
        errorMsg = JSON.stringify(err);
      }

      dispatch(
        LogActions.error('An error occurred creating BLE transport:', errorMsg),
      );
    }

    if (openedTransport) {
      setTransport(openedTransport);
      props.onPaired(openedTransport);
    } else {
      setError(
        `Unable to connect via Bluetooth: ${errorMsg}. If error persist, please attempt to reconnect by enabling the device's Bluetooth option again.`,
      );
    }

    setIsSearching(false);
  };

  const onConnectHid = async () => {
    setTransportType('hid');
    setIsSearching(true);
    setError('');

    let openedTransport: Transport | null = null;
    let errorMsg = '';

    try {
      const result = await Promise.all([
        TransportHID.create(OPEN_TIMEOUT, LISTEN_TIMEOUT),
        sleep(5000), // Ensure at least 5 seconds delay for a better user experience
      ]);
      openedTransport = result[0];
    } catch (err) {
      if (isBleError(err)) {
        errorMsg = `Code (Android): ${err.androidErrorCode}, Code (iOS): ${err.iosErrorCode}, message: ${err.message}, reason: ${err.reason}`;
      } else if (isError(err)) {
        errorMsg = err.message;
      } else {
        errorMsg = JSON.stringify(err);
      }

      dispatch(
        LogActions.error('An error occurred creating HID transport:', errorMsg),
      );
    }

    if (openedTransport) {
      setTransport(openedTransport);
      props.onPaired(openedTransport);
    } else {
      setError(`Unable to connect via USB: ${errorMsg}`);
    }

    setIsSearching(false);
  };

  const onContinue = () => {
    if (transport) {
      props.onPaired(transport);
    }
  };

  const onLearnHow = () => {
    setLearnHowVisible(true);
  };

  return (
    <>
      {/* {transport ? (
        <>
          {isLearnHowVisible ? (
            <LearnHow onContinue={onContinue} />
          ) : (
            <DeviceFound onContinue={onContinue} onLearnHow={onLearnHow} />
          )}
        </>
      ) :  */}
      {error ? (
        <PairingError
          error={error}
          onConnectBle={onConnectBle}
          onConnectHid={onConnectHid}
        />
      ) : isSearching ? (
        <SearchingForDevices transportType={transportType} />
      ) : (
        <LedgerIntro onConnectBle={onConnectBle} onConnectHid={onConnectHid} />
      )}
    </>
  );
};
