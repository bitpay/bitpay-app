import {ColorValue} from 'react-native';
import {Svg, Path} from 'react-native-svg';
import {Success, White} from '../../../styles/colors';

interface Props {
  /**
   * Background color.
   *
   * Default: Success / #2FCFA4
   */
  color: ColorValue;
  /**
   * Checkmark color.
   *
   * Default: White / #FFF
   */
  checkColor?: ColorValue;
  /**
   * Icon size.
   *
   * Default: 50
   */
  size?: number;
}

export const Check: React.FC<Props> = props => {
  const size = props.size || 50;
  const color = {
    circle: props.color || Success,
    check: props.checkColor || White,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 41 41" fill="none">
      <Path
        id="Circle"
        fill={color.circle}
        d="M20.5 0C9.4543 0 0.5 8.9543 0.5 20C0.5 31.0457 9.4543 40 20.5 40C31.5457 40 40.5 31.0457 40.5 20C40.468 8.9676 31.5324 0.0320379 20.5 0Z"
      />
      <Path
        id="Checkmark"
        fill={color.check}
        d="M29.9735 15.8048C30.6755 15.1028 30.6755 13.9647 29.9735 13.2627C29.2715 12.5607 28.1334 12.5607 27.4314 13.2627L17.77 22.9241L13.5686 18.7227C12.8666 18.0207 11.7285 18.0207 11.0265 18.7227C10.3245 19.4247 10.3245 20.5629 11.0265 21.2648L16.4988 26.7371C16.7497 26.9881 17.0564 27.1493 17.3789 27.2208C17.9588 27.3495 18.59 27.1883 19.0411 26.7372L29.9735 15.8048Z"
      />
    </Svg>
  );
};
