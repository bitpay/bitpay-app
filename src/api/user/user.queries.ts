import {cardFields} from '../card/card.queries';
import {GqlQueryParams} from '../graphql/graphql.types';

export const basicInfoFields = `
  givenName
  familyName
  email
  verified
  eid
  incentiveLevel
  incentiveLevelId
  methodEntityId
  phone
  name
  country
  state
  userSettings {
    agreedCardholderAgreement
    acknowledgePrivacyNotice
    optInEmailMarketing
  }
  optInEmailMarketing
  experiments
  referralCode
`;

export const basicInfoExternalFields = `
  address
  dateOfBirth
  legalFamilyName
  legalGivenName
`;

export const basicInfoMethodFields = `
  methodVerified
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
          basicInfo: user(includeMethodData:true) {
            ${basicInfoFields}
            ${basicInfoMethodFields}
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

export const FETCH_BASIC_INFO = (
  token: string,
  params: {includeExternalData?: boolean; includeMethodData?: boolean},
): GqlQueryParams => {
  return {
    query: `
      query FETCH_BASIC_INFO ($token:String!) {
        user:bitpayUser(token:$token) {
          basicInfo:user(includeExternalData:${
            params.includeExternalData
          }, includeMethodData:${params.includeMethodData}) {
            ${basicInfoFields}
            ${params.includeExternalData ? basicInfoExternalFields : ''}
            ${params.includeMethodData ? basicInfoMethodFields : ''}
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

const UserQueries = {
  FETCH_ALL_USER_DATA,
  FETCH_BASIC_INFO,
  FETCH_DOSH_TOKEN,
};

export default UserQueries;
