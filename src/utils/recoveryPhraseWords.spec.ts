import {
  autocorrectRecoveryWords,
  correctRecoveryWord,
  getEnglishWordsStartingWith,
  getNearestEnglishWords,
  getUniqueEnglishWord,
  isEnglishRecoveryWord,
  isValidEnglishPhrase,
} from './recoveryPhraseWords';

describe('correctRecoveryWord', () => {
  it.each([
    ['abandon', 'abandon'],
    ['Abandon ', 'abandon'],
    ['abandn', 'abandon'],
    ['abnadon', 'abandon'],
    ['abandonn', 'abandon'],
    ['aban', 'abandon'],
    ['enbark', 'embark'],
    ['zoi', 'zoo'],
  ])('corrects %s to %s', (input, expected) => {
    expect(correctRecoveryWord(input)).toBe(expected);
  });

  it.each([
    ['ab', 'too short to guess'],
    ['actr', 'could be act, actor or actress'],
    ['acton', 'could be action or actor'],
    ['xyzw', 'is nowhere near a word'],
    ['ábaco', 'is not a plain English word'],
  ])('leaves %s alone because it %s', input => {
    expect(correctRecoveryWord(input)).toBeUndefined();
  });
});

describe('autocorrectRecoveryWords', () => {
  it('fixes typos and flags what it cannot fix in an English phrase', () => {
    const words = ['abandon', 'abilty', 'able', 'acton', '', 'about'];

    expect(autocorrectRecoveryWords(words)).toEqual({
      words: ['abandon', 'ability', 'able', 'acton', '', 'about'],
      invalid: [false, false, false, true, false, false],
    });
  });

  it('does not touch a phrase with a word from another BIP39 language', () => {
    const words = ['abandon', 'actuel'];

    expect(autocorrectRecoveryWords(words)).toEqual({
      words,
      invalid: [false, false],
    });
  });

  it('still corrects an English phrase with a word that has punctuation', () => {
    expect(
      autocorrectRecoveryWords(['able', 'about', 'abandon!', 'abandn']),
    ).toEqual({
      words: ['able', 'about', 'abandon!', 'abandon'],
      invalid: [false, false, true, false],
    });
  });

  it('does not touch a phrase that is mostly in another language', () => {
    const words = ['ábaco', 'abdomen', 'abeja', 'abierto', 'abogado', 'about'];

    expect(autocorrectRecoveryWords(words)).toEqual({
      words,
      invalid: words.map(() => false),
    });
  });

  it('keeps every correction a BIP39 English word', () => {
    const {words} = autocorrectRecoveryWords([
      'able',
      'about',
      'above',
      'abandn',
      'zoi',
      'enbark',
    ]);

    expect(words.every(isEnglishRecoveryWord)).toBe(true);
  });
});

describe('getUniqueEnglishWord', () => {
  it.each([
    ['abil', 'ability'],
    ['acou', 'acoustic'],
  ])('completes %s to %s', (prefix, expected) => {
    expect(getUniqueEnglishWord(prefix)).toBe(expected);
  });

  it.each([
    ['aba', 'is shorter than four letters'],
    ['xyzw', 'matches no word'],
    ['actu', 'also starts the French word actuel'],
    ['zebr', 'also starts the French word zèbre'],
  ])('leaves %s alone because it %s', prefix => {
    expect(getUniqueEnglishWord(prefix)).toBeUndefined();
  });
});

describe('getEnglishWordsStartingWith', () => {
  it('suggests the first words that start with what was typed', () => {
    expect(getEnglishWordsStartingWith('ab', 3)).toEqual([
      'abandon',
      'ability',
      'able',
    ]);
    expect(getEnglishWordsStartingWith('', 3)).toEqual([]);
  });
});

describe('getNearestEnglishWords', () => {
  it('suggests the closest words for a misspelled word, closest first', () => {
    expect(getNearestEnglishWords('abandn', 3)[0]).toBe('abandon');
    expect(getNearestEnglishWords('qqqqqqqq', 3)).toEqual([]);
  });
});

describe('isValidEnglishPhrase', () => {
  it.each([
    [
      '12',
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    ],
    [
      '24',
      'legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth title',
    ],
  ])('accepts a valid %s-word phrase', (_count, phrase) => {
    expect(isValidEnglishPhrase(phrase.split(' '))).toBe(true);
  });

  it.each([
    [
      'a bad checksum',
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon',
    ],
    [
      'a word outside the list',
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abaco',
    ],
    [
      'eleven words',
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    ],
  ])('rejects a phrase with %s', (_label, phrase) => {
    expect(isValidEnglishPhrase(phrase.split(' '))).toBe(false);
  });
});
