import {
  LockedDeviceError,
  TransportStatusError,
  StatusCodes,
} from '@ledgerhq/errors';
import Transport from '@ledgerhq/hw-transport';
import {Permission, PermissionsAndroid} from 'react-native';
import {IS_ANDROID} from '../../../constants';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import TransportHID from '@ledgerhq/react-native-hid';
import {LISTEN_TIMEOUT, OPEN_TIMEOUT} from '../../../constants/config';

const UNKNOWN_ERROR = 0x650f;

type TransportStatusError = Error & {
  statusCode: string;
  statusText: string;
};

type DisconnectedDeviceError = Error & {};

export type SupportedLedgerAppNames =
  | 'Bitcoin'
  | 'Bitcoin Test'
  | 'Bitcoin Legacy'
  | 'Bitcoin Test Legacy'
  | 'Ethereum'
  | 'Ethereum Sepolia'
  | 'XRP'
  | 'Bitcoin Cash'
  | 'Litecoin'
  | 'Dogecoin'
  | 'Polygon'
  | 'Polygon Amoy';

/**
 * Gets info on the currently running Ledger app. The OS info is returned if no app is running.
 *
 * @returns App name, version, and flags.
 */
export const getCurrentLedgerAppInfo = async (transport: Transport) => {
  const r = await transport.send(0xb0, 0x01, 0x00, 0x00);
  let i = 0;
  const format = r[i++];

  if (format !== 1) {
    throw new Error('getAppAndVersion: format not supported');
  }

  const nameLength = r[i++];
  const name = r.slice(i, (i += nameLength)).toString('ascii');
  const versionLength = r[i++];
  const version = r.slice(i, (i += versionLength)).toString('ascii');
  const flagLength = r[i++];
  const flags = r.slice(i, (i += flagLength));
  return {
    name,
    version,
    flags,
  };
};

/**
 * Opens the requested app on the Ledger.
 *
 * @returns Status code
 *
 * 0x670A: Length of app name is 0 when app name is required.
 *
 * 0x6807: The requested application is not present.
 *
 * 0x9000: Success
 *
 * Other : An application is already launched on the product.
 */
export const openLedgerApp = (
  transport: Transport,
  name: SupportedLedgerAppNames,
) => {
  const statusList = [StatusCodes.OK, 0x670a, 0x6807];
  return transport.send(
    0xe0,
    0xd8,
    0x00,
    0x00,
    Buffer.from(name, 'ascii'),
    statusList,
  );
};

/**
 * Silently quits the currently running Ledger app or no-op if no app is running.
 *
 * @returns Status code OK
 */
export const quitLedgerApp = (transport: Transport) => {
  return transport.send(0xb0, 0xa7, 0x00, 0x00);
};

export const isLockedDeviceError = (
  e: any,
): e is typeof LockedDeviceError & Error => {
  return e?.name === 'LockedDeviceError';
};

export const isTransportStatusError = (e: any): e is TransportStatusError => {
  return e?.name === 'TransportStatusError';
};

export const isDisconnectedDeviceError = (
  e: any,
): e is DisconnectedDeviceError => {
  return e?.name === 'DisconnectedDevice';
};

export const getLedgerErrorMessage = (err: any) => {
  if (err === 'user denied transaction') {
    return err;
  } else if (isLockedDeviceError(err)) {
    return 'Unlock your Ledger device to continue.';
  } else if (isTransportStatusError(err)) {
    if (Number(err.statusCode) === UNKNOWN_ERROR) {
      return 'An unknown error was returned by the transport.';
    } else if (Number(err.statusCode) === StatusCodes.CLA_NOT_SUPPORTED) {
      return 'Command not supported, make sure the correct app is open and the app and Ledger firmware is up to date.';
    } else if (Number(err.statusCode) === StatusCodes.USER_REFUSED_ON_DEVICE) {
      return 'User refused command on device.';
    } else if (Number(err.statusCode) === StatusCodes.UNKNOWN_APDU) {
      return 'Communication failed. This error could indicate a compatibility issue, a firmware bug, or a problem with the software sending the command.';
    }

    return err.message;
  } else if (isDisconnectedDeviceError(err)) {
    return 'Device was disconnected. Reconnect the device and try again.';
  } else if (err instanceof Error) {
    return err.message;
  } else {
    return `An unexpected error occurred: ${JSON.stringify(err)}`;
  }
};

const REQUIRED_PERMISSIONS_BLE_ANDROID = [
  PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
  PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
];

/**
 * Check bluetooth permissions
 */
export const checkPermissionsBLE = async (): Promise<{
  isAuthorized: boolean;
  missingPermissions?: Permission[];
}> => {
  let isAuthorized = true;
  let missingPermissions: Permission[] = [];

  if (IS_ANDROID) {
    const permissions = await PermissionsAndroid.requestMultiple(
      REQUIRED_PERMISSIONS_BLE_ANDROID,
    );

    isAuthorized = REQUIRED_PERMISSIONS_BLE_ANDROID.every(
      p => permissions[p] === 'granted' || permissions[p] === 'never_ask_again',
    );

    missingPermissions = REQUIRED_PERMISSIONS_BLE_ANDROID.filter(
      p => permissions[p] !== 'granted' && permissions[p] !== 'never_ask_again',
    );
  }

  return {
    isAuthorized,
    missingPermissions,
  };
};

