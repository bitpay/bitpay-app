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
  const maxLocation = Math.max(
    AXIS_LABEL_HORIZONTAL_PADDING,
    chartWidth - textWidth,
  );

  return Math.min(
    Math.max(location, AXIS_LABEL_HORIZONTAL_PADDING),
    maxLocation,
  );
};
