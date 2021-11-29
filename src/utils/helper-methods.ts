import { ASSETS } from '../constants/assets';

export const sleep = async (duration: number) =>
  await new Promise(resolve => setTimeout(resolve, duration));

export const normalizeMnemonic = (words: string): string => {
  if (!words || !words.indexOf) return words;

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

// export const getMatchedKey = (key) => {
//   return this.keys.find(k => this.isMatch(key, k));
// };
//
// export const isMatch = (key1, key2)  => {
//   if (key1.fingerPrint && key2.fingerPrint)
//     return key1.fingerPrint === key2.fingerPrint;
//   else return key1.id === key2.id;
// };