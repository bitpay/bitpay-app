import {AppEffects} from '../../store/app';
import useAppDispatch from './useAppDispatch';

/**
 * Returns a function that requests tracking permissions before executing a provided callback.
 * @param appInit Whether this function is being called for the first time since opening the app.
 * @returns Handler function.
 */
export const useRequestTrackingPermissionHandler = (appInit?: boolean) => {
  const dispatch = useAppDispatch();

  return async <T>(callback: () => T) => {
    await dispatch(AppEffects.askForTrackingPermissionAndEnableSdks(appInit));

    return callback();
  };
};

export default useRequestTrackingPermissionHandler;
