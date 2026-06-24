import React, {useEffect, useMemo, useRef, useState} from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {useTheme} from 'styled-components/native';
import {BaseText} from '../styled/Text';
import {formatFiatAmount} from '../../utils/helper-methods';
import {Slate30, SlateDark} from '../../styles/colors';
import {isNumberSharedValue, type NumberSharedValue} from './sharedValueGuards';
import {getChartAxisLabelTranslateX} from './chartLayout';

export type ChartAxisLabelProps = {
  value: number;
  index: number;
  width?: number;
  arrayLength: number;
  quoteCurrency: string;
  currencyAbbreviation?: string;
  type: 'min' | 'max';
  textColor?: string;
  contentOpacity?: number | NumberSharedValue;
};

const AnimatedBaseText = Animated.createAnimatedComponent(BaseText);

export const normalizeChartAxisLabelValue = (
  value: number,
  type: 'min' | 'max',
): number => {
  if (type === 'min' && (value < 0 || Object.is(value, -0))) {
    return 0;
  }

  return value;
};

const ChartAxisLabel = ({
  value,
  index,
  width,
  arrayLength,
  quoteCurrency,
  currencyAbbreviation,
  type,
  textColor,
  contentOpacity = 1,
}: ChartAxisLabelProps): React.ReactElement => {
  const theme = useTheme();
  const normalizedValue = useMemo(
    () => normalizeChartAxisLabelValue(value, type),
    [type, value],
  );

  const labelText = useMemo(() => {
    return formatFiatAmount(normalizedValue, quoteCurrency, {
      currencyAbbreviation,
    });
  }, [currencyAbbreviation, normalizedValue, quoteCurrency]);

  // We need an accurate text width to position the label without clipping.
  // Measuring via onLayout is correct, but between timeframes the label text can
  // change (different number of digits). If we keep using the *previous* width
  // until the next onLayout fires, the computed clamped X can be wildly wrong
  // (often snapping to an edge) and then "correcting" a frame later.
  //
  // To avoid that jarring intermediate snap, we track the width *for the
  // specific text we measured* and fall back to a cheap estimate for new text
  // until its layout is measured.
  const [measuredTextLayout, setMeasuredTextLayout] = useState<{
    text: string;
    width: number;
  }>({text: '', width: 50});
  const [measuredContainerWidth, setMeasuredContainerWidth] = useState<
    number | undefined
  >();
  const hasMeasuredTranslateRef = useRef(false);

  const estimatedTextWidth = useMemo(() => {
    const fontSize = 13;
    // Digits and punctuation in RN's default fonts average ~0.55–0.6em.
    const avgCharWidth = fontSize * 0.58;
    const padding = 8;
    const estimated = labelText.length * avgCharWidth + padding;
    // Keep the estimate sane; it only needs to avoid edge-clamp snaps.
    return Math.min(Math.max(estimated, 40), 220);
  }, [labelText]);

  const textWidth =
    measuredTextLayout.text === labelText && measuredTextLayout.width > 0
      ? measuredTextLayout.width
      : estimatedTextWidth;
  const resolvedWidth =
    typeof width === 'number' && width > 0 ? width : measuredContainerWidth;
  const newTranslateX =
    resolvedWidth && resolvedWidth > 0
      ? getChartAxisLabelTranslateX({
          index,
          arrayLength,
          chartWidth: resolvedWidth,
          textWidth,
        })
      : 0;

  const translateX = useSharedValue(newTranslateX);
  useEffect(() => {
    if (!resolvedWidth || resolvedWidth <= 0) {
      hasMeasuredTranslateRef.current = false;
      return;
    }

    if (!hasMeasuredTranslateRef.current) {
      translateX.value = newTranslateX;
      hasMeasuredTranslateRef.current = true;
      return;
    }

    if (Math.abs(translateX.value - newTranslateX) < 0.5) {
      translateX.value = newTranslateX;
      return;
    }

    translateX.value = withSpring(newTranslateX, {
      mass: 1,
      stiffness: 500,
      damping: 400,
      velocity: 0,
    });
  }, [newTranslateX, resolvedWidth, translateX]);

  const translateY = type === 'min' ? 5 : -5;

  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, {duration: 800});
  }, [opacity]);

  const labelColor = textColor ?? (theme.dark ? Slate30 : SlateDark);

  const contentOpacityIsSharedValue = isNumberSharedValue(contentOpacity);
  const sharedContentOpacity = contentOpacityIsSharedValue
    ? contentOpacity
    : undefined;

  const contentOpacityNumber =
    typeof contentOpacity === 'number' && Number.isFinite(contentOpacity)
      ? contentOpacity
      : 1;

  const contentOpacityAnimatedStyle = useAnimatedStyle(() => {
    const sharedOpacity = sharedContentOpacity?.value;
    return {
      opacity:
        typeof sharedOpacity === 'number' && Number.isFinite(sharedOpacity)
          ? sharedOpacity
          : contentOpacityNumber,
    };
  }, [contentOpacityNumber, sharedContentOpacity]);

  return (
    <Animated.View
      onLayout={event => {
        if (typeof width === 'number' && width > 0) {
          return;
        }

        const nextWidth = Math.round(event.nativeEvent.layout.width);
        if (!Number.isFinite(nextWidth) || nextWidth <= 0) {
          return;
        }

        setMeasuredContainerWidth(prev =>
          prev === nextWidth ? prev : nextWidth,
        );
      }}
      style={{
        width: '100%',
        flexDirection: 'row',
        transform: [{translateY}],
        opacity: resolvedWidth && resolvedWidth > 0 ? opacity : 0,
      }}>
      <Animated.View
        style={{transform: [{translateX}]}}
        onLayout={event => {
          const w = event.nativeEvent.layout.width;
          if (!Number.isFinite(w) || w <= 0) {
            return;
          }
          setMeasuredTextLayout(prev => {
            // Avoid setState churn for tiny diffs.
            if (prev.text === labelText && Math.abs(prev.width - w) < 0.5) {
              return prev;
            }
            return {text: labelText, width: w};
          });
        }}>
        <AnimatedBaseText
          style={[
            {
              color: labelColor,
              fontWeight: '400',
              fontSize: 13,
            },
            contentOpacityAnimatedStyle,
          ]}>
          {labelText}
        </AnimatedBaseText>
      </Animated.View>
    </Animated.View>
  );
};

export default ChartAxisLabel;
