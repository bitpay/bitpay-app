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
  const [status, setStatus] = useState({
    status: 'searching',
    message: '',
    title: '',
  });

  const onConnectBle = async () => {
    setTransportType('ble');
    setIsSearching(true);
    setStatus({
      status: 'searching',
      message:
        'Double-check that Bluetooth is enabled and your hardware wallet is unlocked to proceed.',
      title: 'Searching for Devices',
    });

    let openedTransport: Transport | null = null;
    let errorMsg = '';

    const {isAuthorized} = await checkPermissionsBLE();

    if (!isAuthorized) {
      setStatus({
        status: 'failed',
        message: 'App is not authorized to use Bluetooth.',
        title: 'Connection Failed',
      });
      await sleep(7000);
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
      setStatus({
        status: 'success',
        message: 'Your Ledger device was successfully connected.',
        title: 'Successful Connection',
      });
      await sleep(7000);
      props.onPaired(openedTransport);
    } else {
      setStatus({
        status: 'failed',
        message:
          'Ledger device not found. Please restart your Bluetooth and check the device is in range.',
        title: 'Connection Failed',
      });
      await sleep(7000);
    }

    setIsSearching(false);
  };

  const onConnectHid = async () => {
    setTransportType('hid');
    setIsSearching(true);
    setStatus({
      status: 'searching',
      message:
        'Double-check that the USB cable is securely connected and your hardware wallet is unlocked to proceed.',
      title: 'Searching for Devices',
    });

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
      setStatus({
        status: 'success',
        message: 'Your Ledger device was successfully connected.',
        title: 'Successful Connection',
      });
      await sleep(7000);
      props.onPaired(openedTransport);
    } else {
      setStatus({
        status: 'failed',
        message: `Unable to connect via USB: ${errorMsg}`,
        title: 'Connection Failed',
      });
      await sleep(7000);
    }

    setIsSearching(false);
  };

  return (
    <>
      {isSearching ? (
        <SearchingForDevices transportType={transportType} status={status} />
      ) : (
        <LedgerIntro onConnectBle={onConnectBle} onConnectHid={onConnectHid} />
      )}
    </>
  );
};
