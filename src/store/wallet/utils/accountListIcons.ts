import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import {
  getBadgeImg,
  getCurrencyAbbreviation,
} from '../../../utils/helper-methods';

const MAX_RESTORE_DEPTH = 10;

const getCurrencyIcon = (
  currencyAbbreviation?: string,
  chain?: string,
): ((props?: any) => any) | undefined => {
  if (!currencyAbbreviation || !chain) {
    return undefined;
  }

  const iconKey = getCurrencyAbbreviation(
    currencyAbbreviation.toLowerCase(),
    chain.toLowerCase(),
  );

  return CurrencyListIcons[iconKey];
};

const restoreRowIcons = (row: Record<string, any>): void => {
  const {chain} = row;

  if (row.currencyAbbreviation && chain) {
    const icon = getCurrencyIcon(row.currencyAbbreviation, chain);
    if (icon) {
      row.img = icon;
    }

    row.badgeImg = getBadgeImg(
      getCurrencyAbbreviation(
        row.currencyAbbreviation.toLowerCase(),
        chain.toLowerCase(),
      ),
      chain,
    );
  }

  if (chain && !row.chainImg) {
    const chainIcon = CurrencyListIcons[chain.toLowerCase()];
    if (chainIcon) {
      row.chainImg = chainIcon;
    }
  }
};

export const restoreAccountListIcons = <T>(value: T, depth = 0): T => {
  if (depth > MAX_RESTORE_DEPTH || !value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    value.forEach(item => restoreAccountListIcons(item, depth + 1));
    return value;
  }

  const row = value as Record<string, any>;
  restoreRowIcons(row);

  Object.keys(row).forEach(key => {
    const nested = row[key];
    if (nested && typeof nested === 'object') {
      restoreAccountListIcons(nested, depth + 1);
    }
  });

  return value;
};
