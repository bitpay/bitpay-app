import React from 'react';
import {Path, Svg} from 'react-native-svg';
import {useTheme} from 'styled-components/native';

type MoonpayConnectIconType = 'favorite' | 'verified' | 'wallet';

const ICON_CONFIG: Record<
  MoonpayConnectIconType,
  {viewBox: string; width: number; height: number}
> = {
  wallet: {viewBox: '0 0 19 15', width: 19, height: 15},
  verified: {viewBox: '0 0 14 16', width: 14, height: 16},
  favorite: {viewBox: '0 0 16 16', width: 16, height: 16},
};

const MoonpayConnectIconSvg: React.FC<{
  icon: MoonpayConnectIconType;
  isDark: boolean;
  width: number;
  height: number;
}> = ({icon, width, height}) => {
  const {viewBox} = ICON_CONFIG[icon];

  return (
    <Svg width={width} height={height} viewBox={viewBox} fill="none">
      {icon === 'favorite' && (
        <Path
          d="M11.4783 0C10.1233 0 8.8553 0.59898 8 1.62303C7.1447 0.59898 5.8767 0 4.52174 0C2.02853 0 0 2.01453 0 4.49091C0 8.75107 7.46195 14.8638 7.77989 15.1219C7.84375 15.174 7.92188 15.2 8 15.2C8.07812 15.2 8.15625 15.174 8.22011 15.1219C8.53805 14.8638 16 8.75107 16 4.49091C16 2.01453 13.9715 0 11.4783 0Z"
          fill="#7D00FF"
        />
      )}
      {icon === 'verified' && (
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.80556 0.0129413L12.8105 1.21392C13.1214 1.27739 13.3446 1.5511 13.3442 1.86846V8.66067C13.3442 13.9984 6.67212 16 6.67212 16C6.67212 16 0 13.9984 0 8.66067V1.86846C0.000125986 1.54946 0.226041 1.27517 0.539107 1.21392L6.54401 0.0129413C6.63034 -0.00431377 6.71923 -0.00431377 6.80556 0.0129413ZM3.05955 7.99346L6.04265 10.9766L10.9487 5.25122L9.93583 4.38384L5.96659 9.01363L4.00299 7.05002L3.05955 7.99346Z"
          fill="#7D00FF"
        />
      )}
      {icon === 'wallet' && (
        <Path
          d="M3.5 15C2.53467 15 1.71 14.658 1.026 13.974C0.342 13.29 0 12.4653 0 11.5V3.5C0 2.53467 0.342 1.71 1.026 1.026C1.71 0.341999 2.53467 0 3.5 0H15.5C16.4653 0 17.29 0.341999 17.974 1.026C18.658 1.71 19 2.53467 19 3.5V11.5C19 12.4653 18.658 13.29 17.974 13.974C17.29 14.658 16.4653 15 15.5 15H3.5ZM3.5 3.75H15.5C15.8795 3.75 16.2375 3.8045 16.574 3.9135C16.9105 4.0225 17.2192 4.18792 17.5 4.40975V3.5C17.5 2.95 17.3042 2.47917 16.9125 2.0875C16.5208 1.69583 16.05 1.5 15.5 1.5H3.5C2.95 1.5 2.47917 1.69583 2.0875 2.0875C1.69583 2.47917 1.5 2.95 1.5 3.5V4.40975C1.78083 4.18792 2.0895 4.0225 2.426 3.9135C2.7625 3.8045 3.1205 3.75 3.5 3.75ZM1.59225 6.7405L12.823 9.46925C12.9602 9.50258 13.099 9.50417 13.2395 9.474C13.3798 9.44383 13.5071 9.382 13.6212 9.2885L17.2212 6.2635C17.0571 5.96217 16.8221 5.71792 16.5163 5.53075C16.2106 5.34358 15.8718 5.25 15.5 5.25H3.5C3.02817 5.25 2.61858 5.38817 2.27125 5.6645C1.92375 5.94067 1.69742 6.29933 1.59225 6.7405Z"
          fill="#7D00FF"
        />
      )}
    </Svg>
  );
};

const MoonpayConnectIcon = ({
  icon,
  width,
  height,
}: {
  icon: MoonpayConnectIconType;
  width?: number;
  height?: number;
}) => {
  const theme = useTheme();
  const defaults = ICON_CONFIG[icon];

  return (
    <MoonpayConnectIconSvg
      icon={icon}
      isDark={theme.dark}
      width={width ?? defaults.width}
      height={height ?? defaults.height}
    />
  );
};

export default MoonpayConnectIcon;
