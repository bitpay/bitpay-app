import {
  DEFAULT_PORTFOLIO_MMKV_REGISTRY_KEY,
  type WorkletMmkvStorageBridge,
} from '../../adapters/rn/mmkvKvStore';

export type PortfolioWorkletKvConfig = {
  storage: WorkletMmkvStorageBridge;
  registryKey?: string;
};

function resolveRegistryKey(registryKey?: string): string {
  'worklet';
  return registryKey || DEFAULT_PORTFOLIO_MMKV_REGISTRY_KEY;
}

function normalizeKeys(keys: Iterable<string>, registryKey: string): string[] {
  'worklet';

  const out = new Set<string>();
  for (const key of Array.from(keys)) {
    const normalized = String(key || '').trim();
    if (!normalized || normalized === registryKey) {
      continue;
    }
    out.add(normalized);
  }

  return Array.from(out).sort();
}

export function workletKvSetString(
  config: PortfolioWorkletKvConfig,
  key: string,
  value: string,
): void {
  'worklet';

  const normalizedKey = String(key || '').trim();
  const registryKey = resolveRegistryKey(config.registryKey);
  if (!normalizedKey) {
    throw new Error('MMKV key is required.');
  }
  if (normalizedKey === registryKey) {
    throw new Error(
      `${registryKey} is reserved for the portfolio MMKV key registry.`,
    );
  }

  config.storage.set(normalizedKey, value);
}

export function workletKvGetString(
  config: PortfolioWorkletKvConfig,
  key: string,
): string | null {
  'worklet';

  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) {
    return null;
  }

  const value = config.storage.getString(normalizedKey);
  return value == null ? null : value;
}

export function workletKvDelete(
  config: PortfolioWorkletKvConfig,
  key: string,
): void {
  'worklet';

  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) {
    return;
  }

  config.storage.delete(normalizedKey);
}

export function workletKvListKeys(
  config: PortfolioWorkletKvConfig,
  prefix?: string,
): string[] {
  'worklet';

  const keys = normalizeKeys(
    config.storage.getAllKeys(),
    resolveRegistryKey(config.registryKey),
  );
  if (!prefix) {
    return keys;
  }

  return keys.filter(key => key.startsWith(prefix));
}

export function workletKvClearAll(config: PortfolioWorkletKvConfig): void {
  'worklet';

  for (const key of workletKvListKeys(config)) {
    config.storage.delete(key);
  }

  config.storage.delete(resolveRegistryKey(config.registryKey));
}
