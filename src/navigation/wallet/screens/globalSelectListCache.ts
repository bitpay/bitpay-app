import {readAccountListSnapshot} from '../../../store/wallet/utils/accountListCache';
import {IsVMChain} from '../../../store/wallet/utils/currency';

export const GLOBAL_SELECT_LIST_CACHE_PREFIX = 'globalSelectList:';

const normalizeSupportedCurrencySignatureValue = (
  value: unknown,
  seen: WeakSet<object>,
  depth = 0,
): unknown => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (
    value === undefined ||
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint'
  ) {
    return undefined;
  }

  if (typeof value !== 'object' || depth >= 8) {
    return String(value);
  }

  if (seen.has(value)) {
    return '[circular]';
  }
  seen.add(value);

  const normalized = Array.isArray(value)
    ? value.map(item =>
        normalizeSupportedCurrencySignatureValue(item, seen, depth + 1),
      )
    : Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((result, key) => {
          const normalizedValue = normalizeSupportedCurrencySignatureValue(
            (value as Record<string, unknown>)[key],
            seen,
            depth + 1,
          );
          if (normalizedValue !== undefined) {
            result[key] = normalizedValue;
          }
          return result;
        }, {});

  seen.delete(value);
  return normalized;
};

export const getGlobalSelectSupportedCurrenciesSignature = (
  currencies: readonly unknown[] | undefined,
): string =>
  JSON.stringify(
    normalizeSupportedCurrencySignatureValue(
      currencies || [],
      new WeakSet<object>(),
    ),
  );

export const getGlobalSelectListCacheKey = ({
  context,
  selectedAccountAddress,
  variant,
}: {
  context?: string;
  selectedAccountAddress?: string;
  variant?: string;
}): string => {
  const baseKey = `${GLOBAL_SELECT_LIST_CACHE_PREFIX}${context || ''}:${
    selectedAccountAddress || ''
  }`;

  return variant ? `${baseKey}:${variant}` : baseKey;
};

export const canCacheGlobalSelectList = ({
  context,
  useAsModal,
  customSupportedCurrencies,
  customToSelectCurrencies,
}: {
  context?: string;
  useAsModal?: boolean;
  customSupportedCurrencies?: unknown[];
  customToSelectCurrencies?: unknown[];
}): boolean => {
  const isCacheableSellModal =
    useAsModal &&
    context === 'sell' &&
    !!customSupportedCurrencies &&
    !customToSelectCurrencies;

  return (
    isCacheableSellModal ||
    (!useAsModal && !customSupportedCurrencies && !customToSelectCurrencies)
  );
};

export type GlobalSelectInitialAccountSelection = {
  account: {
    keyId?: string;
    chains?: string[];
    accountName?: string;
    accountNumber?: number;
    receiveAddress?: string;
  };
  assetsByChain: any[];
};

export const getGlobalSelectInitialAccountSelection = (
  list: any,
): GlobalSelectInitialAccountSelection | undefined => {
  if (!Array.isArray(list) || list.length !== 1) {
    return undefined;
  }

  const accounts = list[0]?.accounts;
  if (!Array.isArray(accounts) || accounts.length !== 1) {
    return undefined;
  }

  const account = accounts[0];
  if (!account?.chains?.[0] || !IsVMChain(account.chains[0])) {
    return undefined;
  }

  return {
    account: {
      keyId: account.keyId,
      chains: account.chains,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      receiveAddress: account.receiveAddress,
    },
    assetsByChain: account.assetsByChain ?? [],
  };
};

export const readCachedGlobalSelectList = <T>({
  canCache,
  cacheKey,
  signature,
}: {
  canCache: boolean;
  cacheKey: string;
  signature: string;
}): T | undefined =>
  canCache ? readAccountListSnapshot<T>(cacheKey, signature) : undefined;
