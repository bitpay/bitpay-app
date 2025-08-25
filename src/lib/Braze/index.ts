import Braze from '@braze/react-native-sdk';
import axios from 'axios';
import {BRAZE_MERGE_AND_DELETE_API_KEY, BRAZE_REST_API_ENDPOINT} from '@env';

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
  } catch (error: any) {
    throw error.response.data;
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
  } catch (error: any) {
    throw error.response.data;
  }
};

export type BrazeUserAttributes = {
  [K in (typeof nonCustomAttributes)[number]]?: string;
} & Record<string, any>;

export const BrazeWrapper = (() => {
  let lastSeenIdentity: {
    userId?: string;
    attributes?: BrazeUserAttributes;
  } = {};

  return {
    init() {
      return Promise.resolve();
    },

    identify(
      userId: string | undefined,
      attributes?: BrazeUserAttributes | undefined,
    ) {
      if (!lastSeenIdentity) {
        lastSeenIdentity = {};
      }

      if (
        lastSeenIdentity.userId &&
        lastSeenIdentity.userId === userId &&
        lastSeenIdentity.attributes &&
        lastSeenIdentity.attributes === attributes
      ) {
        return;
      }

      if (userId) {
        Braze.changeUser(userId);
      }

      if (attributes) {
        setUserAttributes(attributes);
      }

      lastSeenIdentity = {
        userId,
        attributes,
      };
      return Promise.resolve();
    },

    merge(userToMerge: string, userToKeep: string) {
      return mergeUsers(userToMerge, userToKeep);
    },

    delete(eid: string) {
      return deleteUser(eid);
    },

    screen(name: string, properties: Record<string, any> = {}) {
      const screenName = `Viewed ${name} Screen`;
      Braze.logCustomEvent(screenName, properties);
    },

    track(eventName: string, properties: Record<string, any> = {}) {
      Braze.logCustomEvent(eventName, properties);
    },
  };
})();

export default BrazeWrapper;
