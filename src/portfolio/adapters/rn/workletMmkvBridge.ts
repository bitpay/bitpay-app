import {MMKV} from 'react-native-mmkv';

import {
  DEFAULT_PORTFOLIO_MMKV_REGISTRY_KEY,
  type WorkletMmkvStorageBridge,
} from './mmkvKvStore';

export const PORTFOLIO_WORKLET_MMKV_STORAGE_ID = 'bitpay.portfolio.engine';
export const PORTFOLIO_WORKLET_MMKV_REGISTRY_KEY =
  DEFAULT_PORTFOLIO_MMKV_REGISTRY_KEY;

let portfolioMmkvStorage: MMKV | undefined;

export function createPortfolioMmkvStorageOnRN(): MMKV {
  return new MMKV({
    id: PORTFOLIO_WORKLET_MMKV_STORAGE_ID,
  });
}

export function getPortfolioMmkvStorageOnRN(): MMKV {
  if (!portfolioMmkvStorage) {
    portfolioMmkvStorage = createPortfolioMmkvStorageOnRN();
  }

  return portfolioMmkvStorage;
}

export function getNativeMmkvStorageBridgeOnRN(
  storageInstance: MMKV,
  storageLabel: string,
): WorkletMmkvStorageBridge {
  const nativeStorage = (
    storageInstance as unknown as {
      nativeInstance?: WorkletMmkvStorageBridge;
    }
  ).nativeInstance;

  if (
    !nativeStorage ||
    typeof nativeStorage.set !== 'function' ||
    typeof nativeStorage.getString !== 'function' ||
    typeof nativeStorage.getAllKeys !== 'function' ||
    typeof nativeStorage.contains !== 'function' ||
    typeof nativeStorage.delete !== 'function'
  ) {
    throw new Error(
      `${storageLabel} react-native-mmkv nativeInstance is unavailable on the RN runtime.`,
    );
  }

  return nativeStorage;
}

export function getPortfolioMmkvNativeStorageOnRN(): WorkletMmkvStorageBridge {
  return getNativeMmkvStorageBridgeOnRN(
    getPortfolioMmkvStorageOnRN(),
    'Portfolio MMKV storage',
  );
}
