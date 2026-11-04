import {compareCodeUnits} from './compareCodeUnits';

describe('compareCodeUnits', () => {
  it('orders and de-ties strings consistently', () => {
    const ids = ['b', 'a-0x1', 'a', 'A', 'a-0x1', '10', '9'];
    expect([...ids].sort(compareCodeUnits)).toEqual([
      '10',
      '9',
      'A',
      'a',
      'a-0x1',
      'a-0x1',
      'b',
    ]);
    expect(compareCodeUnits('x', 'x')).toBe(0);
  });

  it('gives the same order whatever the input order', () => {
    const ids = ['w3', 'w1-0xabc', 'w2', 'w1'];
    expect([...ids].sort(compareCodeUnits)).toEqual(
      [...ids].reverse().sort(compareCodeUnits),
    );
  });
});
