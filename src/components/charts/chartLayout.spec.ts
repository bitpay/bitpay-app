import {getChartAxisLabelTranslateX} from './chartLayout';

describe('getChartAxisLabelTranslateX', () => {
  it('keeps labels padded away from the left edge', () => {
    expect(
      getChartAxisLabelTranslateX({
        index: 0,
        arrayLength: 10,
        chartWidth: 100,
        textWidth: 30,
      }),
    ).toBe(5);
  });

  it('keeps labels padded away from the right edge', () => {
    expect(
      getChartAxisLabelTranslateX({
        index: 9,
        arrayLength: 10,
        chartWidth: 100,
        textWidth: 30,
      }),
    ).toBe(65);
  });

  it('leaves centered labels at their point-centered location', () => {
    expect(
      getChartAxisLabelTranslateX({
        index: 5,
        arrayLength: 11,
        chartWidth: 100,
        textWidth: 20,
      }),
    ).toBe(40);
  });
});
