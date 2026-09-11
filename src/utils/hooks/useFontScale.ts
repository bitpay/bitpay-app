import {useWindowDimensions} from 'react-native';

/**
 * Past this multiplier a dense multi-column row can no longer fit horizontally
 * and has to stack. Roughly iOS' first accessibility content size.
 */
export const STACKED_LAYOUT_FONT_SCALE = 1.5;

export const useFontScale = () => useWindowDimensions().fontScale;

export const useIsLargeFont = (threshold = STACKED_LAYOUT_FONT_SCALE) =>
  useWindowDimensions().fontScale >= threshold;
