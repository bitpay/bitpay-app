import {cardFields} from '../card/card.queries';
import {GqlQueryParams} from '../graphql/graphql.types';

export const basicInfoFields = `
  givenName
  familyName
  email
  eid
  incentiveLevel
  incentiveLevelId
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
          cardBalances:debitCards {
            id
            balance:cardBalance
          }
          doshToken:getDoshToken
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

const FETCH_DOSH_TOKEN = (token: string): GqlQueryParams => {
  return {
    query: `
      query FETCH_DOSH_TOKEN ($token:String!) {
        user:bitpayUser(token:$token) {
          doshToken:getDoshToken
        }
      }
    `,
    variables: {
      token,
    },
  };
};

const FETCH_SUPPORTED_CURRECIES = (token: string): GqlQueryParams => {
  return {
    query: `
      query FETCH_SUPPORTED_CURRECIES ($token:String!, $csrf:String) {
        user:bitpayUser(token:$token, csrf: $csrf) {
          currencies (product: "app")
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
  FETCH_DOSH_TOKEN,
  FETCH_SUPPORTED_CURRECIES,
};

export default UserQueries;
