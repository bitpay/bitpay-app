import {
  LockedDeviceError,
  TransportStatusError,
  StatusCodes,
} from '@ledgerhq/errors';
import Transport from '@ledgerhq/hw-transport';
import {Permission, PermissionsAndroid} from 'react-native';
import {IS_ANDROID} from '../../../constants';

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
  | 'Ethereum Goerli'
  | 'XRP'
  | 'Bitcoin Cash'
  | 'Litecoin'
  | 'Dogecoin'
  | 'Polygon';

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
  if (isLockedDeviceError(err)) {
    return 'Unlock device to continue.';
  } else if (isTransportStatusError(err)) {
    if (Number(err.statusCode) === UNKNOWN_ERROR) {
      return 'An unknown error was returned by the transport.';
    } else if (Number(err.statusCode) === StatusCodes.CLA_NOT_SUPPORTED) {
      return 'Command not supported, make sure the correct app is open and the app and Ledger firmware is up to date.';
    } else if (Number(err.statusCode) === StatusCodes.USER_REFUSED_ON_DEVICE) {
      return 'User refused command on device.';
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
      p => permissions[p] === 'granted',
    );

    missingPermissions = REQUIRED_PERMISSIONS_BLE_ANDROID.filter(
      p => permissions[p] !== 'granted',
    );
  }

  return {
    isAuthorized,
    missingPermissions,
  };
};
