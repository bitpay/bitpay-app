import {
  NativeModules,
  Platform,
  Share,
  ShareContent,
  ShareOptions as RNShareOptions,
} from 'react-native';
import RNShare, {ShareOptions} from 'react-native-share';
import {AppActions} from '../store/app';
import {LOCK_AUTHORIZED_TIME} from '../constants/Lock';
import {AppDispatch} from './hooks/useAppDispatch';

const {Timer} = NativeModules;

const extendLockIfAndroid = async (dispatch: AppDispatch) => {
  if (Platform.OS === 'android') {
    const timeSinceBoot = await Timer.getRelativeTime();
    dispatch(
      AppActions.lockAuthorizedUntil(
        Number(timeSinceBoot) + LOCK_AUTHORIZED_TIME,
      ),
    );
  }
};

export const shareNative =
  (content: ShareContent, options?: RNShareOptions) =>
  async (dispatch: AppDispatch) => {
    await extendLockIfAndroid(dispatch);
    return Share.share(content, options);
  };

export const shareFile =
  (options: ShareOptions) => async (dispatch: AppDispatch) => {
    await extendLockIfAndroid(dispatch);
    return RNShare.open(options);
  };
