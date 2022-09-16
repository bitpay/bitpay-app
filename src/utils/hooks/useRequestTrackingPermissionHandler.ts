import {AppEffects} from '../../store/app';
import useAppDispatch from './useAppDispatch';

/**
 * Returns a function that requests tracking permissions before executing a provided callback.
 * @returns Handler function.
 */
export const useRequestTrackingPermissionHandler = () => {
  const dispatch = useAppDispatch();

  return async <T>(callback: () => T) => {
    await dispatch(AppEffects.askForTrackingPermissionAndEnableSdks());

    return callback();
  };
};

export default useRequestTrackingPermissionHandler;
