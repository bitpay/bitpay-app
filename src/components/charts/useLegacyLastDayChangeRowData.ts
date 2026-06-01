import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import type {Wallet} from '../../store/wallet/wallet.models';
import {HISTORIC_RATES_CACHE_DURATION} from '../../constants/wallet';
import {useAppSelector} from '../../utils/hooks';
import {
  buildLegacyLastDayRateRequestsForWallets,
  getLegacyLastDayPnlForRepresentativeAsset,
  getLegacyLastDayPnlForWallets,
  getLegacyLastDayPnlFromTotals,
  getLegacyLastDayRateRequestForAsset,
  type LegacyLastDayAssetIdentity,
  type LegacyLastDayPnl,
  type LegacyLastDayPnlMode,
} from '../../utils/portfolio/assets';
import {
  buildBalanceHistoryChartChangeRowData,
  type ChangeRowData,
} from './balanceHistoryChartSelection';
import {getRangeLabelForFiatTimeframe} from './fiatTimeframes';
import useRuntimeFiatRateSeriesCache from '../../portfolio/ui/hooks/useRuntimeFiatRateSeriesCache';
import {getLastDayTimestampStartOfHourMs} from '../../utils/helper-methods';

const toFiniteNumber = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const getWalletLastDayFiatBalance = (wallet: Wallet | undefined): number =>
  toFiniteNumber(wallet?.balance?.fiatLastDay);

export const getLegacyLastDayFiatBalance = (
  wallets: Wallet[] | undefined,
): number =>
  (wallets || []).reduce(
    (total, wallet) => total + getWalletLastDayFiatBalance(wallet),
    0,
  );

const buildLegacyLastDayChangeRowDataFromPnl = (args: {
  legacyPnl: LegacyLastDayPnl;
  quoteCurrency: string;
  label: string;
}): ChangeRowData =>
  buildBalanceHistoryChartChangeRowData({
    displayedAnalysisPoint: {
      totalPnlChange: args.legacyPnl.deltaFiat,
      totalPnlPercent: args.legacyPnl.percent,
    },
    quoteCurrency: args.quoteCurrency,
    label: args.label,
  });

export const buildLegacyLastDayChangeRowData = (args: {
  wallets: Wallet[] | undefined;
  currentFiatBalance: number | undefined;
  quoteCurrency: string;
  label: string;
}): ChangeRowData | undefined => {
  const currentFiatBalance = toFiniteNumber(args.currentFiatBalance);
  const lastDayFiatBalance = getLegacyLastDayFiatBalance(args.wallets);
  const legacyPnl = getLegacyLastDayPnlFromTotals({
    currentFiatBalance,
    lastDayFiatBalance,
  });

  if (!legacyPnl) {
    return undefined;
  }

  return buildLegacyLastDayChangeRowDataFromPnl({
    legacyPnl,
    quoteCurrency: args.quoteCurrency,
    label: args.label,
  });
};

const useLegacyLastDayChangeRowData = (args: {
  wallets: Wallet[] | undefined;
  currentFiatBalance: number | undefined;
  quoteCurrency: string;
  enabled?: boolean;
  mode?: LegacyLastDayPnlMode;
  representativeAsset?: LegacyLastDayAssetIdentity;
}): ChangeRowData | undefined => {
  const {t} = useTranslation();
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const {
    currentFiatBalance,
    enabled: enabledArg,
    mode = 'walletLevel',
    quoteCurrency,
    representativeAsset,
    wallets,
  } = args;
  const enabled = enabledArg !== false;
  const lastDayLabel = getRangeLabelForFiatTimeframe(t, '1D');
  const baselineTimestampMs = useMemo(
    () => getLastDayTimestampStartOfHourMs(),
    [quoteCurrency],
  );
  const rateRequests = useMemo(() => {
    if (!enabled) {
      return [];
    }

    if (mode === 'representativeAsset') {
      const request = getLegacyLastDayRateRequestForAsset(representativeAsset);
      return request ? [request] : [];
    }

    return buildLegacyLastDayRateRequestsForWallets({wallets});
  }, [enabled, mode, representativeAsset, wallets]);
  const {cache: fiatRateSeriesCache} = useRuntimeFiatRateSeriesCache({
    quoteCurrency,
    requests: rateRequests,
    maxAgeMs: HISTORIC_RATES_CACHE_DURATION * 1000,
    enabled: enabled && rateRequests.length > 0,
    clearOnRequestChange: true,
  });

  return useMemo(() => {
    if (!enabled) {
      return undefined;
    }

    const legacyPnl =
      mode === 'representativeAsset'
        ? getLegacyLastDayPnlForRepresentativeAsset({
            currentFiatBalance,
            fallbackLastDayFiatBalance: getLegacyLastDayFiatBalance(wallets),
            rates,
            fiatRateSeriesCache,
            quoteCurrency,
            baselineTimestampMs,
            identity: representativeAsset || {},
          })
        : getLegacyLastDayPnlForWallets({
            wallets,
            currentFiatBalance,
            rates,
            fiatRateSeriesCache,
            quoteCurrency,
            baselineTimestampMs,
          });

    if (!legacyPnl) {
      return undefined;
    }

    return buildLegacyLastDayChangeRowDataFromPnl({
      legacyPnl,
      quoteCurrency,
      label: lastDayLabel,
    });
  }, [
    baselineTimestampMs,
    currentFiatBalance,
    enabled,
    fiatRateSeriesCache,
    lastDayLabel,
    mode,
    quoteCurrency,
    rates,
    representativeAsset,
    wallets,
  ]);
};

export default useLegacyLastDayChangeRowData;
