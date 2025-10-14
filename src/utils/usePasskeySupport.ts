import {useEffect, useState} from 'react';
import {AppState} from 'react-native';
import {Passkey} from 'react-native-passkey';

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
