import {ASSETS} from '../constants/assets';

export const sleep = async (duration: number) =>
  await new Promise(resolve => setTimeout(resolve, duration));

export const coinSupported = (coin: string): boolean => {
  return Object.keys(ASSETS).some(
    availableCoin => availableCoin === coin.toLowerCase(),
  );
};
