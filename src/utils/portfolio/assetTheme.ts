import {
  BitpaySupportedCoins,
  BitpaySupportedTokens,
  type CurrencyOpts,
} from '../../constants/currencies';
import {addTokenChainSuffix} from '../helper-methods';

export type AssetTheme = NonNullable<CurrencyOpts['theme']>;

export type AssetThemeArgs = {
  currencyAbbreviation?: string;
  chain?: string;
  tokenAddress?: string;
};

const normalize = (value: string | undefined): string =>
  (value || '').toLowerCase();

const solidTheme = (color: string): AssetTheme => ({
  coinColor: color,
  backgroundColor: color,
  gradientBackgroundColor: color,
});

const tokenThemeByCoin: {[key in string]: AssetTheme} = Object.values(
  BitpaySupportedTokens,
).reduce((acc, token) => {
  const coinKey = normalize(token.coin);
  const color = token.theme?.coinColor;
  if (coinKey && color && !acc[coinKey]) {
    acc[coinKey] = solidTheme(color);
  }
  return acc;
}, {} as {[key in string]: AssetTheme});

export const getAssetTheme = (args: AssetThemeArgs): AssetTheme | undefined => {
  const chain = normalize(args.chain);
  const currencyAbbreviation = normalize(args.currencyAbbreviation);
  const tokenAddress =
    typeof args.tokenAddress === 'string' ? args.tokenAddress.trim() : '';
  const assetTheme = currencyAbbreviation
    ? BitpaySupportedCoins[currencyAbbreviation]?.theme
    : undefined;

  if (tokenAddress && chain) {
    const tokenKey = addTokenChainSuffix(tokenAddress, chain);
    const strictTheme = BitpaySupportedTokens[tokenKey]?.theme;
    if (strictTheme) {
      return strictTheme;
    }
  }

  const fallbackTokenTheme = tokenThemeByCoin[currencyAbbreviation];
  if (fallbackTokenTheme) {
    return fallbackTokenTheme;
  }

  if (assetTheme) {
    return assetTheme;
  }

  if (!chain) {
    return undefined;
  }

  return BitpaySupportedCoins[chain]?.theme;
};
