import {useMemo} from 'react';
import {DeviceIntegrityResult, getDeviceIntegrity} from './deviceIntegrity';

// Hook wrapper for warning-tier UI; result is stable for the app session.
export const useDeviceIntegrity = (): DeviceIntegrityResult =>
  useMemo(() => getDeviceIntegrity(), []);
