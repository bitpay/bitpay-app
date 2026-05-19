import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import type {Wallet} from '../../store/wallet/wallet.models';
import {getLegacyLastDayPnlFromTotals} from '../../utils/portfolio/assets';
import {
  buildBalanceHistoryChartChangeRowData,
  type ChangeRowData,
} from './balanceHistoryChartSelection';
import {getRangeLabelForFiatTimeframe} from './fiatTimeframes';

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

  return buildBalanceHistoryChartChangeRowData({
    displayedAnalysisPoint: {
      totalPnlChange: legacyPnl.deltaFiat,
      totalPnlPercent: legacyPnl.percent,
    },
    quoteCurrency: args.quoteCurrency,
    label: args.label,
  });
};

const useLegacyLastDayChangeRowData = (args: {
  wallets: Wallet[] | undefined;
  currentFiatBalance: number | undefined;
  quoteCurrency: string;
  enabled?: boolean;
}): ChangeRowData | undefined => {
  const {t} = useTranslation();
  const {
    currentFiatBalance,
    enabled: enabledArg,
    quoteCurrency,
    wallets,
  } = args;
  const enabled = enabledArg !== false;
  const lastDayLabel = getRangeLabelForFiatTimeframe(t, '1D');

  return useMemo(
    () =>
      enabled
        ? buildLegacyLastDayChangeRowData({
            wallets,
            currentFiatBalance,
            quoteCurrency,
            label: lastDayLabel,
          })
        : undefined,
    [currentFiatBalance, enabled, lastDayLabel, quoteCurrency, wallets],
  );
};

export default useLegacyLastDayChangeRowData;
