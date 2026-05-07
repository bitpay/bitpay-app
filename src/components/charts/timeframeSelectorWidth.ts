export const getTimeframeSelectorWidth = (
  windowWidth: number,
  screenGutter: string,
): number => Math.max(windowWidth - Number.parseInt(screenGutter, 10) * 2, 0);
