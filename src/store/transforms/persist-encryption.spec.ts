import {object} from './persist-encryption';
import {hasProtectedValue} from './encrypt';

it('accepts non-array objects including null prototypes without a plain-object restriction', () => {
  for (const value of [{}, Object.create(null), new Date(0)]) {
    expect(object(value)).toBe(true);
  }
  for (const value of [null, undefined, [], '', 0, false, () => {}]) {
    expect(object(value)).toBe(false);
  }
});

it('excludes only undefined, null and empty strings from protected values', () => {
  for (const value of [undefined, null, ''])
    expect(hasProtectedValue(value)).toBe(false);
  for (const value of [false, 0, [], {}, ' '])
    expect(hasProtectedValue(value)).toBe(true);
});
