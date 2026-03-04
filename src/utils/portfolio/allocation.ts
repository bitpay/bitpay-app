import type {WalletRowProps} from '../../components/list/WalletRow';
import {formatCurrencyAbbreviation, formatFiatAmount} from '../helper-methods';
import type {Key, Wallet} from '../../store/wallet/wallet.models';
import type {HomeCarouselConfig} from '../../store/app/app.models';
import {Slate, SlateDark} from '../../styles/colors';
import {
  BitpaySupportedCoins,
  BitpaySupportedTokens,
} from '../../constants/currencies';
import {getVisibleWalletsFromKeys} from './assets';

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

export const toAllocationWallet = (w: Wallet): AllocationWallet => {
  return {
    currencyAbbreviation: w.currencyAbbreviation,
    chain: w.chain,
    tokenAddress: w.tokenAddress,
    currencyName: w.currencyName,
    fiatBalance: (w.balance as any)?.fiat,
  };
};

export type AllocationLegendItem = {
  key: string;
  label: string;
  isOther?: boolean;
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

const tokenThemeByCoin: {[key in string]: string} = Object.values(
  BitpaySupportedTokens,
).reduce((acc, token) => {
  const coinKey = (token.coin || '').toLowerCase();
  const color = token.theme?.coinColor;
  if (coinKey && color && !acc[coinKey]) {
    acc[coinKey] = color;
  }
  return acc;
}, {} as {[key in string]: string});

const getAssetColor = (
  currencyAbbreviation: string,
  chain?: string,
): {light: string; dark: string} => {
  const coinKey = (currencyAbbreviation || '').toLowerCase();
  const chainKey = (chain || '').toLowerCase();

  const themeColor =
    BitpaySupportedCoins[coinKey]?.theme?.coinColor ||
    BitpaySupportedCoins[chainKey]?.theme?.coinColor ||
    tokenThemeByCoin[coinKey];

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

const formatAllocationPercent = (percent: number): string => {
  if (percent > 0 && percent < 0.1) {
    return '<0.1%';
  }
  return `${percent.toFixed(1)}%`;
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

    const assetKey = (w.currencyAbbreviation || '').toLowerCase();
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

  const assetsWithMetrics = assets.map(a => {
    const percent = toPercent(a.fiatValue, totalFiat);
    return {
      ...a,
      percent,
      color: getAssetColor(a.currencyAbbreviation, a.chain),
    };
  });

  const rows: AllocationRowItem[] = assetsWithMetrics.map(a => {
    return {
      key: a.assetKey,
      currencyAbbreviation: a.currencyAbbreviation,
      chain: a.chain,
      tokenAddress: a.tokenAddress,
      name: a.name,
      fiatAmount: formatFiatAmount(a.fiatValue, defaultAltCurrencyIsoCode, {
        currencyDisplay: 'symbol',
      }),
      percent: formatAllocationPercent(a.percent),
      progress: a.percent,
      barColor: a.color,
    };
  });

  const topN = opts?.topN ?? 5;
  const includeOther = opts?.includeOther ?? true;

  const topAssets = assetsWithMetrics.slice(0, topN);
  const remainderAssets = assetsWithMetrics.slice(topN);
  const otherFiat = remainderAssets.reduce(
    (sum, a) => sum + (a.fiatValue || 0),
    0,
  );

  const legendItems: AllocationLegendItem[] = topAssets.map(a => {
    return {
      key: a.assetKey,
      label: formatCurrencyAbbreviation(a.currencyAbbreviation || ''),
      value: formatAllocationPercent(a.percent),
      color: a.color,
    };
  });

  const slices: AllocationSlice[] = topAssets.map(a => {
    return {
      key: a.assetKey,
      value: a.percent,
      color: a.color,
    };
  });

  if (includeOther && otherFiat > 0) {
    const percent = toPercent(otherFiat, totalFiat);
    legendItems.push({
      key: 'other',
      label: '',
      isOther: true,
      value: formatAllocationPercent(percent),
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
  homeCarouselConfig?: HomeCarouselConfig[] | undefined;
}): number => {
  const {keys, homeCarouselConfig} = params;

  const visibleWallets = getVisibleWalletsFromKeys(keys, homeCarouselConfig);

  return visibleWallets.reduce(
    (sum, w) => sum + (Number((w.balance as any)?.fiat) || 0),
    0,
  );
};
