import {
  getPortfolioWalletSnapshots,
  walletHasNonZeroLiveBalance,
  type AssetRowItem,
} from '../../../../utils/portfolio/assets';
import type {BalanceSnapshotsByWalletId} from '../../../../store/portfolio/portfolio.models';
import type {
  CachedFiatRateInterval,
  FiatRateSeriesCache,
} from '../../../../store/rate/rate.models';
import {
  getFiatRateSeriesAssetKey,
  hasValidSeriesForCoin,
} from '../../../../store/rate/rate.models';
import {normalizeFiatRateSeriesCoin} from '../../../../utils/portfolio/core/pnl/rates';
import {
  normalizeFiatRateSeriesChain,
  normalizeFiatRateSeriesTokenAddress,
} from '../../../../utils/portfolio/core/fiatRateSeries';
import type {Wallet} from '../../../../store/wallet/wallet.models';

export type HistoricalRateAssetRequest = {
  requestKey: string;
  coin: string;
  chain?: string;
  tokenAddress?: string;
};

export type HistoricalRateAssetIdentityInput = Pick<
  AssetRowItem,
  'currencyAbbreviation' | 'chain' | 'tokenAddress'
>;

const getWalletCurrencyAbbreviationLower = (wallet: Wallet): string => {
  return String(wallet?.currencyAbbreviation || '').toLowerCase();
};

const getWalletChainLower = (wallet: Wallet): string => {
  return String(wallet?.chain || '').toLowerCase();
};

const getWalletTokenAddress = (wallet: Wallet): string | undefined => {
  const tokenAddress = String(wallet?.tokenAddress || '').trim();
  return tokenAddress || undefined;
};

const isMainnetWallet = (wallet: Wallet): boolean => {
  return String(wallet?.network || '').toLowerCase() === 'livenet';
};

const walletHasStoredSnapshots = (
  wallet: Wallet,
  snapshotsByWalletId: BalanceSnapshotsByWalletId,
): boolean => {
  const walletId = String(wallet?.id || '');
  if (!walletId) {
    return false;
  }

  return getPortfolioWalletSnapshots(snapshotsByWalletId, walletId).length > 0;
};

const shouldIncludeWalletInHistoricalRateRequests = (args: {
  wallet: Wallet;
  snapshotsByWalletId: BalanceSnapshotsByWalletId;
}): boolean => {
  if (walletHasNonZeroLiveBalance(args.wallet)) {
    return true;
  }

  return walletHasStoredSnapshots(args.wallet, args.snapshotsByWalletId);
};

const normalizeHistoricalRateAssetIdentity = (
  identity: HistoricalRateAssetIdentityInput,
):
  | {
      currencyAbbreviation: string;
      chain?: string;
      tokenAddress?: string;
    }
  | undefined => {
  const coin = normalizeFiatRateSeriesCoin(identity.currencyAbbreviation);
  if (!coin) {
    return undefined;
  }

  const rawTokenAddress =
    String(identity.tokenAddress || '').trim() || undefined;
  const chain = rawTokenAddress
    ? normalizeFiatRateSeriesChain(identity.chain)
    : undefined;
  const tokenAddress = normalizeFiatRateSeriesTokenAddress(
    chain,
    rawTokenAddress,
  );

  return {
    currencyAbbreviation: coin,
    ...(chain ? {chain} : {}),
    ...(tokenAddress ? {tokenAddress} : {}),
  };
};

export const getHistoricalRateAssetRequestKey = (args: {
  fiatCode: string;
  coin: string;
  chain?: string;
  tokenAddress?: string;
}): string => {
  const assetKey = getFiatRateSeriesAssetKey(args.coin, {
    chain: args.chain,
    tokenAddress: args.tokenAddress,
  });
  if (!assetKey) {
    return '';
  }

  return `${(args.fiatCode || 'USD').toUpperCase()}:${assetKey}`;
};

