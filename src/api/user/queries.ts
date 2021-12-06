import {GqlQueryParams} from '../graphql.types';

export const FETCH_BASIC_INFO = (token: string): GqlQueryParams => {
  return {
    query: `
      query FETCH_BASIC_INFO ($token:String!) {
        user:bitpayUser(token:$token) {
          basicInfo:user {
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
  FETCH_BASIC_INFO,
};

export default UserQueries;
