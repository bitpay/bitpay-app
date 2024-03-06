import {ColorValue} from 'react-native';
import {Path, Svg} from 'react-native-svg';
import {White} from '../../../../styles/colors';

interface LogoProps {
  fill?: ColorValue;
}

export const BluetoothLogo: React.FC<LogoProps> = props => {
  const fill = props.fill || White;

  return (
    <Svg width="13" height="21" viewBox="0 0 13 21" fill="none">
      <Path
        fill={fill}
        d="M12.71 6.21L7 0.5H6V8.09L1.41 3.5L0 4.91L5.59 10.5L0 16.09L1.41 17.5L6 12.91V20.5H7L12.71 14.79L8.41 10.5L12.71 6.21ZM8 4.33L9.88 6.21L8 8.09V4.33ZM9.88 14.79L8 16.67V12.91L9.88 14.79Z"
      />
    </Svg>
  );
};

export const UsbLogo: React.FC<LogoProps> = props => {
  const fill = props.fill || White;

  return (
    <Svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <Path
        fill={fill}
        d="M24.5 10.5H17.5V17.5H19.8333V19.2092L15.1667 22.3207V5.83333H18.6667L14.049 0L9.33333 5.83333H12.8333V21.154L8.16667 18.0425V14.952C9.72533 14.3955 10.7858 12.7808 10.4312 10.9667C10.1628 9.59583 9.0335 8.4805 7.65917 8.22733C5.44133 7.82017 3.5 9.52117 3.5 11.6667C3.5 13.1857 4.47883 14.469 5.83333 14.952V18.6667C5.83333 19.0563 6.02817 19.4215 6.3525 19.6373L12.8333 23.9575V28H15.1667V25.1242L21.6475 20.804C21.9718 20.5882 22.1667 20.223 22.1667 19.8333V17.5H24.5V10.5Z"
      />
    </Svg>
  );
};
