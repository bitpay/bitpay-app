import {ASSETS} from '../constants/assets';

export const sleep = async (duration: number) =>
  await new Promise(resolve => setTimeout(resolve, duration));

export const normalizeMnemonic = (words: string): string => {
  if (!words || !words.indexOf) {
    return words;
  }

  // \u3000: A space of non-variable width: used in Chinese, Japanese, Korean
  const isJA = words.indexOf('\u3000') > -1;
  const wordList = words
    .trim()
    .toLowerCase()
    .split(/[\u3000\s]+/);

  return wordList.join(isJA ? '\u3000' : ' ');
};

export const coinSupported = (coin: string): boolean => {
  return Object.keys(ASSETS).some(
    availableCoin => availableCoin === coin.toLowerCase(),
  );
};
