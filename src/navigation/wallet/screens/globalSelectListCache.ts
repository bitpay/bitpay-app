import {readAccountListSnapshot} from '../../../store/wallet/utils/accountListCache';
import {IsVMChain} from '../../../store/wallet/utils/currency';

export const GLOBAL_SELECT_LIST_CACHE_PREFIX = 'globalSelectList:';

export const getGlobalSelectListCacheKey = ({
  context,
  selectedAccountAddress,
}: {
  context?: string;
  selectedAccountAddress?: string;
}): string =>
  `${GLOBAL_SELECT_LIST_CACHE_PREFIX}${context || ''}:${
    selectedAccountAddress || ''
  }`;

export const canCacheGlobalSelectList = ({
  useAsModal,
  customSupportedCurrencies,
  customToSelectCurrencies,
}: {
  useAsModal?: boolean;
  customSupportedCurrencies?: unknown[];
  customToSelectCurrencies?: unknown[];
}): boolean =>
  !useAsModal && !customSupportedCurrencies && !customToSelectCurrencies;

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
}: {
  canCache: boolean;
  cacheKey: string;
}): T | undefined =>
  canCache ? readAccountListSnapshot<T>(cacheKey) : undefined;
