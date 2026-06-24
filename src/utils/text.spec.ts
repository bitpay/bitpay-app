import {arrayToSentence} from './text';

describe('arrayToSentence', () => {
  it('returns empty string for empty array', () => {
    expect(arrayToSentence([])).toBe('');
  });

  it('returns empty string for null/undefined', () => {
    expect(arrayToSentence(null as any)).toBe('');
    expect(arrayToSentence(undefined as any)).toBe('');
  });

  it('returns the single item for a one-element array', () => {
    expect(arrayToSentence(['apples'])).toBe('apples');
  });

  it('joins two items with "and"', () => {
    expect(arrayToSentence(['apples', 'bananas'])).toBe('apples and bananas');
  });

  it('joins three items with Oxford comma', () => {
    expect(arrayToSentence(['apples', 'bananas', 'oranges'])).toBe(
      'apples, bananas, and oranges',
    );
  });

  it('joins four items with Oxford comma', () => {
    expect(arrayToSentence(['a', 'b', 'c', 'd'])).toBe('a, b, c, and d');
  });
});
