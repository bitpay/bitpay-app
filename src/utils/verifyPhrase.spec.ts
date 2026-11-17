import {getDecoyWords, pickGapIndexes} from './verifyPhrase';

const phrase =
  'abandon ability able about above absent absorb abstract absurd abuse access accident'.split(
    ' ',
  );

describe('pickGapIndexes', () => {
  it('picks three different positions in order', () => {
    const gaps = pickGapIndexes(12, () => 0.99);

    expect(gaps).toEqual([9, 10, 11]);
  });

  it.each([0, 0.3, 0.5, 0.99])(
    'never repeats a position when random returns %s',
    value => {
      const gaps = pickGapIndexes(12, () => value);

      expect(new Set(gaps).size).toBe(3);
      expect(gaps.every(gap => gap >= 0 && gap < 12)).toBe(true);
    },
  );
});

describe('getDecoyWords', () => {
  it('picks a look-alike word that is not in the phrase', () => {
    const [decoy] = getDecoyWords(['theme'], phrase, () => 0);

    expect(decoy.startsWith('the')).toBe(true);
    expect(decoy).not.toBe('theme');
  });

  it('never offers a phrase word or the same decoy twice', () => {
    const targets = ['about', 'above', 'absent'];

    const decoys = getDecoyWords(targets, phrase, () => 0);

    expect(new Set(decoys).size).toBe(3);
    decoys.forEach(decoy => {
      expect(phrase).not.toContain(decoy);
      expect(decoy.startsWith('a')).toBe(true);
    });
  });
});
