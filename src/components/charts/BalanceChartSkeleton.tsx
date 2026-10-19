import React from 'react';
import {
  AccessibilityInfo,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {
  Canvas,
  Group,
  LinearGradient,
  Path as SkiaPath,
  Skia,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {useTheme} from '../../contexts';
import {BaseText} from '../styled/Text';
import {TouchableOpacity} from '../base/TouchableOpacity';
import {Action, LinkBlue, Slate, SlateDark} from '../../styles/colors';

export const BALANCE_CHART_SKELETON_CHART_HEIGHT = 220;
export const BALANCE_CHART_SKELETON_DRAW_MS = 1800;
export const BALANCE_CHART_SKELETON_HOLD_MS = 150;
export const BALANCE_CHART_SKELETON_FADE_MS = 250;
const GHOST_LINE_OPACITY = 0.55;
const GHOST_FILL_TOP_ALPHA = 0.22;
// The fill fades in with the drawn line, up to this layer opacity.
const GHOST_FILL_MAX_OPACITY = 0.5;
const GHOST_LINE_THICKNESS = 2.5;
const CAPTION_DOT_PULSE_MS = 600;

// The ghost curve is authored on a 340x220 canvas (same as the approved
// mock-up) and scaled to the measured width. It is deliberately smooth and
// low-amplitude so it never reads as real balance history.
const GHOST_DESIGN_WIDTH = 340;
const GHOST_DESIGN_HEIGHT = 220;
const GHOST_START: [number, number] = [10, 150];
const GHOST_SEGMENTS: Array<[number, number, number, number, number, number]> =
  [
    [70, 150, 90, 112, 150, 118],
    [210, 124, 240, 140, 280, 100],
    [320, 60, 320, 84, 330, 84],
  ];

export type BalanceChartSkeletonVariant = 'drawing' | 'static';

export type BalanceChartSkeletonProps = {
  /** `drawing` loops the self-drawing ghost line; `static` holds it still. */
  variant?: BalanceChartSkeletonVariant;
  /** Total frame height. Defaults to the line chart height (220). */
  height?: number;
  /** Height of the area the ghost curve is drawn into (from the top). */
  chartHeight?: number;
  /** Optional node rendered centred along the bottom of the frame. */
  caption?: React.ReactNode;
  /**
   * When false the frame is not announced as a progress indicator (used by
   * the error state, which announces its own message instead).
   */
  isLoading?: boolean;
  testID?: string;
};

const buildGhostPaths = (
  width: number,
  chartHeight: number,
): {line: SkPath; fill: SkPath} => {
  const sx = width / GHOST_DESIGN_WIDTH;
  const sy = chartHeight / GHOST_DESIGN_HEIGHT;
  const line = Skia.Path.Make();
  line.moveTo(GHOST_START[0] * sx, GHOST_START[1] * sy);
  for (const [c1x, c1y, c2x, c2y, x, y] of GHOST_SEGMENTS) {
    line.cubicTo(c1x * sx, c1y * sy, c2x * sx, c2y * sy, x * sx, y * sy);
  }

  const fill = Skia.Path.Make();
  fill.moveTo(GHOST_START[0] * sx, GHOST_START[1] * sy);
  for (const [c1x, c1y, c2x, c2y, x, y] of GHOST_SEGMENTS) {
    fill.cubicTo(c1x * sx, c1y * sy, c2x * sx, c2y * sy, x * sx, y * sy);
  }
  const lastX = GHOST_SEGMENTS[GHOST_SEGMENTS.length - 1][4] * sx;
  fill.lineTo(lastX, chartHeight);
  fill.lineTo(GHOST_START[0] * sx, chartHeight);
  fill.close();

  return {line, fill};
};

const withAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Matches the approved mock-up: Slate on light, a dimmer slate on dark so the
// ghost stays muted against the black chart background.
const GHOST_COLOR_LIGHT = Slate;
export const GHOST_COLOR_DARK = '#6B7480';

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  caption: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  captionText: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    flexShrink: 1,
  },
  captionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  retryButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginLeft: 4,
  },
  retryText: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
  },
});

