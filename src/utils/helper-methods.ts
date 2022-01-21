import {Currencies} from '../constants/currencies';

export const sleep = async (duration: number) =>
  await new Promise(resolve => setTimeout(resolve, duration));

export const coinSupported = (coin: string): boolean => {
  return Object.keys(Currencies).some(
    availableCoin => availableCoin === coin.toLowerCase(),
  );
};

export const formatFiatBalance = (balance = 0) => {
  return `$${balance.toFixed(2)}`;
};

export const titleCasing = (str: string) =>
  `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
