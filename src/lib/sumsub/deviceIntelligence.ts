import axios from 'axios';
import {getUniqueId} from 'react-native-device-info';
import {
  init as fishermanInit,
  updateAccessToken as fishermanUpdateAccessToken,
  type Fisherman,
} from '@sumsub/fisherman';
import BitPayIdApi from '../../api/bitpay';
import {Network} from '../../constants';
import {BASE_BITPAY_URLS, NO_CACHE_HEADERS} from '../../constants/config';

/**
 * SumSub Device Intelligence (fisherman): per event, mint a fresh token from the backend,
 * capture the device, and submit it. Tokens are single-use, so a new one is minted each time;
 * but fisherman is `init()`ed only once and re-pointed via `updateAccessToken()` on later
 * events (re-initializing re-fetches the DI config and degrades the singleton in RN).
 */

const GET_TOKEN_METHOD = 'getDeviceAccessToken';
const SUBMIT_EVENT_METHOD = 'submitDeviceEvent';

// Exact keys of the backend's DEVICE_EVENTS map; any other value is rejected.
export type DeviceEvent =
  | 'login'
  | 'signup'
  | 'password-reset-request'
  | 'password-reset-complete'
  | 'two-factor'
  | 'payment-scanned'
  | 'payment-posted';

export interface DeviceEventParams {
  network: Network;
  /** BitPay ID API token. Undefined when not logged in — routes to the public variant. */
  apiToken?: string;
  event: DeviceEvent;
  email?: string;
  fullName?: string;
  currencyCode?: string;
  amount?: number;
  invoiceId?: string;
  paymentTxnId?: string;
}

// Authenticated callers use the signed RPC; anonymous ones post unsigned (public variant).
async function rpc<T>(
  network: Network,
  apiToken: string | undefined,
  method: string,
  params: Record<string, unknown>,
): Promise<T> {
  if (apiToken) {
    return BitPayIdApi.apiCall(apiToken, method, params);
  }

  const res = await axios.post(
    `${BASE_BITPAY_URLS[network]}/api/v2`,
    {method, params: JSON.stringify(params)},
    {headers: NO_CACHE_HEADERS},
  );
  if (res.data?.error) {
    throw new Error(res.data.error);
  }
  return res.data?.data ?? res.data;
}

async function mintToken(
  network: Network,
  apiToken: string | undefined,
): Promise<string> {
  const token = await rpc<string>(network, apiToken, GET_TOKEN_METHOD, {
    deviceId: getUniqueId(),
  });
  if (!token || typeof token !== 'string') {
    throw new Error('No Device Intelligence token returned from backend');
  }
  return token;
}

let fisherman: Fisherman | null = null;

// Init once, then just swap the token — re-initializing re-fetches the DI config.
async function ensureFisherman(token: string): Promise<Fisherman> {
  if (fisherman) {
    fishermanUpdateAccessToken(token);
    return fisherman;
  }

  fisherman = await fishermanInit({token});
  return fisherman;
}

async function runDeviceEvent({
  network,
  apiToken,
  event,
  ...applicant
}: DeviceEventParams): Promise<string | undefined> {
  const token = await mintToken(network, apiToken);
  const active = await ensureFisherman(token);

  const {visitorId} = await active.fingerprint();
  // Params go flat (not wrapped in `input`): this is the /api/v2 RPC, not /api/v2/graphql.
  await rpc(network, apiToken, SUBMIT_EVENT_METHOD, {
    accessToken: token,
    event,
    ...applicant,
  });
  return visitorId;
}

// fisherman is a singleton, so events are serialized to avoid stomping the shared token.
let eventQueue: Promise<unknown> = Promise.resolve();

/**
 * Runs the Device Intelligence cycle for one action and submits the event. SumSub links it to
 * the session user (when `apiToken` is set) or to `email` / `fullName`.
 */
export const submitDeviceEvent = (
  params: DeviceEventParams,
): Promise<string | undefined> => {
  const result = eventQueue.then(() => runDeviceEvent(params));
  eventQueue = result.catch(() => undefined);
  return result;
};