const useMutedTextColor = () => {
  const theme = useTheme();
  return theme.dark ? Slate : SlateDark;
};

/**
 * Fixed-height chart placeholder: a generic ghost curve that draws itself
 * (Skia `end` driven by a Reanimated shared value), holds briefly, fades and
 * loops. All animation runs on the UI thread; the component itself only
 * re-renders on layout/theme/variant changes.
 */
const BalanceChartSkeleton = ({
  variant = 'drawing',
  height = BALANCE_CHART_SKELETON_CHART_HEIGHT,
  chartHeight = BALANCE_CHART_SKELETON_CHART_HEIGHT,
  caption,
  isLoading = true,
  testID = 'balance-chart-skeleton',
}: BalanceChartSkeletonProps): React.ReactElement => {
  const {t} = useTranslation();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const isAnimated = variant === 'drawing' && !reduceMotion;
  const resolvedChartHeight = Math.min(chartHeight, height);

  const [width, setWidth] = React.useState(0);
  const onLayout = React.useCallback(
    ({nativeEvent: {layout}}: LayoutChangeEvent) => {
      const next = Math.round(layout.width);
      if (Number.isFinite(next) && next > 0) {
        setWidth(prev => (prev === next ? prev : next));
      }
    },
    [],
  );

  const progress = useSharedValue(isAnimated ? 0 : 1);
  const cycleOpacity = useSharedValue(1);

  React.useEffect(() => {
    cancelAnimation(progress);
    cancelAnimation(cycleOpacity);
    if (!isAnimated) {
      progress.value = 1;
      cycleOpacity.value = 1;
      return;
    }

    progress.value = 0;
    cycleOpacity.value = 1;
    // Both loops share the same total cycle length so they stay in step:
    // draw -> hold -> fade out -> reset.
    progress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: BALANCE_CHART_SKELETON_DRAW_MS,
          easing: Easing.inOut(Easing.cubic),
        }),
        withDelay(
          BALANCE_CHART_SKELETON_HOLD_MS + BALANCE_CHART_SKELETON_FADE_MS,
          withTiming(0, {duration: 0}),
        ),
      ),
      -1,
      false,
    );
    cycleOpacity.value = withRepeat(
      withSequence(
        withDelay(
          BALANCE_CHART_SKELETON_DRAW_MS + BALANCE_CHART_SKELETON_HOLD_MS,
          withTiming(0, {
            duration: BALANCE_CHART_SKELETON_FADE_MS,
            easing: Easing.out(Easing.cubic),
          }),
        ),
        withTiming(1, {duration: 0}),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(progress);
      cancelAnimation(cycleOpacity);
    };
  }, [cycleOpacity, isAnimated, progress]);

  const lineOpacity = useDerivedValue(
    () => GHOST_LINE_OPACITY * cycleOpacity.value,
  );
  const fillOpacity = useDerivedValue(
    () => GHOST_FILL_MAX_OPACITY * progress.value * cycleOpacity.value,
  );

  const paths = React.useMemo(
    () => (width > 0 ? buildGhostPaths(width, resolvedChartHeight) : null),
    [resolvedChartHeight, width],
  );
  const ghostColor = theme.dark ? GHOST_COLOR_DARK : GHOST_COLOR_LIGHT;
  const fillColors = React.useMemo(
    () => [
      withAlpha(ghostColor, GHOST_FILL_TOP_ALPHA),
      withAlpha(ghostColor, 0),
    ],
    [ghostColor],
  );
  const gradientStart = React.useMemo(() => vec(0, 0), []);
  const gradientEnd = React.useMemo(
    () => vec(0, resolvedChartHeight),
    [resolvedChartHeight],
  );
  const frameStyle = React.useMemo(() => [styles.frame, {height}], [height]);
  const canvasStyle = React.useMemo(
    () => [styles.canvas, {height: resolvedChartHeight}],
    [resolvedChartHeight],
  );

  return (
    <View style={frameStyle} onLayout={onLayout} testID={testID}>
      <View
        style={canvasStyle}
        pointerEvents="none"
        testID={`${testID}-frame`}
        accessible={isLoading}
        accessibilityRole={isLoading ? 'progressbar' : undefined}
        accessibilityLabel={
          isLoading ? t('Loading balance history') : undefined
        }
        accessibilityState={isLoading ? {busy: true} : undefined}
        importantForAccessibility={isLoading ? 'yes' : 'no-hide-descendants'}>
        {paths ? (
          <Canvas style={StyleSheet.absoluteFill}>
            <Group opacity={fillOpacity}>
              <SkiaPath path={paths.fill} style="fill">
                <LinearGradient
                  start={gradientStart}
                  end={gradientEnd}
                  colors={fillColors}
                />
              </SkiaPath>
            </Group>
            <SkiaPath
              path={paths.line}
              style="stroke"
              strokeWidth={GHOST_LINE_THICKNESS}
              strokeCap="round"
              strokeJoin="round"
              color={ghostColor}
              opacity={lineOpacity}
              start={0}
              end={progress}
            />
          </Canvas>
        ) : null}
      </View>
      {caption ? (
        <View
          style={styles.caption}
          pointerEvents="box-none"
          testID={`${testID}-caption`}>
          {caption}
        </View>
      ) : null}
    </View>
  );
};

