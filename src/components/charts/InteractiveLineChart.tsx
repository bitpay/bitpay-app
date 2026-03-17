import React from 'react';
import {LayoutChangeEvent} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import styled, {useTheme} from 'styled-components/native';
import {LineGraph, type GraphPoint} from 'react-native-graph';
import type {SelectionDotProps} from 'react-native-graph';
import Svg, {Line} from 'react-native-svg';
import Reanimated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Loader from '../loader/Loader';
import {Slate, SlateDark} from '../../styles/colors';
import {isNumberSharedValue, type NumberSharedValue} from './sharedValueGuards';

const ChartContainer = styled.View`
  width: 100%;
`;

const ChartInner = styled.View`
  position: relative;
  align-items: stretch;
  justify-content: center;
  height: 220px;
`;

const ChartLoaderOverlay = styled.View`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  justify-content: center;
  align-items: center;
`;

const AnimatedSvgLine = Reanimated.createAnimatedComponent(Line);

const FIRST_POINT_GUIDE_LINE_DASH_LENGTH = 2.5;
const FIRST_POINT_GUIDE_LINE_GAP_LENGTH = 4.1;
const FIRST_POINT_GUIDE_LINE_SVG_HEIGHT = 4;

export type InteractiveLineChartAxisLabelProps = {
  width?: number;
};

export type InteractiveLineChartProps = {
  points: GraphPoint[];
  color: string;
  gradientFillColors: [string, string];
  width?: number;
  lineThickness?: number;
  /**
   * If the chart is being scaled by an ancestor transform, pass that scale here.
   *
   * We use this to compensate stroke widths (and dash pattern) so they appear
   * visually constant even while the chart view itself is being scaled.
   */
  strokeScale?: number | NumberSharedValue;
  /**
   * Optional lower bound for `strokeScale`.
   *
   * When the chart is animated with an ancestor scale transform, the
   * compensated stroke can become much thicker than its base thickness.
   * `react-native-graph` computes the path using a static `verticalPadding`, so
   * if we know the smallest scale the animation can reach we can reserve enough
   * padding up-front to avoid edge clipping without animating layout.
   */
  minStrokeScale?: number;
  isLoading?: boolean;
  hideLineWhileLoading?: boolean;
  enablePanGesture?: boolean;
  panGestureDelay?: number;
  animated?: boolean;
  SelectionDot?: React.ComponentType<SelectionDotProps>;
  TopAxisLabel?: React.ComponentType<InteractiveLineChartAxisLabelProps>;
  BottomAxisLabel?: React.ComponentType<InteractiveLineChartAxisLabelProps>;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
  onPointSelected?: (point: GraphPoint) => void;
  showFirstPointGuideLine?: boolean;
  firstPointGuideLineColor?: string;
};

type AxisLabelRendererProps = Record<string, unknown>;
type AxisLabelRenderer = (
  props?: AxisLabelRendererProps,
) => React.ReactElement | null;
type SvgLineAnimatedProps = Partial<React.ComponentProps<typeof Line>>;

const clonePointsForGraph = (
  points: GraphPoint[],
  _refreshInputs: readonly [string, number, number],
): GraphPoint[] => {
  return points.slice();
};

