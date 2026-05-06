import type {Effect, RootState} from '../index';
import type {HomeCarouselConfig} from './app.models';
import type {Key, Wallet} from '../wallet/wallet.models';
import {
  getHiddenKeyIdsFromHomeCarouselConfig,
  getVisibleWalletsForKey,
} from '../../utils/portfolio/assets';
import {logManager} from '../../managers/LogManager';
import {setHomeCarouselConfig} from './app.actions';
import {populatePortfolio} from '../portfolio';

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const normalizeQuoteCurrency = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  return value.trim().toUpperCase();
};

const getPortfolioPopulateQuoteCurrency = (
  state: RootState,
): string | undefined =>
  normalizeQuoteCurrency(state.PORTFOLIO?.quoteCurrency) ||
  normalizeQuoteCurrency(state.APP?.defaultAltCurrency?.isoCode);

const getNewlyVisibleKeyIds = (args: {
  beforeHiddenKeyIds: Set<string>;
  afterHiddenKeyIds: Set<string>;
}): string[] =>
  Array.from(args.beforeHiddenKeyIds).filter(
    keyId => !args.afterHiddenKeyIds.has(keyId),
  );

const collectVisibleWalletsForKeys = (args: {
  keys: Record<string, Key> | undefined;
  keyIds: string[];
}): Wallet[] => {
  const wallets: Wallet[] = [];
  const seenWalletIds = new Set<string>();

  for (const keyId of args.keyIds) {
    const key = args.keys?.[keyId];
    for (const wallet of getVisibleWalletsForKey(key)) {
      const walletId = wallet?.id;
      if (typeof walletId === 'string' && walletId) {
        if (seenWalletIds.has(walletId)) {
          continue;
        }
        seenWalletIds.add(walletId);
      }

      wallets.push(wallet);
    }
  }

  return wallets;
};

export const setHomeCarouselConfigAndPopulateNewlyVisibleKeys =
  (
    nextConfig: HomeCarouselConfig[] | HomeCarouselConfig,
  ): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const beforeState = getState();
    const beforeHiddenKeyIds = getHiddenKeyIdsFromHomeCarouselConfig({
      keys: beforeState.WALLET?.keys,
      homeCarouselConfig: beforeState.APP?.homeCarouselConfig,
    });

    dispatch(setHomeCarouselConfig(nextConfig));

    const afterState = getState();
    const afterHiddenKeyIds = getHiddenKeyIdsFromHomeCarouselConfig({
      keys: afterState.WALLET?.keys,
      homeCarouselConfig: afterState.APP?.homeCarouselConfig,
    });

    const newlyVisibleKeyIds = getNewlyVisibleKeyIds({
      beforeHiddenKeyIds,
      afterHiddenKeyIds,
    });

    if (!newlyVisibleKeyIds.length) {
      return;
    }

    const wallets = collectVisibleWalletsForKeys({
      keys: afterState.WALLET?.keys,
      keyIds: newlyVisibleKeyIds,
    });

    if (!wallets.length) {
      return;
    }

    try {
      await dispatch(
        populatePortfolio({
          wallets,
          quoteCurrency: getPortfolioPopulateQuoteCurrency(afterState),
        }) as any,
      );
    } catch (error: unknown) {
      logManager.warn(
        `[portfolio] Failed populating newly visible home carousel keys: ${toErrorMessage(
          error,
        )}`,
      );
    }
  };
