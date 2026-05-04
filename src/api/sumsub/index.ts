import {BASE_BITPAY_URLS} from '../../constants/config';
import {Network} from '../../constants';
import {SUMSUB_LEVEL_NAME} from '@env';

// Leave empty for production
export const SUMSUB_DEV_TOKEN = '';

export interface SumSubTokenResponse {
  token: string;
  userId: string;
}

const fetchAccessToken = async (
  network: Network,
  apiToken: string,
  userId: string,
): Promise<SumSubTokenResponse> => {
  const baseUrl = BASE_BITPAY_URLS[network];
  const response = await fetch(
    `${baseUrl}/api/v2/sumsub/token?levelName=${SUMSUB_LEVEL_NAME}&userId=${encodeURIComponent(
      userId,
    )}`,
    {
      method: 'GET',
      headers: {
        'x-identity': apiToken,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch SumSub access token: ${response.status}`);
  }

  return response.json() as Promise<SumSubTokenResponse>;
};

export const SumSubApi = {
  fetchAccessToken,
};
