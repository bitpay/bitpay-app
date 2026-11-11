import React from 'react';
import Svg, {Circle, Path} from 'react-native-svg';

interface GlyphProps {
  color: string;
  size?: number;
}

const strokeProps = (color: string, width = 2) => ({
  fill: 'none',
  stroke: color,
  strokeWidth: width,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const PenGlyph = ({color, size = 20}: GlyphProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M4 6h10M4 11h7M4 16h5M14 19l1-4 5-5 3 3-5 5z"
      {...strokeProps(color)}
    />
  </Svg>
);

export const PrintGlyph = ({color, size = 20}: GlyphProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"
      {...strokeProps(color)}
    />
  </Svg>
);

export const CheckGlyph = ({color, size = 24}: GlyphProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="m5 12 5 5 9-10" {...strokeProps(color, 2.6)} />
  </Svg>
);

export const EyeGlyph = ({color, size = 28}: GlyphProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"
      {...strokeProps(color, 1.8)}
    />
    <Circle cx="12" cy="12" r="3" {...strokeProps(color, 1.8)} />
  </Svg>
);

export const OfflineGlyph = ({color, size = 16}: GlyphProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M2 8.5a15 15 0 0 1 4.5-2.8M10 5.1A15 15 0 0 1 22 8.5M5 12.5a10 10 0 0 1 3.5-2M13.5 10a10 10 0 0 1 5.5 2.5M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18"
      {...strokeProps(color)}
    />
  </Svg>
);
