import {
  Passkey,
  PasskeyCreateRequest,
  PasskeyCreateResult,
  PasskeyGetRequest,
  PasskeyGetResult,
} from 'react-native-passkey';
import {
  BASE_BITPAY_URLS,
  PASSKEY_API_REGISTER_CHALLENGE,
  PASSKEY_API_REGISTER_VERIFY,
  PASSKEY_API_AUTH_CHALLENGE,
  PASSKEY_API_AUTH_VERIFY,
  PASSKEY_API_STATUS,
  PASSKEY_API_CREDENTIALS,
} from '../constants/config';
import {Network} from '../constants';
import {PasskeyCredential} from '../store/bitpay-id/bitpay-id.models';
import BitPayIdApi from '../api/bitpay';
import {
  CloudflareChallengeError,
  isCloudflareChallenge,
  safeErrorMessage,
} from './cloudflare';

type Json = Record<string, any>;

async function handleFetchError(res: Response, url: string): Promise<void> {
  if (res.ok) return;

  let message = res.statusText;
  let body: any;
  let text = '';

  try {
    text = await res.text();
    if (text) {
      try {
        body = JSON.parse(text);
        message = body.message || body.error || safeErrorMessage(text, message);
      } catch {
        // Not JSON. Only surface it if it isn't an HTML error page — otherwise
        // the whole document ends up rendered as the error message.
        message = safeErrorMessage(text, message);
      }
    }
  } catch {
    /* ignore body parse errors */
  }

  // Cloudflare answers a challenged request with an interstitial rather than
  // our API's JSON, so this has to be checked before treating it as a failure.
  if (
    isCloudflareChallenge({
      status: res.status,
      headers: res.headers,
      body: text,
    })
  ) {
    throw new CloudflareChallengeError(url, res.status);
  }

  const error = new Error(message);
  (error as any).status = res.status;
  (error as any).url = url;
  (error as any).body = body;
  throw error;
}

async function remove<T = any>(url: string, token?: string): Promise<T> {
  const r = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(token ? {'x-csrf-token': token} : {}),
    },
  });
  await handleFetchError(r, url);
  return r.json();
}

async function post<T = any>(
  url: string,
  body?: Json,
  token?: string,
): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? {'x-csrf-token': token} : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  await handleFetchError(r, url);
  return r.json();
}

async function get<T = any>(url: string, token?: string): Promise<T> {
  const r = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(token ? {'x-csrf-token': token} : {}),
    },
  });
  await handleFetchError(r, url);
  return r.json();
}

export async function registerPasskey(
  email: string,
  network: Network,
  token: string,
): Promise<boolean> {
  const creationOptions: PasskeyCreateRequest = await post(
    BASE_BITPAY_URLS[network] + PASSKEY_API_REGISTER_CHALLENGE,
    {email},
    token,
  );
  const result: PasskeyCreateResult = await Passkey.create(creationOptions);

  const {success} = await post(
    BASE_BITPAY_URLS[network] + PASSKEY_API_REGISTER_VERIFY,
    {
      credential: result,
    },
    token,
  );
  return !!success;
}

export async function signInWithPasskey(
  network: Network,
  token: string,
  email?: string,
): Promise<boolean> {
  const authChallenge = await post(
    BASE_BITPAY_URLS[network] + PASSKEY_API_AUTH_CHALLENGE,
    email ? {email} : {},
    token,
  );
  const _reqOptions: PasskeyGetRequest = authChallenge.options;
  const result: PasskeyGetResult = await Passkey.get(_reqOptions);
  const bitpayIdApi = BitPayIdApi.getInstance();
  const {success} = await post(
    BASE_BITPAY_URLS[network] + PASSKEY_API_AUTH_VERIFY,
    {credential: result, pubKey: bitpayIdApi.identity.pub},
    token,
  );
  return !!success;
}

export async function removePasskey(
  id: string,
  network: Network,
  token: string,
): Promise<{success: boolean}> {
  return remove(
    BASE_BITPAY_URLS[network] + PASSKEY_API_CREDENTIALS + `/${id}`,
    token,
  );
}

export async function getPasskeyStatus(
  email: string,
  network: Network,
  token: string,
): Promise<{passkey: boolean}> {
  return get(
    BASE_BITPAY_URLS[network] +
      PASSKEY_API_STATUS +
      `?email=${encodeURIComponent(email)}`,
    token,
  );
}

export async function getPasskeyCredentials(
  email: string,
  network: Network,
  token: string,
): Promise<{credentials: PasskeyCredential[]}> {
  return get(
    BASE_BITPAY_URLS[network] +
      PASSKEY_API_CREDENTIALS +
      `?email=${encodeURIComponent(email)}`,
    token,
  );
}
