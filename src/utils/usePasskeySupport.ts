import {useEffect, useState} from 'react';
import {AppState} from 'react-native';
import {
  Passkey,
  PasskeyCreateRequest,
  PasskeyCreateResult,
  PasskeyGetRequest,
  PasskeyGetResult,
} from 'react-native-passkey';

export function usePasskeySupport() {
  const [supported, setSupported] = useState<boolean>(Passkey.isSupported());

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') setSupported(Passkey.isSupported());
    });
    return () => sub.remove();
  }, []);

  return supported;
}

type Json = Record<string, any>;

async function post<T = any>(
  url: string,
  body?: Json,
  token?: string,
): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? {authorization: `Bearer ${token}`} : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

export async function registerPasskey(baseUrl: string, authToken: string) {
  console.log('#### registerPasskey');
  const creationOptions: PasskeyCreateRequest = await post(
    `${baseUrl}/webauthn/registration/options`,
    {},
    authToken,
  );
  console.log('#### creationOptions', creationOptions);

  const result: PasskeyCreateResult = await Passkey.create(creationOptions);
  console.log('#### result', result);

  // verify with server
  await post(`${baseUrl}/webauthn/registration/verify`, result, authToken);
  return true;
}

export async function signInWithPasskey(baseUrl: string, username?: string) {
  console.log('#### signInWithPasskey');
  const requestOptions: PasskeyGetRequest = await post(
    `${baseUrl}/webauthn/login/options`,
    {username},
  );
  console.log('#### requestOptions', requestOptions);

  const result: PasskeyGetResult = await Passkey.get(requestOptions);
  console.log('#### result', result);

  // verify assertion → receive app session / JWT from your backend
  const session = await post(`${baseUrl}/webauthn/login/verify`, result);
  console.log('#### session', session);
  return session; // e.g., {accessToken, refreshToken, user}
}
