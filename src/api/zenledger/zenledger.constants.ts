import {ZenledgerCredentialsProps} from './zenledger.types';

import {ZENLEDGER_CLIENT_ID, ZENLEDGER_CLIENT_SECRET} from '@env';

const AUTHENTICATION_URL = 'https://api.zenledger.io/oauth/token';
const GRANT_TYPE = 'client_credentials';

export const ZENLEDGER_API_URL = 'https://api.zenledger.io/aggregators/api/v1';
export const ZENLEDGER_CREDENTIALS: ZenledgerCredentialsProps = {
  client_id: ZENLEDGER_CLIENT_ID,
  client_secret: ZENLEDGER_CLIENT_SECRET,
  grant_type: GRANT_TYPE,
  token_endpoint: AUTHENTICATION_URL,
};