/**
 * Closes the current Ledger app and prompts the user to open the correct app
 * if needed.
 *
 * Closing and opening apps causes disconnects, so if the requested app is
 * not open there may be some wait time involved while trying to reconnect.
 *
 * @param appName
 * @param transportRef
 * @param setHardwareWalletTransport
 * @param onDisconnect
 * @param setPromptOpenAppState
 */
export const prepareLedgerApp = async (
  appName: SupportedLedgerAppNames,
  transportRef: React.RefObject<Transport | null>,
  setHardwareWalletTransport: React.Dispatch<
    React.SetStateAction<Transport | null>
  >,
  onDisconnect: () => Promise<void>,
  setPromptOpenAppState: (state: boolean) => void,
) => {
  const info = await getCurrentLedgerAppInfo(transportRef.current!);
  const anAppIsOpen = info.name !== 'BOLOS'; // BOLOS is the Ledger OS
  const isCorrectAppOpen = info.name === appName;

  // either another app is open or no apps are open
  if (!isCorrectAppOpen) {
    // different app must be running, close it
    if (anAppIsOpen) {
      await onRequestQuitApp(
        transportRef.current!,
        setHardwareWalletTransport,
        onDisconnect,
      );
    }

    // prompt the user to open the corresponding app on the Ledger
    try {
      // display a prompt on the Ledger to open the correct app
      setPromptOpenAppState(true);
      const openAppResult = await onRequestOpenApp(
        transportRef.current!,
        appName,
        setHardwareWalletTransport,
        onDisconnect,
      );
      const statusCode = openAppResult.readUInt16BE(openAppResult.length - 2);
      if (statusCode === StatusCodes.OK) {
        // app opened successfully!
      } else if (statusCode === 0x6807) {
        throw new Error(
          `The ${appName} app is required on your Ledger device to continue.`,
        );
      } else {
        throw new Error(
          `An unknown status code was returned: 0x${statusCode.toString(16)}.`,
        );
      }
    } catch (err: any) {
      if (err.statusCode === 21761) {
        // Something went wrong, did the user reject? ignore
        throw 'user denied transaction';
      }
      throw err;
    } finally {
      setPromptOpenAppState(false);
    }
  } else {
    // correct app is installed and open on the device
  }
};

const onRequestOpenApp = (
  transport: Transport,
  name: SupportedLedgerAppNames,
  setHardwareWalletTransport: (transport: Transport | null) => void,
  onDisconnect: () => Promise<void>,
) => {
  return new Promise<Buffer>(async (resolve, reject) => {
    let res = Buffer.alloc(0);

    // Opening an app will cause a disconnect so replace the main listener
    // with a temp listener, then resolve once we handle the reconnect
    transport.off('disconnect', onDisconnect);

    const tempCb = async () => {
      let newTp: Transport | null = null;

      if (transport instanceof TransportBLE) {
        newTp = await TransportBLE.create(OPEN_TIMEOUT, LISTEN_TIMEOUT);
      } else if (transport instanceof TransportHID) {
        newTp = await TransportHID.create(OPEN_TIMEOUT, LISTEN_TIMEOUT);
      }

      if (newTp) {
        newTp.on('disconnect', onDisconnect);
        setHardwareWalletTransport(newTp);
        resolve(res);
      } else {
        reject();
      }
    };

    transport.on('disconnect', tempCb);

    try {
      res = await openLedgerApp(transport, name);

      const statusCode = res.readUInt16BE(res.length - 2);

      // if not OK, we won't his the disconnect logic so restore the handler and resolve
      if (statusCode !== StatusCodes.OK) {
        transport.off('disconnect', tempCb);
        transport.on('disconnect', onDisconnect);
        resolve(res);
      }
    } catch (err) {
      transport.off('disconnect', tempCb);
      transport.on('disconnect', onDisconnect);
      reject(err);
    }
  });
};

/**
 * Quit the currently running Ledger app (if any) when requested by a child component, and resolve once any reconnects are handled.
 *
 * @param transport
 * @returns Promise void
 */
const onRequestQuitApp = (
  transport: Transport,
  setHardwareWalletTransport: (transport: Transport | null) => void,
  onDisconnect: () => Promise<void>,
) => {
  return new Promise<void>(async (resolve, reject) => {
    // get info for the currently running Ledger app
    const info = await getCurrentLedgerAppInfo(transport);

    // BOLOS is the Ledger OS
    // if we get this back, no apps are open and we can resolve immediately
    if (info.name === 'BOLOS') {
      resolve();
      return;
    }

    // Quitting an app will cause a disconnect so replace the main listener
    // with a temp listener, then resolve once we handle the reconnect.
    transport.off('disconnect', onDisconnect);

    const cb = async () => {
      let newTp: Transport | null = null;

      if (transport instanceof TransportBLE) {
        newTp = await TransportBLE.create(OPEN_TIMEOUT, LISTEN_TIMEOUT);
      } else if (transport instanceof TransportHID) {
        newTp = await TransportHID.create(OPEN_TIMEOUT, LISTEN_TIMEOUT);
      }

      if (newTp) {
        newTp.on('disconnect', onDisconnect);
        setHardwareWalletTransport(newTp);
        resolve();
      } else {
        reject();
      }
    };

    transport.on('disconnect', cb);

    try {
      // this should always succeed
      await quitLedgerApp(transport);
    } catch (err) {
      transport.off('disconnect', cb);
      transport.on('disconnect', onDisconnect);
      reject(err);
    }
  });
};
