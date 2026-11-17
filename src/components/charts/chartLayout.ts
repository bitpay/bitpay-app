/** Fade used for chart chrome (axis labels, change row) appearing/hiding. */
export const ZERO_BALANCE_AXIS_LABEL_FADE_MS = 180;

const AXIS_LABEL_HORIZONTAL_PADDING = 5;

export const getChartAxisLabelPointRatio = (
  pointIndex: number,
  arrayLength: number,
): number => {
  if (arrayLength <= 1) {
    return 0.5;
  }

  const maxIndex = arrayLength - 1;
  const safePointIndex = Math.min(Math.max(pointIndex, 0), maxIndex);
  return safePointIndex / maxIndex;
};

export const getChartAxisLabelTranslateX = ({
  index,
  arrayLength,
  chartWidth,
  textWidth,
}: {
  index: number;
  arrayLength: number;
  chartWidth: number;
  textWidth: number;
}): number => {
  const location =
    getChartAxisLabelPointRatio(index, arrayLength) * chartWidth -
    textWidth / 2;
  const minLocation = AXIS_LABEL_HORIZONTAL_PADDING;
  const maxLocation = Math.max(
    minLocation,
    chartWidth - textWidth - AXIS_LABEL_HORIZONTAL_PADDING,
  );

  return Math.min(Math.max(location, minLocation), maxLocation);
};
