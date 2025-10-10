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
import {LogActions} from '../store/log';

type Json = Record<string, any>;

async function remove<T = any>(url: string, token?: string): Promise<T> {
  const r = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(token ? {'x-csrf-token': token} : {}),
    },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
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
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
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
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

export async function registerPasskey(
  email: string,
  network: Network,
  token: string,
) {
  try {
    const creationOptions: PasskeyCreateRequest = await post(
      BASE_BITPAY_URLS[network] + PASSKEY_API_REGISTER_CHALLENGE,
      {email},
      token,
    );
    const result: PasskeyCreateResult = await Passkey.create(creationOptions);

    const res = await post(
      BASE_BITPAY_URLS[network] + PASSKEY_API_REGISTER_VERIFY,
      {
        credential: result,
      },
      token,
    );
    return res.success || false;
  } catch (error) {
    const errStr =
      error instanceof Error ? error.message : JSON.stringify(error);
    LogActions.error('[registerPasskey]', errStr);
    return false;
  }
}

export async function signInWithPasskey(
  network: Network,
  token: string,
  email?: string,
) {
  try {
    const authChallenge = await post(
      BASE_BITPAY_URLS[network] + PASSKEY_API_AUTH_CHALLENGE,
      email ? {email} : {},
      token,
    );
    const _reqOptions: PasskeyGetRequest = authChallenge.options;
    const result: PasskeyGetResult = await Passkey.get(_reqOptions);

    const res = await post(
      BASE_BITPAY_URLS[network] + PASSKEY_API_AUTH_VERIFY,
      {credential: result},
      token,
    );
    return res.success || false;
  } catch (error) {
    const errStr =
      error instanceof Error ? error.message : JSON.stringify(error);
    LogActions.error('[signInWithPasskey]', errStr);
    return false;
  }
}

export async function removePasskey(
  id: string,
  network: Network,
  token: string,
): Promise<boolean> {
  try {
    const res = await remove(
      BASE_BITPAY_URLS[network] + PASSKEY_API_CREDENTIALS + `/${id}`,
      token,
    );
    return res.success || false;
  } catch (error) {
    const errStr =
      error instanceof Error ? error.message : JSON.stringify(error);
    LogActions.error('[removePasskey]', errStr);
    return false;
  }
}

export async function getPasskeyStatus(
  email: string,
  network: Network,
  token: string,
): Promise<boolean> {
  try {
    const res = await get(
      BASE_BITPAY_URLS[network] +
        PASSKEY_API_STATUS +
        `?email=${encodeURIComponent(email)}`,
      token,
    );
    return res.passkey || false;
  } catch (error) {
    const errStr =
      error instanceof Error ? error.message : JSON.stringify(error);
    LogActions.error('[getPasskeyStatus]', errStr);
    return false;
  }
}

export async function getPasskeyCredentials(
  email: string,
  network: Network,
  token: string,
): Promise<any> {
  try {
    const res = await get(
      BASE_BITPAY_URLS[network] +
        PASSKEY_API_CREDENTIALS +
        `?email=${encodeURIComponent(email)}`,
      token,
    );
    return res.credentials || [];
  } catch (error) {
    const errStr =
      error instanceof Error ? error.message : JSON.stringify(error);
    LogActions.error('[getPasskeyCredentials]', errStr);
    return [];
  }
}
