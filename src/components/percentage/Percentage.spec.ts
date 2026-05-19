import {
  getDifferenceColor,
  getNeutralChangeColor,
  getPercentageColor,
} from './Percentage';

describe('Percentage', () => {
  it('uses gain color for zero values by default', () => {
    expect(
      getPercentageColor({
        percentageDifference: 0,
        isDarkMode: false,
      }),
    ).toBe(getDifferenceColor(true, false));
  });

  it('uses the range-label color for neutral zero changes in light and dark mode', () => {
    expect(
      getPercentageColor({
        percentageDifference: 0,
        isDarkMode: false,
        neutralZeroChange: true,
      }),
    ).toBe(getNeutralChangeColor(false));

    expect(
      getPercentageColor({
        percentageDifference: 0,
        isDarkMode: true,
        neutralZeroChange: true,
      }),
    ).toBe(getNeutralChangeColor(true));
  });

  it('keeps non-zero values in gain and loss colors when neutral zero mode is enabled', () => {
    expect(
      getPercentageColor({
        percentageDifference: 1,
        isDarkMode: false,
        neutralZeroChange: true,
      }),
    ).toBe(getDifferenceColor(true, false));

    expect(
      getPercentageColor({
        percentageDifference: -1,
        isDarkMode: false,
        neutralZeroChange: true,
      }),
    ).toBe(getDifferenceColor(false, false));
  });
});