/** Caption shown under the ghost line while wallet history is populating. */
export const BalanceChartPopulateCaption = React.memo(
  ({completed, total}: {completed: number; total: number}) => {
    const {t} = useTranslation();
    const theme = useTheme();
    const reduceMotion = useReducedMotion();
    const mutedTextColor = useMutedTextColor();
    const dotOpacity = useSharedValue(1);

    React.useEffect(() => {
      cancelAnimation(dotOpacity);
      if (reduceMotion) {
        dotOpacity.value = 1;
        return;
      }
      dotOpacity.value = 0.35;
      dotOpacity.value = withRepeat(
        withTiming(1, {
          duration: CAPTION_DOT_PULSE_MS,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
      return () => {
        cancelAnimation(dotOpacity);
      };
    }, [dotOpacity, reduceMotion]);

    const dotAnimatedStyle = useAnimatedStyle(() => ({
      opacity: dotOpacity.value,
    }));
    const dotColor = theme.dark ? LinkBlue : Action;

    return (
      <View style={styles.captionRow} testID="balance-chart-populate-caption">
        <Reanimated.View
          style={[
            styles.captionDot,
            {backgroundColor: dotColor},
            dotAnimatedStyle,
          ]}
        />
        <BaseText
          style={[styles.captionText, {color: mutedTextColor}]}
          numberOfLines={1}>
          {t('Updating history · {{completed}} of {{count}} wallets', {
            completed,
            count: total,
          })}
        </BaseText>
      </View>
    );
  },
);

/** Caption shown under the frozen ghost line when history failed to load. */
export const BalanceChartErrorCaption = React.memo(
  ({onRetry}: {onRetry?: () => void}) => {
    const {t} = useTranslation();
    const theme = useTheme();
    const mutedTextColor = useMutedTextColor();
    const actionColor = theme.dark ? LinkBlue : Action;
    const message = t("Couldn't load balance history.");

    // accessibilityRole="alert" on Text is not reliably announced on iOS or
    // Android, so announce the failure explicitly when it appears.
    React.useEffect(() => {
      AccessibilityInfo.announceForAccessibility(message);
    }, [message]);

    return (
      <View style={styles.captionRow} testID="balance-chart-error-caption">
        <BaseText
          accessibilityRole="alert"
          style={[styles.captionText, {color: mutedTextColor}]}
          numberOfLines={2}>
          {message}
        </BaseText>
        {onRetry ? (
          <TouchableOpacity
            touchableLibrary="react-native"
            testID="balance-chart-retry-button"
            accessibilityRole="button"
            accessibilityLabel={t('Retry')}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            style={styles.retryButton}
            onPress={onRetry}>
            <BaseText style={[styles.retryText, {color: actionColor}]}>
              {t('Retry')}
            </BaseText>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  },
);

export default React.memo(BalanceChartSkeleton);
