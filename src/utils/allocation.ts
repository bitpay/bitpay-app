import type {WalletRowProps} from '../components/list/WalletRow';
import {formatFiatAmount} from './helper-methods';
import type {Key, Wallet} from '../store/wallet/wallet.models';
import {Slate, SlateDark} from '../styles/colors';
import {BitpaySupportedCoins} from '../constants/currencies';

type AllocationAsset = {
  assetKey: string;
  currencyAbbreviation: string;
  chain: string;
  tokenAddress?: string;
  name: string;
  fiatValue: number;
};

export type AllocationWallet = Pick<
  WalletRowProps,
  | 'currencyAbbreviation'
  | 'chain'
  | 'tokenAddress'
  | 'currencyName'
  | 'fiatBalance'
>;

export type AllocationLegendItem = {
  key: string;
  label: string;
  value?: string;
  color: {
    light: string;
    dark: string;
  };
};

export type AllocationSlice = {
  key: string;
  value: number;
  color: {
    light: string;
    dark: string;
  };
};

export type AllocationRowItem = {
  key: string;
  currencyAbbreviation: string;
  chain: string;
  tokenAddress?: string;
  name: string;
  fiatAmount: string;
  percent: string;
  barColor: {
    light: string;
    dark: string;
  };
  progress: number;
};

const getAssetKey = (w: AllocationWallet): string => {
  const coin = (w.currencyAbbreviation || '').toLowerCase();
  return coin;
};

const getAssetColor = (
  currencyAbbreviation: string,
  chain?: string,
): {light: string; dark: string} => {
  const coinKey = (currencyAbbreviation || '').toLowerCase();
  const chainKey = (chain || '').toLowerCase();

  const themeColor =
    BitpaySupportedCoins[coinKey]?.theme?.coinColor ||
    BitpaySupportedCoins[chainKey]?.theme?.coinColor;

  return themeColor
    ? {light: themeColor, dark: themeColor}
    : {light: Slate, dark: SlateDark};
};

const toPercent = (value: number, total: number): number => {
  if (!total || total <= 0) {
    return 0;
  }
  return (value / total) * 100;
};

export const buildAllocationDataFromWalletRows = (
  wallets: AllocationWallet[],
  defaultAltCurrencyIsoCode: string,
  opts?: {
    topN?: number;
    includeOther?: boolean;
  },
): {
  totalFiat: number;
  legendItems: AllocationLegendItem[];
  slices: AllocationSlice[];
  rows: AllocationRowItem[];
} => {
  const byAssetKey = new Map<string, AllocationAsset>();

  (wallets || []).forEach(w => {
    const fiat = Number(w.fiatBalance) || 0;
    if (!(fiat > 0)) {
      return;
    }

    const assetKey = getAssetKey(w);
    const existing = byAssetKey.get(assetKey);
    if (existing) {
      existing.fiatValue += fiat;
      return;
    }

    byAssetKey.set(assetKey, {
      assetKey,
      currencyAbbreviation: (w.currencyAbbreviation || '').toLowerCase(),
      chain: (w.chain || '').toLowerCase(),
      tokenAddress: w.tokenAddress?.toLowerCase(),
      name: w.currencyName || w.currencyAbbreviation || '',
      fiatValue: fiat,
    });
  });

  const assets = Array.from(byAssetKey.values()).sort(
    (a, b) => b.fiatValue - a.fiatValue,
  );

  const totalFiat = assets.reduce((sum, a) => sum + (a.fiatValue || 0), 0);

  const rows: AllocationRowItem[] = assets.map(a => {
    const percent = toPercent(a.fiatValue, totalFiat);
    const color = getAssetColor(a.currencyAbbreviation, a.chain);
    return {
      key: a.assetKey,
      currencyAbbreviation: a.currencyAbbreviation,
      chain: a.chain,
      tokenAddress: a.tokenAddress,
      name: a.name,
      fiatAmount: formatFiatAmount(a.fiatValue, defaultAltCurrencyIsoCode, {
        currencyDisplay: 'symbol',
      }),
      percent: `${percent.toFixed(1)}%`,
      progress: percent,
      barColor: color,
    };
  });

  const topN = opts?.topN ?? 5;
  const includeOther = opts?.includeOther ?? true;

  const topAssets = assets.slice(0, topN);
  const remainderAssets = assets.slice(topN);
  const otherFiat = remainderAssets.reduce(
    (sum, a) => sum + (a.fiatValue || 0),
    0,
  );

  const legendItems: AllocationLegendItem[] = topAssets.map(a => {
    const percent = toPercent(a.fiatValue, totalFiat);
    return {
      key: a.assetKey,
      label: a.currencyAbbreviation.toUpperCase(),
      value: `${percent.toFixed(1)}%`,
      color: getAssetColor(a.currencyAbbreviation, a.chain),
    };
  });

  const slices: AllocationSlice[] = topAssets.map(a => {
    const percent = toPercent(a.fiatValue, totalFiat);
    return {
      key: a.assetKey,
      value: percent,
      color: getAssetColor(a.currencyAbbreviation, a.chain),
    };
  });

  if (includeOther && otherFiat > 0) {
    const percent = toPercent(otherFiat, totalFiat);
    legendItems.push({
      key: 'other',
      label: 'Other',
      value: `${percent.toFixed(1)}%`,
      color: {light: Slate, dark: SlateDark},
    });
    slices.push({
      key: 'other',
      value: percent,
      color: {light: Slate, dark: SlateDark},
    });
  }

  return {
    totalFiat,
    legendItems,
    slices,
    rows,
  };
};

export const getPortfolioAllocationTotalFiat = (params: {
  keys: Record<string, Key>;
}): number => {
  const {keys} = params;

  const visibleWallets = (Object.values(keys) as Key[])
    .flatMap((k: Key) => k.wallets)
    .filter((w: Wallet) => !w.hideWallet && !w.hideWalletByAccount);

  return visibleWallets.reduce(
    (sum, w) => sum + (Number((w.balance as any)?.fiat) || 0),
    0,
  );
};
