import {ToBaseUnits} from './amount';

describe('ToBaseUnits', () => {
  it('should convert everyday amounts of an 18 decimal asset exactly', () => {
    expect(ToBaseUnits(8.54, 18)).toBe('8540000000000000000');
    expect(ToBaseUnits(0.07, 18)).toBe('70000000000000000');
    expect(ToBaseUnits(0.1, 18)).toBe('100000000000000000');
    expect(ToBaseUnits(1.5, 18)).toBe('1500000000000000000');
    expect(ToBaseUnits(1234.5, 18)).toBe('1234500000000000000000');
  });

  it('should convert amounts past 1e21 base units without exponential notation', () => {
    expect(ToBaseUnits(5000000, 18)).toBe('5000000000000000000000000');
    expect(ToBaseUnits(1000, 18)).toBe('1000000000000000000000');
  });

  it('should expand exponential input', () => {
    expect(ToBaseUnits(1e-7, 18)).toBe('100000000000');
    expect(ToBaseUnits(0.00000001, 8)).toBe('1');
  });

  it('should round input carrying more decimals than the asset supports', () => {
    expect(ToBaseUnits(0.1234567, 6)).toBe('123457');
    expect(ToBaseUnits(1234.56789, 6)).toBe('1234567890');
  });

  it('should keep the full precision of a string amount', () => {
    expect(ToBaseUnits('12345678912345678901', 0)).toBe('12345678912345678901');
    expect(ToBaseUnits('8.54', 18)).toBe('8540000000000000000');
  });

  it('should handle assets without decimals and zero', () => {
    expect(ToBaseUnits(123, 0)).toBe('123');
    expect(ToBaseUnits(0, 18)).toBe('0');
  });

  it('should pass through non finite input rather than throwing', () => {
    expect(ToBaseUnits(NaN, 18)).toBe('NaN');
    expect(ToBaseUnits(Infinity, 18)).toBe('Infinity');
  });

  it('should accept raw keypad input without throwing', () => {
    expect(ToBaseUnits('', 18)).toBe('0');
    expect(ToBaseUnits('0.', 18)).toBe('0');
    expect(ToBaseUnits('.5', 18)).toBe('500000000000000000');
    expect(ToBaseUnits('00.5', 18)).toBe('500000000000000000');
    expect(ToBaseUnits(' 1.5 ', 18)).toBe('1500000000000000000');
    expect(ToBaseUnits('1e5', 18)).toBe('100000000000000000000000');
    expect(ToBaseUnits('1.2.3', 18)).toBe('NaN');
  });

  it('should preserve a typed amount that a double cannot hold', () => {
    expect(ToBaseUnits('0.123456789123456789', 18)).toBe('123456789123456789');
    expect(ToBaseUnits('12.345678912345678901', 18)).toBe(
      '12345678912345678901',
    );
    expect(ToBaseUnits('1.000000000000000001', 18)).toBe('1000000000000000001');
  });
});
