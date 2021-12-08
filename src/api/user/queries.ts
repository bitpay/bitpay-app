import {cardFields} from '../card/queries';
import {GqlQueryParams} from '../graphql.types';

export const basicInfoFields = `
  givenName
  familyName
  email
  eid
  name
  userSettings {
    agreedCardholderAgreement
    acknowledgePrivacyNotice
    optInEmailMarketing
  }
  experiments
  referralCode
`;

/**
 * Fetches all user data, for example for initializing data after pairing
 * or refreshing user data on init.
 * @param token API token
 * @returns GraphQL query object to fetch all user data.
 */
export const FETCH_ALL_USER_DATA = (token: string): GqlQueryParams => {
  return {
    query: `
      query FETCH_ALL_USER_DATA ($token:String!) {
        user:bitpayUser(token:$token) {
          basicInfo: user {
            ${basicInfoFields}
          }
          cards:debitCards {
            ${cardFields}
          }
        }
      }
    `,
    variables: {
      token,
    },
  };
};

export const FETCH_BASIC_INFO = (token: string): GqlQueryParams => {
  return {
    query: `
      query FETCH_BASIC_INFO ($token:String!) {
        user:bitpayUser(token:$token) {
          basicInfo:user {
            ${basicInfoFields}
          }
        }
      }
    `,
    variables: {
      token,
    },
  };
};

const UserQueries = {
  FETCH_ALL_USER_DATA,
  FETCH_BASIC_INFO,
};

export default UserQueries;
