import {wordlists} from 'ethers';

const ENGLISH_WORD_COUNT = 2048;
const GAP_COUNT = 3;

export const pickGapIndexes = (
  wordCount: number,
  random: () => number = Math.random,
): number[] => {
  const pool = Array.from({length: wordCount}, (_, index) => index);
  const gaps: number[] = [];
  while (gaps.length < Math.min(GAP_COUNT, wordCount)) {
    gaps.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return gaps.sort((a, b) => a - b);
};

const sharedPrefixLength = (a: string, b: string) => {
  let length = 0;
  while (length < a.length && a[length] === b[length]) {
    length++;
  }
  return length;
};

export const getDecoyWords = (
  targets: string[],
  phrase: string[],
  random: () => number = Math.random,
): string[] => {
  const taken = new Set([...phrase, ...targets]);
  return targets.map(target => {
    let closest: string[] = [];
    let closestLength = -1;
    for (let index = 0; index < ENGLISH_WORD_COUNT; index++) {
      const candidate = wordlists.en.getWord(index);
      if (taken.has(candidate)) {
        continue;
      }
      const length = sharedPrefixLength(target, candidate);
      if (length > closestLength) {
        closest = [candidate];
        closestLength = length;
      } else if (length === closestLength) {
        closest.push(candidate);
      }
    }
    const decoy = closest[Math.floor(random() * closest.length)];
    taken.add(decoy);
    return decoy;
  });
};
