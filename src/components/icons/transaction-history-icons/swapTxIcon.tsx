import React from 'react';
import {Path, Svg} from 'react-native-svg';
import {useTheme} from 'styled-components/native';

const SwapTxIconSvg: React.FC<{
  isDark: boolean;
  width: number;
  height: number;
}> = ({isDark, width, height}) => {
  return (
    <Svg width={width} height={height} fill="none" viewBox="0 0 41 40">
      <>
        <Path
          id="swap-tx-icon-1"
          fillRule="evenodd"
          clipRule="evenodd"
          fill={isDark ? '#004D27' : '#CBF3E8'}
          d="M0.234619 20C0.234619 8.9543 9.18892 0 20.2346 0C31.2803 0 40.2346 8.9543 40.2346 20C40.2346 31.0457 31.2803 40 20.2346 40C9.18892 40 0.234619 31.0457 0.234619 20Z"
        />
        <Path
          id="swap-tx-icon-2"
          fillRule="evenodd"
          clipRule="evenodd"
          fill={isDark ? '#97E7D1' : '#004D27'}
          d="M19.6043 24.2884C19.966 23.9403 20.5415 23.9513 20.8897 24.3131L23.1764 26.6892V18.8745C23.1764 18.3724 23.5834 17.9654 24.0855 17.9654C24.5875 17.9654 24.9946 18.3724 24.9946 18.8745L24.9946 26.7774L27.4523 24.1732C27.7969 23.8081 28.3723 23.7914 28.7374 24.136C29.1026 24.4806 29.1192 25.056 28.7746 25.4211L24.8039 29.6284C24.6332 29.8092 24.3959 29.9123 24.1472 29.9135C23.8985 29.9147 23.6602 29.814 23.4877 29.6348L19.5796 25.5738C19.2315 25.2121 19.2425 24.6366 19.6043 24.2884Z"
        />
        <Path
          id="swap-tx-icon-3"
          fillRule="evenodd"
          clipRule="evenodd"
          fill={isDark ? '#97E7D1' : '#004D27'}
          d="M20.865 16.8372C20.5033 17.1854 19.9278 17.1743 19.5796 16.8126L17.2929 14.4365L17.2929 22.2511C17.2929 22.7532 16.8859 23.1602 16.3839 23.1602C15.8818 23.1602 15.4748 22.7532 15.4748 22.2511V14.3483L13.017 16.9524C12.6724 17.3176 12.097 17.3342 11.7319 16.9896C11.3668 16.645 11.3501 16.0696 11.6947 15.7045L15.6654 11.4973C15.8361 11.3164 16.0734 11.2134 16.3221 11.2122C16.5708 11.211 16.8091 11.3117 16.9816 11.4909L20.8897 15.5518C21.2378 15.9136 21.2268 16.4891 20.865 16.8372Z"
        />
      </>
    </Svg>
  );
};

const SwapTxIcon = ({width, height}: {width?: number; height?: number}) => {
  const theme = useTheme();
  const widthSize = width ?? 41;
  const heightSize = height ?? 40;

  return (
    <SwapTxIconSvg isDark={theme.dark} width={widthSize} height={heightSize} />
  );
};

export default SwapTxIcon;
