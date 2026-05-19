import {
  getDifferenceColor,
  getNeutralChangeColor,
  getPercentageColor,
} from './Percentage';

describe('Percentage', () => {
  it('uses the range-label color for zero changes in light and dark mode', () => {
    expect(
      getPercentageColor({
        percentageDifference: 0,
        isDarkMode: false,
      }),
    ).toBe(getNeutralChangeColor(false));

    expect(
      getPercentageColor({
        percentageDifference: 0,
        isDarkMode: true,
      }),
    ).toBe(getNeutralChangeColor(true));
  });

  it('keeps non-zero values in gain and loss colors', () => {
    expect(
      getPercentageColor({
        percentageDifference: 1,
        isDarkMode: false,
      }),
    ).toBe(getDifferenceColor(true, false));

    expect(
      getPercentageColor({
        percentageDifference: -1,
        isDarkMode: false,
      }),
    ).toBe(getDifferenceColor(false, false));
  });
});