const InteractiveLineChart = ({
  points,
  color,
  gradientFillColors,
  width,
  lineThickness,
  strokeScale,
  minStrokeScale,
  isLoading,
  hideLineWhileLoading = false,
  enablePanGesture = true,
  panGestureDelay = 100,
  animated = true,
  SelectionDot,
  TopAxisLabel,
  BottomAxisLabel,
  onGestureEnd,
  onGestureStart,
  onPointSelected,
  showFirstPointGuideLine = false,
  firstPointGuideLineColor,
}: InteractiveLineChartProps): React.ReactElement => {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const graphHeight = 200;
  const graphMarginTop = 10;
  const axisLabelPadding = 20;
  const axisRowHeight = 17;

  const [chartWidth, setChartWidth] = React.useState<number>();
  const [lineGraphLayout, setLineGraphLayout] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const firstPointGuideLineTop = useSharedValue(0);
  const isGuideLineTopInitializedRef = React.useRef(false);
  const resolvedChartWidth =
    typeof width === 'number' && width > 0 ? width : chartWidth;
  const resolvedChartWidthRef = React.useRef(resolvedChartWidth);
  const topAxisLabelRef = React.useRef(TopAxisLabel);
  const bottomAxisLabelRef = React.useRef(BottomAxisLabel);

  resolvedChartWidthRef.current = resolvedChartWidth;
  topAxisLabelRef.current = TopAxisLabel;
  bottomAxisLabelRef.current = BottomAxisLabel;

  const effectiveLineThickness =
    typeof lineThickness === 'number' ? lineThickness : theme.dark ? 2 : 4;

  const strokeScaleIsSharedValue = isNumberSharedValue(strokeScale);
  const sharedStrokeScale = strokeScaleIsSharedValue ? strokeScale : undefined;

  const strokeScaleNumber =
    typeof strokeScale === 'number' && Number.isFinite(strokeScale)
      ? strokeScale
      : 1;
  const safeStrokeScaleNumber = strokeScaleNumber > 0 ? strokeScaleNumber : 1;
  const lineThicknessCompensationExponent = strokeScaleIsSharedValue ? 0.9 : 1;

  /**
   * If an ancestor is scaling this chart view (e.g. during a collapse/expand
   * animation), compensate stroke widths so the chart line & dash pattern keep
   * a constant visual thickness.
   */
  const strokeScaleValue = useDerivedValue(() => {
    'worklet';

    // Support callers passing either a number or a Reanimated shared/derived value.
    const scale = sharedStrokeScale?.value ?? strokeScaleNumber;
    return Number.isFinite(scale) ? scale : 1;
  }, [sharedStrokeScale, strokeScaleNumber]);

  // IMPORTANT: react-native-graph's LineGraph is implemented as a composite
  // component that renders Skia primitives. Reanimated's `animatedProps`
  // cannot update its JS props without a React re-render.
  //
  // However, RN Skia *does* support Reanimated shared/derived values directly.
  // By passing a derived value as `lineThickness`, the underlying `<Path
  // strokeWidth={lineThickness} />` updates on the UI thread without forcing
  // React re-renders (i.e. no jank).
  const compensatedLineThickness = useDerivedValue(() => {
    'worklet';
    const scale = strokeScaleValue.value;
    // Guard against accidental 0/negative scales.
    const safeScale = scale > 0 ? scale : 1;
    return (
      effectiveLineThickness /
      Math.pow(safeScale, lineThicknessCompensationExponent)
    );
  }, [
    effectiveLineThickness,
    lineThicknessCompensationExponent,
    strokeScaleValue,
  ]);

  // Prefer a plain number when we don't need dynamic compensation. This keeps
  // behavior compatible with non-animated graph implementations.
  const lineThicknessForGraph: number | NumberSharedValue =
    strokeScaleIsSharedValue
      ? compensatedLineThickness
      : effectiveLineThickness /
        Math.pow(safeStrokeScaleNumber, lineThicknessCompensationExponent);

  const firstPointGuideLineAnimatedProps =
    useAnimatedProps<SvgLineAnimatedProps>(() => {
      const scale = strokeScaleValue.value;
      const safeScale = scale > 0 ? scale : 1;

      return {
        // Keep the dash thickness constant under the parent scale.
        strokeWidth: 1 / safeScale,
        // Keep dash + gap lengths constant under the parent scale.
        strokeDasharray: [
          FIRST_POINT_GUIDE_LINE_DASH_LENGTH / safeScale,
          FIRST_POINT_GUIDE_LINE_GAP_LENGTH / safeScale,
        ],
      };
    }, [strokeScaleValue]);

  /**
   * THEME SWITCH BEHAVIOR (important)
   *
   * Requirements:
   *   - Theme changes must immediately update chart color + thickness.
   *   - Theme changes must not trigger any visible animation.
   *   - Timeframe switches (points changes) should continue to animate.
   *
   * Why theme updates can look "inconsistent":
   *   - `react-native-graph` renders via Skia. When the chart's screen is not
   *     focused (e.g. you're in Settings), React can still re-render props, but
   *     the underlying native/Skia view may be detached/frozen by navigation.
   *   - In those cases, the color update can be "lost" visually until *some*
   *     later event forces the graph to recompute/refresh (e.g. timeframe
   *     changes).
   *
   * Fix strategy:
   *   1) Keep path geometry stable across light/dark so thickness changes don't
   *      alter the computed path (avoids the visible "scale/morph").
   *   2) Force a cheap redraw by passing a new `points` array reference (same
   *      values) when:
   *        - the style signature changes (theme switch), and
   *        - the screen becomes focused again after a theme switch that
   *          happened while unfocused (so the redraw occurs while visible).
   */

  // Keep geometry stable across theme switches (AnimatedLineGraph defaults
  // verticalPadding to lineThickness). When the caller knows the minimum scale
  // the chart will animate down to, also reserve enough static headroom for the
  // thickest compensated stroke so the graph never clips at the top/bottom.
  const resolvedMinStrokeScale =
    typeof minStrokeScale === 'number' && minStrokeScale > 0
      ? Math.min(minStrokeScale, 1)
      : strokeScaleIsSharedValue
      ? 1
      : Math.min(safeStrokeScaleNumber, 1);

  const maxCompensatedLineThickness =
    effectiveLineThickness /
    Math.pow(resolvedMinStrokeScale, lineThicknessCompensationExponent);

  const stableVerticalPadding = Math.max(
    // max thickness used across themes (light: 4, dark: 2)
    4,
    typeof lineThickness === 'number' ? lineThickness : 0,
    Math.ceil(maxCompensatedLineThickness),
  );
  const stableHorizontalPadding = 0;

  // A compact signature of everything that should trigger a redraw when the
  // graph's visual style or path geometry changes.
  const styleSignature = `${color}|${gradientFillColors[0]}|${gradientFillColors[1]}|${effectiveLineThickness}|${stableVerticalPadding}`;

  /**
   * If the theme changes while this screen is NOT focused, we want to trigger a
   * redraw the moment it becomes focused again.
   */
  const lastFocusedStyleSignatureRef = React.useRef<string | null>(null);
  const [focusRefreshNonce, setFocusRefreshNonce] = React.useState(0);

  React.useEffect(() => {
    if (!isFocused) {
      return;
    }

    const prev = lastFocusedStyleSignatureRef.current;

    // Update the ref so it always represents the currently-focused signature.
    lastFocusedStyleSignatureRef.current = styleSignature;

    // If we are focused AND the signature differs from the last time we were
    // focused, a theme/style change happened while we were away. Force a redraw
    // now that we're visible again.
    if (prev != null && prev !== styleSignature) {
      setFocusRefreshNonce(n => n + 1);
    }
  }, [isFocused, styleSignature]);

  /**
   * In addition to focus changes, "reattaching" the view can happen without a
   * focus transition in some navigation setups. We treat the first layout after
   * a theme/style change as another opportunity to force a redraw.
   */
  const lastLayoutStyleSignatureRef = React.useRef<string | null>(null);
  const [layoutRefreshNonce, setLayoutRefreshNonce] = React.useState(0);

  const onChartLayout = React.useCallback(
    ({nativeEvent: {layout}}: LayoutChangeEvent) => {
      if (!(typeof width === 'number' && width > 0)) {
        const nextWidth = Math.round(layout.width);
        if (Number.isFinite(nextWidth) && nextWidth > 0) {
          setChartWidth(prev => (prev === nextWidth ? prev : nextWidth));
        }
      }

      const prev = lastLayoutStyleSignatureRef.current;
      lastLayoutStyleSignatureRef.current = styleSignature;

      if (prev != null && prev !== styleSignature) {
        setLayoutRefreshNonce(n => n + 1);
      }
    },
    [styleSignature, width],
  );

  // Force a new points array reference whenever either:
  //   - data changes (timeframe switch -> animation desired),
  //   - style changes (theme switch),
  //   - we regain focus after a theme switch (ensures redraw is visible),
  //   - layout happens after a theme switch (handles detach/reattach cases).
  const pointsForGraph = React.useMemo(
    () =>
      clonePointsForGraph(points, [
        styleSignature,
        focusRefreshNonce,
        layoutRefreshNonce,
      ]),
    [points, styleSignature, focusRefreshNonce, layoutRefreshNonce],
  );
  const hasDrawablePoints = pointsForGraph.length >= 2;
  const ResolvedTopAxisLabel = React.useCallback<AxisLabelRenderer>(props => {
    const CurrentAxisLabel = topAxisLabelRef.current;
    if (!CurrentAxisLabel) {
      return null;
    }

    return (
      <CurrentAxisLabel
        {...(props as InteractiveLineChartAxisLabelProps)}
        width={resolvedChartWidthRef.current}
      />
    );
  }, []);
  const ResolvedBottomAxisLabel = React.useCallback<AxisLabelRenderer>(
    props => {
      const CurrentAxisLabel = bottomAxisLabelRef.current;
      if (!CurrentAxisLabel) {
        return null;
      }

      return (
        <CurrentAxisLabel
          {...(props as InteractiveLineChartAxisLabelProps)}
          width={resolvedChartWidthRef.current}
        />
      );
    },
    [],
  );

  const firstPointGuideLine = React.useMemo(() => {
    if (
      !showFirstPointGuideLine ||
      !pointsForGraph.length ||
      !lineGraphLayout
    ) {
      return null;
    }

    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;
    for (const point of pointsForGraph) {
      const value = Number(point?.value);
      if (!Number.isFinite(value)) {
        continue;
      }
      if (value < minValue) {
        minValue = value;
      }
      if (value > maxValue) {
        maxValue = value;
      }
    }

    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
      return null;
    }

    const firstPointValue = Number.isFinite(pointsForGraph[0]?.value)
      ? Number(pointsForGraph[0]?.value)
      : minValue;
    const topAxisInset = TopAxisLabel ? axisLabelPadding + axisRowHeight : 0;
    const bottomAxisInset = BottomAxisLabel
      ? axisLabelPadding + axisRowHeight
      : 0;

    // Match react-native-graph's internal canvas sizing and Y transform.
    const canvasHeight = Math.max(
      0,
      lineGraphLayout.height - topAxisInset - bottomAxisInset,
    );
    const drawingHeight = Math.max(0, canvasHeight - stableVerticalPadding * 2);

    const yPositionInRange =
      maxValue === minValue
        ? 0.5
        : (firstPointValue - minValue) / (maxValue - minValue);
    const yInRange = Math.floor(drawingHeight * yPositionInRange);
    const y = drawingHeight - yInRange + stableVerticalPadding;
    const top = lineGraphLayout.y + topAxisInset + y;

    return {
      left: lineGraphLayout.x + stableHorizontalPadding,
      width: Math.max(0, lineGraphLayout.width - stableHorizontalPadding),
      top,
      color: firstPointGuideLineColor ?? (theme.dark ? Slate : SlateDark),
    };
  }, [
    BottomAxisLabel,
    TopAxisLabel,
    axisLabelPadding,
    axisRowHeight,
    firstPointGuideLineColor,
    lineGraphLayout,
    pointsForGraph,
    showFirstPointGuideLine,
    stableHorizontalPadding,
    stableVerticalPadding,
    theme.dark,
  ]);

  const firstPointGuideLineTopTarget =
    firstPointGuideLine != null
      ? firstPointGuideLine.top - FIRST_POINT_GUIDE_LINE_SVG_HEIGHT / 2
      : null;

  const firstPointGuideLineAnimatedStyle = useAnimatedStyle(() => ({
    top: firstPointGuideLineTop.value,
  }));

  React.useEffect(() => {
    if (firstPointGuideLineTopTarget == null) {
      isGuideLineTopInitializedRef.current = false;
      return;
    }

    if (!isGuideLineTopInitializedRef.current) {
      firstPointGuideLineTop.value = firstPointGuideLineTopTarget;
      isGuideLineTopInitializedRef.current = true;
      return;
    }

    firstPointGuideLineTop.value = withTiming(firstPointGuideLineTopTarget, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [firstPointGuideLineTop, firstPointGuideLineTopTarget]);

  const chartInner = (
    <ChartInner testID="interactive-line-chart-inner" onLayout={onChartLayout}>
      {hasDrawablePoints ? (
        <LineGraph
          testID="interactive-line-chart-graph"
          points={pointsForGraph}
          animated={animated}
          // `react-native-graph` can consume a Reanimated derived value here.
          // Cast to avoid TS complaining (the lib types it as `number`).
          lineThickness={lineThicknessForGraph as unknown as number}
          // Keep geometry stable across theme switches.
          verticalPadding={stableVerticalPadding}
          horizontalPadding={stableHorizontalPadding}
          panGestureDelay={panGestureDelay}
          enablePanGesture={enablePanGesture}
          color={color}
          gradientFillColors={gradientFillColors}
          TopAxisLabel={TopAxisLabel ? ResolvedTopAxisLabel : undefined}
          BottomAxisLabel={
            BottomAxisLabel ? ResolvedBottomAxisLabel : undefined
          }
          SelectionDot={SelectionDot}
          onGestureStart={onGestureStart}
          onGestureEnd={onGestureEnd}
          onPointSelected={onPointSelected}
          onLayout={({nativeEvent: {layout}}) => {
            const next = {
              x: layout.x,
              y: layout.y,
              width: layout.width,
              height: layout.height,
            };
            setLineGraphLayout(prev =>
              prev &&
              prev.x === next.x &&
              prev.y === next.y &&
              prev.width === next.width &&
              prev.height === next.height
                ? prev
                : next,
            );
          }}
          style={{
            width: resolvedChartWidth ?? '100%',
            height: graphHeight,
            marginTop: graphMarginTop,
            opacity: isLoading ? (hideLineWhileLoading ? 0 : 0.25) : 1,
          }}
        />
      ) : null}
      {firstPointGuideLine ? (
        <Reanimated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: firstPointGuideLine.left,
              width: firstPointGuideLine.width,
              height: FIRST_POINT_GUIDE_LINE_SVG_HEIGHT,
            },
            firstPointGuideLineAnimatedStyle,
          ]}>
          <Svg
            width={firstPointGuideLine.width}
            height={FIRST_POINT_GUIDE_LINE_SVG_HEIGHT}>
            <AnimatedSvgLine
              animatedProps={firstPointGuideLineAnimatedProps}
              x1={0}
              y1={FIRST_POINT_GUIDE_LINE_SVG_HEIGHT / 2}
              x2={firstPointGuideLine.width}
              y2={FIRST_POINT_GUIDE_LINE_SVG_HEIGHT / 2}
              stroke={firstPointGuideLine.color}
              strokeLinecap="butt"
            />
          </Svg>
        </Reanimated.View>
      ) : null}
      {isLoading ? (
        <ChartLoaderOverlay pointerEvents="none">
          <Loader size={32} spinning />
        </ChartLoaderOverlay>
      ) : null}
    </ChartInner>
  );

  return (
    <ChartContainer pointerEvents={isLoading ? 'none' : 'auto'}>
      {chartInner}
    </ChartContainer>
  );
};

export default InteractiveLineChart;