export const getHistoricalRateAssetRequestFromItem = (
  item: HistoricalRateAssetIdentityInput,
  fiatCode: string,
): HistoricalRateAssetRequest | undefined => {
  const normalized = normalizeHistoricalRateAssetIdentity(item);
  if (!normalized) {
    return undefined;
  }

  const requestKey = getHistoricalRateAssetRequestKey({
    fiatCode,
    coin: normalized.currencyAbbreviation,
    chain: normalized.chain,
    tokenAddress: normalized.tokenAddress,
  });

  if (!requestKey) {
    return undefined;
  }

  return {
    requestKey,
    coin: normalized.currencyAbbreviation,
    chain: normalized.chain,
    tokenAddress: normalized.tokenAddress,
  };
};

export const getHistoricalRateAssetRequestItemsForVisibleWalletGroups = (
  wallets: Wallet[] | undefined,
  snapshotsByWalletId: BalanceSnapshotsByWalletId,
): HistoricalRateAssetIdentityInput[] => {
  const walletsByDisplayGroupKey = new Map<string, Wallet[]>();

  for (const wallet of wallets || []) {
    if (!isMainnetWallet(wallet)) {
      continue;
    }

    const groupKey = getWalletCurrencyAbbreviationLower(wallet);
    if (!groupKey) {
      continue;
    }

    const groupedWallets = walletsByDisplayGroupKey.get(groupKey) || [];
    groupedWallets.push(wallet);
    walletsByDisplayGroupKey.set(groupKey, groupedWallets);
  }

  const requestItemsByAssetKey = new Map<
    string,
    HistoricalRateAssetIdentityInput
  >();

  for (const groupedWallets of walletsByDisplayGroupKey.values()) {
    if (!groupedWallets.some(walletHasNonZeroLiveBalance)) {
      continue;
    }

    for (const wallet of groupedWallets) {
      if (
        !shouldIncludeWalletInHistoricalRateRequests({
          wallet,
          snapshotsByWalletId,
        })
      ) {
        continue;
      }

      const normalized = normalizeHistoricalRateAssetIdentity({
        currencyAbbreviation: getWalletCurrencyAbbreviationLower(wallet),
        chain: getWalletChainLower(wallet),
        tokenAddress: getWalletTokenAddress(wallet),
      });
      if (!normalized) {
        continue;
      }

      const assetKey = getFiatRateSeriesAssetKey(
        normalized.currencyAbbreviation,
        {
          chain: normalized.chain,
          tokenAddress: normalized.tokenAddress,
        },
      );
      if (!assetKey) {
        continue;
      }

      requestItemsByAssetKey.set(assetKey, normalized);
    }
  }

  return Array.from(requestItemsByAssetKey.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, item]) => item);
};

export const hasHistoricalRateSeriesForAsset = (args: {
  cache: FiatRateSeriesCache | undefined;
  fiatCode: string;
  intervals: ReadonlyArray<CachedFiatRateInterval>;
  coin: string;
  chain?: string;
  tokenAddress?: string;
}): boolean => {
  return hasValidSeriesForCoin({
    cache: args.cache,
    fiatCodeUpper: (args.fiatCode || 'USD').toUpperCase(),
    normalizedCoin: args.coin,
    intervals: args.intervals,
    chain: args.chain,
    tokenAddress: args.tokenAddress,
  });
};

export const getMissingHistoricalRateAssetRequests = (args: {
  fiatCode: string;
  items: HistoricalRateAssetIdentityInput[];
  cache: FiatRateSeriesCache | undefined;
  intervals: ReadonlyArray<CachedFiatRateInterval>;
}): HistoricalRateAssetRequest[] => {
  const requestsByKey = new Map<string, HistoricalRateAssetRequest>();

  for (const item of args.items) {
    const request = getHistoricalRateAssetRequestFromItem(item, args.fiatCode);
    if (!request) {
      continue;
    }

    if (
      hasHistoricalRateSeriesForAsset({
        cache: args.cache,
        fiatCode: args.fiatCode,
        intervals: args.intervals,
        coin: request.coin,
        chain: request.chain,
        tokenAddress: request.tokenAddress,
      })
    ) {
      continue;
    }

    requestsByKey.set(request.requestKey, request);
  }

  return Array.from(requestsByKey.values()).sort((a, b) =>
    a.requestKey.localeCompare(b.requestKey),
  );
};
