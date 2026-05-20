import Braze from '@braze/react-native-sdk';
import axios from 'axios';
import {BRAZE_MERGE_AND_DELETE_API_KEY, BRAZE_REST_API_ENDPOINT} from '@env';
import {checkNotifications, RESULTS} from 'react-native-permissions';
import {NativeModules, Platform} from 'react-native';
import {logManager} from '../../managers/LogManager';

const nonCustomAttributes = [
  'country',
  'dateOfBirth',
  'email',
  'firstName',
  'gender',
  'homeCity',
  'language',
  'lastName',
  'phoneNumber',
] as const;

const safeSet = (fn: () => void, attributeName: string) => {
  try {
    fn();
  } catch (error) {
    console.error(`Error setting ${attributeName}:`, error);
  }
};

const setUserAttributes = (attributes: BrazeUserAttributes) => {
  const {
    country,
    dateOfBirth,
    email,
    firstName,
    gender,
    homeCity,
    language,
    lastName,
    phoneNumber,
    ...customAttributes
  } = attributes;

  if (typeof country !== 'undefined') {
    safeSet(() => Braze.setCountry(country), 'country');
  }

  if (typeof dateOfBirth !== 'undefined') {
    const asDate = new Date(dateOfBirth);
    const year = asDate.getFullYear();
    const month = (asDate.getMonth() + 1) as Braze.MonthsAsNumber;
    const day = asDate.getDate();
    safeSet(() => Braze.setDateOfBirth(year, month, day), 'dateOfBirth');
  }

  if (email) {
    safeSet(() => Braze.setEmail(email), 'email');
  }

  if (firstName) {
    safeSet(() => Braze.setFirstName(firstName), 'firstName');
  }

  if (gender) {
    const supportedGenders = ['m', 'f', 'n', 'o', 'p', 'u'];
    const isSupported = supportedGenders.indexOf(gender) > -1;

    if (isSupported) {
      safeSet(
        () =>
          Braze.setGender(gender as Braze.GenderTypes[keyof Braze.GenderTypes]),
        'gender',
      );
    }
  }

  if (homeCity) {
    safeSet(() => Braze.setHomeCity(homeCity), 'homeCity');
  }

  if (language) {
    safeSet(() => Braze.setLanguage(language), 'language');
  }

  if (lastName) {
    safeSet(() => Braze.setLastName(lastName), 'lastName');
  }

  if (phoneNumber) {
    safeSet(() => Braze.setPhoneNumber(phoneNumber), 'phoneNumber');
  }

  Object.entries(customAttributes).forEach(([k, v]) => {
    const isValidCustomAttribute = nonCustomAttributes.indexOf(k as any) < 0;
    if (isValidCustomAttribute) {
      safeSet(
        () => Braze.setCustomUserAttribute(k, v),
        `custom attribute ${k}`,
      );
    }
  });
};

const mergeUsers = async (
  user_to_merge: string,
  user_to_keep: string,
): Promise<any> => {
  const url = 'https://' + BRAZE_REST_API_ENDPOINT + '/users/merge';
  const body = {
    merge_updates: [
      {
        identifier_to_merge: {
          external_id: user_to_merge,
        },
        identifier_to_keep: {
          external_id: user_to_keep,
        },
      },
    ],
  };
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + BRAZE_MERGE_AND_DELETE_API_KEY,
  };
  try {
    const {data} = await axios.post(url, body, {headers});
    return data;
  } catch (err: any) {
    throw err.response?.data?.message || err.message || err;
  }
};

const deleteUser = async (eid: string): Promise<any> => {
  const url = 'https://' + BRAZE_REST_API_ENDPOINT + '/users/delete';
  const body = {
    external_ids: [eid],
  };
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + BRAZE_MERGE_AND_DELETE_API_KEY,
  };
  try {
    const {data} = await axios.post(url, body, {headers});
    return data;
  } catch (err: any) {
    throw err.response?.data?.message || err.message || err;
  }
};

export type BrazeUserAttributes = {
  [K in (typeof nonCustomAttributes)[number]]?: string;
} & Record<string, any>;

export type BrazeStatus = 'idle' | 'initializing' | 'ready' | 'failed';

class BrazeClientWrapper {
  private status: BrazeStatus = 'idle';
  private initPromise: Promise<void> | null = null;
  private initError: unknown = null;
  private lastSeenIdentity: {
    userId?: string;
    attributes?: BrazeUserAttributes;
  } = {};

  async init(): Promise<void> {
    if (this.status === 'ready') {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.status = 'initializing';

    this.initPromise = (async () => {
      try {
        await this.initializeSdk();
        this.status = 'ready';
        this.initError = null;
        logManager.debug('[Braze] initialized successfully');
      } catch (err) {
        this.status = 'failed';
        this.initError = err;
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        logManager.error('[Braze] initialization failed', errMsg);
        throw err;
      } finally {
        if (this.status !== 'initializing') {
          this.initPromise = null;
        }
      }
    })();

    return this.initPromise;
  }

  isReady(): boolean {
    return this.status === 'ready';
  }

  getStatus(): BrazeStatus {
    return this.status;
  }

  getInitError(): unknown {
    return this.initError;
  }

  async identify(
    userId: string | undefined,
    attributes?: BrazeUserAttributes,
  ): Promise<void> {
    if (!(await this.ensureReady())) {
      return;
    }

    if (
      this.lastSeenIdentity.userId === userId &&
      this.lastSeenIdentity.attributes === attributes
    ) {
      return;
    }

    if (userId) {
      Braze.changeUser(userId);
      const {status} = await checkNotifications().catch(() => ({
        status: null,
      }));
      const normalized = status?.toLowerCase?.();
      const granted =
        normalized === RESULTS.GRANTED || normalized === RESULTS.LIMITED;

      if (granted) {
        Braze.requestPushPermission();

        if (Platform.OS === 'ios') {
          await NativeModules.PushPermissionManager.askForPermission();
        }
      }
    }

    if (attributes) {
      setUserAttributes(attributes);
    }

    this.lastSeenIdentity = {
      userId,
      attributes,
    };
  }

  merge(userToMerge: string, userToKeep: string) {
    return mergeUsers(userToMerge, userToKeep);
  }

  delete(eid: string) {
    return deleteUser(eid);
  }

  async screen(name: string, properties: Record<string, any> = {}) {
    if (!(await this.ensureReady())) {
      return;
    }

    const screenName = `Viewed ${name} Screen`;
    Braze.logCustomEvent(screenName, properties);
  }

  async track(eventName: string, properties: Record<string, any> = {}) {
    if (!(await this.ensureReady())) {
      return;
    }

    Braze.logCustomEvent(eventName, properties);
  }

  private async ensureReady(): Promise<boolean> {
    if (this.status === 'ready') {
      return true;
    }

    if (this.initPromise) {
      try {
        await this.initPromise;
        return this.getStatus() === 'ready';
      } catch {
        return false;
      }
    }

    logManager.warn('[Braze] called before SDK was ready');
    return false;
  }

  private async initializeSdk(): Promise<void> {
    return Promise.resolve();
  }
}

export const BrazeWrapper = new BrazeClientWrapper();
