import {useMemo} from 'react';
import type {Rates} from '../../../store/rate/rate.models';
import type {Wallet} from '../../../store/wallet/wallet.models';
import type {StoredWallet} from '../../core/types';
import {
  buildBalanceChartScopeId,
  getSortedUniqueWalletIds,
} from '../../../utils/portfolio/chartCache';
import {
  buildCurrentSpotRatesByRateKey,
  getCurrentSpotRatesByRateKeySignature,
} from '../../../utils/portfolio/balanceChartData';
import {usePortfolioStoredWalletAnalysisScope} from './usePortfolioStoredWalletAnalysisScope';

export type PortfolioBalanceChartScope = {
  asOfMs: number;
  chartDataRevisionSig: string;
  currentRatesByAssetId: Record<string, number>;
  currentRatesSignature: string;
  currentSpotRatesByRateKey: Record<string, number>;
  currentSpotRatesSignature: string;
  eligibleWallets: Wallet[];
  quoteCurrency: string;
  scopeId: string;
  sortedWalletIds: string[];
  storedWalletRequestSig: string;
  storedWallets: StoredWallet[];
};

export function usePortfolioBalanceChartScope(args: {
  wallets: Wallet[];
  balanceOffset?: number;
  scopeIdentityKey?: string;
  quoteCurrency?: string;
  rates?: Rates;
}): PortfolioBalanceChartScope {
  const balanceOffset =
    typeof args.balanceOffset === 'number' &&
    Number.isFinite(args.balanceOffset)
      ? args.balanceOffset
      : 0;
  const {
    asOfMs,
    committedRevisionToken,
    currentRatesByAssetId,
    currentRatesSignature,
    eligibleWallets,
    quoteCurrency,
    rates: resolvedRates,
    storedWalletRequestSig,
    storedWallets,
  } = usePortfolioStoredWalletAnalysisScope({
    quoteCurrencyOverride: args.quoteCurrency,
    ratesOverride: args.rates,
    wallets: args.wallets,
  });

  const sortedWalletIds = useMemo(
    () =>
      getSortedUniqueWalletIds(
        eligibleWallets.map(wallet => String(wallet?.id || '')),
      ),
    [eligibleWallets],
  );
  const chartDataRevisionSig = useMemo(() => {
    return storedWalletRequestSig
      ? `${committedRevisionToken}|${storedWalletRequestSig}`
      : committedRevisionToken;
  }, [committedRevisionToken, storedWalletRequestSig]);
  const currentSpotRatesByRateKey = useMemo(() => {
    return buildCurrentSpotRatesByRateKey({
      wallets: eligibleWallets,
      rates: resolvedRates,
      quoteCurrency,
    });
  }, [eligibleWallets, quoteCurrency, resolvedRates]);
  const currentSpotRatesSignature = useMemo(() => {
    return getCurrentSpotRatesByRateKeySignature(currentSpotRatesByRateKey);
  }, [currentSpotRatesByRateKey]);
  const scopeId = useMemo(() => {
    return buildBalanceChartScopeId({
      walletIds: sortedWalletIds,
      quoteCurrency,
      balanceOffset,
      scopeIdentityKey: args.scopeIdentityKey,
    });
  }, [args.scopeIdentityKey, balanceOffset, quoteCurrency, sortedWalletIds]);

  return {
    asOfMs,
    chartDataRevisionSig,
    currentRatesByAssetId,
    currentRatesSignature,
    currentSpotRatesByRateKey,
    currentSpotRatesSignature,
    eligibleWallets,
    quoteCurrency,
    scopeId,
    sortedWalletIds,
    storedWalletRequestSig,
    storedWallets,
  };
}

export default usePortfolioBalanceChartScope;
