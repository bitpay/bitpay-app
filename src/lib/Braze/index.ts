import Braze from 'react-native-appboy-sdk';

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
    Braze.setCountry(country);
  }

  if (typeof dateOfBirth !== 'undefined') {
    const asDate = new Date(dateOfBirth);
    const year = asDate.getFullYear();
    const month = (asDate.getMonth() + 1) as Braze.MonthsAsNumber;
    const day = asDate.getDate();

    Braze.setDateOfBirth(year, month, day);
  }

  if (typeof email !== 'undefined') {
    Braze.setEmail(email);
  }

  if (typeof firstName !== 'undefined') {
    Braze.setFirstName(firstName);
  }

  if (typeof gender !== 'undefined') {
    const supportedGenders = ['m', 'f', 'n', 'o', 'p', 'u'];
    const isSupported = supportedGenders.indexOf(gender) > -1;

    if (isSupported) {
      Braze.setGender(gender as Braze.GenderTypes[keyof Braze.GenderTypes]);
    }
  }

  if (typeof homeCity !== 'undefined') {
    Braze.setHomeCity(homeCity);
  }

  if (typeof language !== 'undefined') {
    Braze.setLanguage(language);
  }

  if (typeof lastName !== 'undefined') {
    Braze.setLastName(lastName);
  }

  if (typeof phoneNumber !== 'undefined') {
    Braze.setPhoneNumber(phoneNumber);
  }

  Object.entries(customAttributes).forEach(([k, v]) => {
    const isValidCustomAttribute = nonCustomAttributes.indexOf(k as any) < 0;

    if (isValidCustomAttribute) {
      Braze.setCustomUserAttribute(k, v);
    }
  });
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
