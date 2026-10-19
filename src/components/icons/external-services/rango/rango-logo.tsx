import React from 'react';
import {
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Polygon,
  Stop,
  Svg,
} from 'react-native-svg';

/**
 * Official Rango Exchange icon.
 *
 * Source: https://github.com/rango-exchange/assets
 *         branding/icons/icon.svg
 *
 * The mark carries its own white disc, so it reads on both light and dark
 * grounds and needs no theme variant. Gradient ids are namespaced because
 * ThorswapLogo already defines `SVGID_1_` and duplicate ids collide when both
 * logos render in the same offer list.
 */
const RangoIconSvg: React.FC<{width: number; height: number}> = ({
  width,
  height,
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 500 500">
      <Defs>
        <LinearGradient
          id="rangoGrad1"
          gradientUnits="userSpaceOnUse"
          x1="217.0571"
          y1="158.7406"
          x2="399.8651"
          y2="158.7406">
          <Stop offset={0} stopColor="#469BF5" />
          <Stop offset={0.0911} stopColor="#3B81F4" />
          <Stop offset={0.2081} stopColor="#3068F3" />
          <Stop offset={0.3386} stopColor="#2754F2" />
          <Stop offset={0.4881} stopColor="#2147F1" />
          <Stop offset={0.673} stopColor="#1D3EF1" />
          <Stop offset={1} stopColor="#1C3CF1" />
        </LinearGradient>
        <LinearGradient
          id="rangoGrad2"
          gradientUnits="userSpaceOnUse"
          x1="101.4397"
          y1="342.9483"
          x2="281.4449"
          y2="342.9483">
          <Stop offset={0.0754} stopColor="#469BF5" />
          <Stop offset={0.2387} stopColor="#4292F5" />
          <Stop offset={0.5078} stopColor="#3779F4" />
          <Stop offset={0.8475} stopColor="#2550F2" />
          <Stop offset={1} stopColor="#1C3CF1" />
        </LinearGradient>
        <LinearGradient
          id="rangoGrad3"
          gradientUnits="userSpaceOnUse"
          x1="62.2584"
          y1="250"
          x2="437.7415"
          y2="250">
          <Stop offset={0.0754} stopColor="#469BF5" />
          <Stop offset={0.7046} stopColor="#2857F2" />
          <Stop offset={1} stopColor="#1C3CF1" />
        </LinearGradient>
      </Defs>

      <G>
        <Ellipse fill="#FFFFFF" cx="250" cy="249.99" rx="187.74" ry="185.52" />
        <G>
          <Path
            fill="url(#rangoGrad1)"
            d="M224.39,190.52c0,0,7.88,4.37,19.81,10.98l155.66-64.57c-5.62-7.43-11.78-14.42-18.42-20.94
            c-1.1,0.62-2.01,0.97-2.01,0.97l-162.37,68.28C218.89,187.1,221.29,188.89,224.39,190.52z"
          />
          <Path
            fill="url(#rangoGrad2)"
            d="M123.9,383.03l157.55-65.69l-29.3-16.56l-120.26,51.09l-30.44,12.87c5.6,7.24,11.7,14.04,18.28,20.38
            L123.9,383.03z"
          />
          <Path
            fill="url(#rangoGrad3)"
            d="M416.39,163.06l-28.68,11.11c-22.96,8.4-113.29,44.02-113.29,44.02c14.76,8.14,30.72,16.92,44.77,24.59
            c35.92,19.62,13.18,62.69,8.43,70.86c-0.06,0.11-0.13,0.22-0.19,0.33c-0.39,0.66-0.63,1.03-0.63,1.03s3.37-32.19-19.31-44.09
            c-22.86-11.87-75.29-39.8-97.32-51.56c-10.38-5.54-17.91-15.58-19.33-27.26c-1.06-8.74,1.13-18.78,11.61-27.59
            c5.65-5.22,11.68-8.23,12.57-8.66c0.08-0.04,0.14-0.07,0.22-0.1l117.01-48.01c0,0,0.74-0.29,1.82-0.85l24.36-10.11
            C327.82,75.06,290.42,62.24,250,62.24c-103.86,0-189.63,87.42-187.71,191.27c0.59,32.06,9.25,62.14,23.99,88.35l45.31-19.75
            l90.21-37.85c-15.54-8.53-29.92-16.47-36.74-20.11c-3.41-1.82-7.66-4.68-11.07-6.49c-18.27-9.66-30.25-36.93-2.51-69.29
            c0,0-2.88,30.71,14.29,41.14c16.4,9.97,80.17,42.63,98.85,52.65c4.24,2.28,8.19,5.09,11.47,8.63c8.26,8.93,11.52,20.19,8.28,32.14
            c-0.14,0.57-0.33,1.1-0.5,1.65c-0.11,0.35-0.22,0.71-0.35,1.06c-0.19,0.54-0.38,1.08-0.6,1.6c-0.07,0.17-0.12,0.33-0.19,0.5
            c-6.46,15.62-23.66,20.32-23.66,20.32l-2.08,0.7l-109.62,44.98l-24.18,10.61c30.59,21.22,67.77,33.61,107.87,33.39
            c103.95-0.56,189.2-88.51,186.65-192.43C436.96,215.68,429.33,187.77,416.39,163.06z"
          />
        </G>
        <Polygon
          fill="#070707"
          fillOpacity={0.4}
          points="221.9,284.11 252.24,300.63 237.07,307.08 205.29,291.08"
        />
        <Path
          fill="#070707"
          fillOpacity={0.4}
          d="M279,347.93c0,0,25.21-17.84,2.4-30.73l-14.32,5.97C267.08,323.16,290.97,329.57,279,347.93z"
        />
        <Polygon
          fill="#070707"
          fillOpacity={0.4}
          points="274.52,218.07 244.17,201.55 259.67,195.08 291.71,211.39"
        />
        <Path
          fill="#070707"
          fillOpacity={0.4}
          d="M219.51,154.14c0,0-25.46,18.03-2.42,31.05l14.47-6.03C231.56,179.15,207.42,172.69,219.51,154.14z"
        />
      </G>
    </Svg>
  );
};

interface RangoLogoProps {
  iconOnly?: boolean;
  width?: number;
  height?: number;
}

const RangoLogo: React.FC<RangoLogoProps> = ({width = 100, height = 40}) => {
  return <RangoIconSvg width={width} height={height} />;
};

export default RangoLogo;
