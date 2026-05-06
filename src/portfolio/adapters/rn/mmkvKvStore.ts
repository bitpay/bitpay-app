import type {MMKV} from 'react-native-mmkv';

export type WorkletMmkvStorageBridge = Pick<
  MMKV,
  'contains' | 'delete' | 'getAllKeys' | 'getString' | 'set'
>;

export const DEFAULT_PORTFOLIO_MMKV_REGISTRY_KEY =
  '__bitpay.portfolio.engine.registry.v1__';
