import {utils, wordlists} from 'ethers';

const ENGLISH_WORD_COUNT = 2048;
const MIN_CORRECTABLE_LENGTH = 3;
const ASCII_NON_LETTER = /[^a-z\u0080-\uffff]/i;

let englishWords: string[] | undefined;
let otherLanguageWords: string[] | undefined;

const getEnglishWords = (): string[] => {
  if (!englishWords) {
    englishWords = Array.from({length: ENGLISH_WORD_COUNT}, (_, index) =>
      wordlists.en.getWord(index),
    );
  }
  return englishWords;
};

const stripDiacritics = (word: string) =>
  word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const getOtherLanguageWords = (): string[] => {
  if (!otherLanguageWords) {
    otherLanguageWords = Object.keys(wordlists)
      .filter(locale => locale !== 'en')
      .flatMap(locale =>
        Array.from({length: ENGLISH_WORD_COUNT}, (_, index) =>
          stripDiacritics(wordlists[locale].getWord(index)),
        ),
      );
  }
  return otherLanguageWords;
};

const isInWordlist = (locale: string, word: string): boolean =>
  wordlists[locale].getWordIndex(word.trim().toLowerCase()) >= 0;

export const isEnglishRecoveryWord = (word: string): boolean =>
  isInWordlist('en', word);

export const isOtherLanguageRecoveryWord = (word: string): boolean =>
  !ASCII_NON_LETTER.test(word.trim()) &&
  Object.keys(wordlists).some(
    locale => locale !== 'en' && isInWordlist(locale, word),
  );

const isOneEditApart = (a: string, b: string): boolean => {
  if (a.length === b.length) {
    const diffs = [...a].flatMap((char, index) =>
      char === b[index] ? [] : [index],
    );
    return (
      diffs.length === 1 ||
      (diffs.length === 2 &&
        diffs[1] === diffs[0] + 1 &&
        a[diffs[0]] === b[diffs[1]] &&
        a[diffs[1]] === b[diffs[0]])
    );
  }
  if (Math.abs(a.length - b.length) !== 1) {
    return false;
  }
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  let index = 0;
  while (index < shorter.length && shorter[index] === longer[index]) {
    index++;
  }
  return shorter.slice(index) === longer.slice(index + 1);
};

export const correctRecoveryWord = (input: string): string | undefined => {
  const word = input.trim().toLowerCase();
  if (isEnglishRecoveryWord(word)) {
    return word;
  }
  if (word.length < MIN_CORRECTABLE_LENGTH || !/^[a-z]+$/.test(word)) {
    return undefined;
  }
  const candidates = getEnglishWords().filter(
    candidate => candidate.startsWith(word) || isOneEditApart(word, candidate),
  );
  return candidates.length === 1 ? candidates[0] : undefined;
};

export const autocorrectRecoveryWords = (
  words: string[],
): {words: string[]; invalid: boolean[]} => {
  const filled = words.filter(word => word.trim());
  const english = filled.filter(isEnglishRecoveryWord);
  const otherLanguage = filled.some(
    word => !isEnglishRecoveryWord(word) && isOtherLanguageRecoveryWord(word),
  );
  if (!filled.length || otherLanguage || english.length * 2 < filled.length) {
    return {words, invalid: words.map(() => false)};
  }
  const corrected = words.map(word =>
    word.trim() ? correctRecoveryWord(word) ?? word : word,
  );
  return {
    words: corrected,
    invalid: corrected.map(
      word => !!word.trim() && !isEnglishRecoveryWord(word),
    ),
  };
};

const UNIQUE_PREFIX_LENGTH = 4;
const MAX_SUGGESTION_DISTANCE = 2;

const editDistance = (a: string, b: string): number => {
  let previous = Array.from({length: b.length + 1}, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
};

export const getEnglishWordsStartingWith = (
  prefix: string,
  limit: number,
): string[] =>
  prefix
    ? getEnglishWords()
        .filter(word => word.startsWith(prefix))
        .slice(0, limit)
    : [];

export const getUniqueEnglishWord = (prefix: string): string | undefined => {
  if (
    prefix.length < UNIQUE_PREFIX_LENGTH ||
    getOtherLanguageWords().some(word => word.startsWith(prefix))
  ) {
    return undefined;
  }
  const matches = getEnglishWordsStartingWith(prefix, 2);
  return matches.length === 1 ? matches[0] : undefined;
};

export const getNearestEnglishWords = (word: string, limit: number) =>
  getEnglishWords()
    .map(candidate => ({candidate, distance: editDistance(word, candidate)}))
    .filter(({distance}) => distance <= MAX_SUGGESTION_DISTANCE)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({candidate}) => candidate);

export const isValidEnglishPhrase = (words: string[]): boolean =>
  !!words.length &&
  !(words.length % 3) &&
  words.length <= 24 &&
  utils.isValidMnemonic(words.join(' '), wordlists.en);
