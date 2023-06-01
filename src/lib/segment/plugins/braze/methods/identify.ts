import {IdentifyEventType} from '@segment/analytics-react-native';
// import Braze from 'react-native-appboy-sdk';

/**
 * Modified version of the Segment's official Braze plugin identify method.
 *
 * We only care about a subset of the user properties.
 */
const identify = (payload: IdentifyEventType) => {
  if (payload.userId) {
    Braze.changeUser(payload.userId);
  }

  if (payload.traits?.email !== undefined) {
    Braze.setEmail(payload.traits.email);
  }

  const appBoyTraits = [
    'birthday',
    'email',
    'firstName',
    'lastName',
    'gender',
    'phone',
    'address',
  ];

  Object.entries(payload.traits ?? {}).forEach(([key, value]) => {
    if (appBoyTraits.indexOf(key) < 0) {
      Braze.setCustomUserAttribute(key, value as any);
    }
  });

  return payload;
};

export default identify;
