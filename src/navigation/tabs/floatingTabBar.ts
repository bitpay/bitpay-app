export const FLOATING_TAB_BAR_HEIGHT = 64;
export const FLOATING_TAB_BAR_MARGIN_HORIZONTAL = 21;
export const FLOATING_TAB_BAR_MAX_WIDTH = 320;

export const getFloatingTabBarWidth = (windowWidth: number) =>
  Math.min(
    windowWidth - FLOATING_TAB_BAR_MARGIN_HORIZONTAL * 2,
    FLOATING_TAB_BAR_MAX_WIDTH,
  );

export const getFloatingTabBarBottomOffset = (insetsBottom: number) =>
  Math.max(insetsBottom - 8, 12);
