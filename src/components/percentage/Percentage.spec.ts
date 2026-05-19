import {
  getDifferenceColor,
  getNeutralChangeColor,
  getPercentageColor,
} from './Percentage';

describe('Percentage', () => {
  it('uses the range-label color for zero changes in light and dark mode', () => {
    for (const isDarkMode of [false, true]) {
      expect(
        getPercentageColor({
          percentageDifference: 0,
          isDarkMode,
        }),
      ).toBe(getNeutralChangeColor(isDarkMode));
    }
  });

  it('keeps non-zero values in gain and loss colors', () => {
    for (const [percentageDifference, isPositive] of [
      [1, true],
      [-1, false],
    ] as const) {
      expect(
        getPercentageColor({
          percentageDifference,
          isDarkMode: false,
        }),
      ).toBe(getDifferenceColor(isPositive, false));
    }
  });
});
