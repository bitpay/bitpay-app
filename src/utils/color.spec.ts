import {hexToRGB, getBrightness, isDark} from './color';

describe('hexToRGB', () => {
  it('converts a 6-digit hex to rgb', () => {
    expect(hexToRGB('#ffffff')).toBe('rgb(255,255,255)');
    expect(hexToRGB('#000000')).toBe('rgb(0,0,0)');
    expect(hexToRGB('#ff0000')).toBe('rgb(255,0,0)');
    expect(hexToRGB('#1a3b8b')).toBe('rgb(26,59,139)');
  });

  it('converts a 3-digit hex to rgb', () => {
    expect(hexToRGB('#fff')).toBe('rgb(255,255,255)');
    expect(hexToRGB('#000')).toBe('rgb(0,0,0)');
    expect(hexToRGB('#f00')).toBe('rgb(255,0,0)');
  });
});

describe('getBrightness', () => {
  it('returns 255 for white', () => {
    expect(getBrightness('#ffffff')).toBeCloseTo(255, 0);
  });

  it('returns 0 for black', () => {
    expect(getBrightness('#000000')).toBe(0);
  });

  it('accepts rgb strings directly', () => {
    expect(getBrightness('rgb(255,255,255)')).toBeCloseTo(255, 0);
    expect(getBrightness('rgb(0,0,0)')).toBe(0);
  });

  it('returns a value between 0 and 255', () => {
    const brightness = getBrightness('#1a3b8b');
    expect(brightness).toBeGreaterThanOrEqual(0);
    expect(brightness).toBeLessThanOrEqual(255);
  });
});

describe('isDark', () => {
  it('returns true for dark colors', () => {
    expect(isDark('#000000')).toBe(true);
    expect(isDark('#1a3b8b')).toBe(true); // BitPay dark blue
    expect(isDark('#333333')).toBe(true);
  });

  it('returns false for light colors', () => {
    expect(isDark('#ffffff')).toBe(false);
    expect(isDark('#ffff00')).toBe(false);
    expect(isDark('#cccccc')).toBe(false);
  });
});
