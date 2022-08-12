import {DOSH_APP_ID} from '@env';
import ReactNative, {DeviceEventEmitter, Platform} from 'react-native';
import {DeviceEmitterEvents} from '../../constants/device-emitter-events';
import DoshUiOptions from './DoshUiOptions';

/**
 * NativeModule bridge to access the iOS or Android SDK methods.
 */
interface DoshModule {
  /**
   * This should be done before any other calls to the PoweredByDosh SDK.
   * TODO: pass in applicationId from JS?
   * @param uiOptions Options to customize the SDK's header title and brand page UI.
   */
  initializeDosh: (id: string, uiOptions: DoshUiOptions) => Promise<boolean>;

  /**
   * User authorization between the app and Dosh is coordinated by providing the SDK with an authorization token.
   * This token should be requested from the BitPay server.
   */
  setDoshToken: (token: string) => Promise<boolean>;

  /**
   * Present a full screen view that is managed by the SDK.
   */
  present: () => Promise<boolean>;

  /**
   * Any time the app's current user changes, such as when the user logs out, the user's information should be cleared.
   */
  clearUser: () => Promise<boolean>;

  /**
   * @deprecated For development purposes only. Do not call this in production.
   * As of now only written for the Android bridge.
   */
  presentIntegrationChecklist: () => Promise<boolean>;
}

/**
 * React JS wrapper for calling the Dosh SDK.
 */
interface Dosh extends Omit<DoshModule, 'initializeDosh'> {
  initializeDosh: (
    uiOptions?: DoshUiOptions,
  ) => ReturnType<DoshModule['initializeDosh']>;
}

const DoshModule = ReactNative.NativeModules.Dosh as DoshModule;

const Dosh: Dosh = (() => {
  let wasInit = false;

  return {
    async initializeDosh(uiOptions?: DoshUiOptions) {
      const _uiOptions: DoshUiOptions = {
        feedTitle: 'Dosh Rewards',
        logoStyle: 'CIRCLE',
        brandDetailsHeaderStyle: 'RECTANGLE',

        ...(uiOptions || {}),
      };

      const success = await DoshModule.initializeDosh(DOSH_APP_ID, _uiOptions);
      wasInit = true;
      DeviceEventEmitter.emit(DeviceEmitterEvents.DOSH_INITIALIZED, success);
      return success;
    },

    setDoshToken(token: string) {
      return DoshModule.setDoshToken(token);
    },

    present() {
      return new Promise((res, rej) => {
        if (!wasInit) {
          const sub = DeviceEventEmitter.addListener(
            DeviceEmitterEvents.DOSH_INITIALIZED,
            success => {
              sub.remove();

              if (success) {
                res(DoshModule.present());
              } else {
                rej(false);
              }
            },
          );
        }

        return res(DoshModule.present());
      });
    },

    clearUser() {
      // TODO: iOS bridge method, let it throw for now
      return DoshModule.clearUser();
    },

    presentIntegrationChecklist() {
      if (Platform.OS === 'android') {
        return DoshModule.presentIntegrationChecklist();
      }

      // TODO: iOS bridge method, if exists. Since this is dev only, just resolve without error.
      return Promise.resolve(true);
    },
  };
})();

export default Dosh;
