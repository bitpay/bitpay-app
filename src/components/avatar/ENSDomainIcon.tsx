import React from 'react';
import Svg, {Defs, LinearGradient, Path, Stop} from 'react-native-svg';

interface ENSDomainIconProps {
  size?: number;
}

const ENSDomainIcon: React.FC<ENSDomainIconProps> = props => {
  let {size = 20} = props;

  return (
    <Svg width={size} height={size} viewBox="0 0 18 21" fill="none">
      <Defs>
        <LinearGradient
          id="paint0_linear_9203_90493"
          x1="8.96972"
          y1="0.401174"
          x2="8.96972"
          y2="20.5618"
          gradientUnits="userSpaceOnUse">
          <Stop stopColor="#513EFF" />
          <Stop offset="0.18" stopColor="#5157FF" />
          <Stop offset="0.57" stopColor="#5298FF" />
          <Stop offset="1" stopColor="#52E5FF" />
        </LinearGradient>
      </Defs>
      <Path
        d="M2.34094 5.21896C2.5279 4.87061 2.79772 4.57363 3.12661 4.35423L8.64606 0.5L2.99072 9.85145C2.99072 9.85145 2.49659 9.01637 2.30388 8.59389C2.06373 8.06263 1.94261 7.4853 1.94902 6.90232C1.95542 6.31935 2.08918 5.74482 2.34094 5.21896ZM0.062987 11.6699C0.125305 12.5641 0.377971 13.4348 0.804067 14.2235C1.23016 15.0122 1.81985 15.7007 2.53365 16.2431L8.63865 20.5C8.63865 20.5 4.81901 14.9954 1.59727 9.51791C1.2711 8.93922 1.05183 8.30652 0.949954 7.65009C0.904857 7.35284 0.904857 7.05049 0.949954 6.75324C0.865952 6.90889 0.702888 7.22761 0.702888 7.22761C0.376215 7.89385 0.153736 8.60628 0.0432217 9.34002C-0.0203894 10.1156 -0.0137741 10.8954 0.062987 11.6699ZM15.6282 12.4111C15.4305 11.9886 14.9413 11.1535 14.9413 11.1535L9.29585 20.5L14.8153 16.6482C15.1442 16.4288 15.414 16.1319 15.601 15.7835C15.8527 15.2577 15.9865 14.6831 15.9929 14.1001C15.9993 13.5172 15.8782 12.9398 15.638 12.4086L15.6282 12.4111ZM17.869 9.33261C17.8067 8.43834 17.5541 7.5677 17.128 6.779C16.7019 5.9903 16.1122 5.30173 15.3984 4.75942L9.30326 0.5C9.30326 0.5 13.1204 6.00463 16.3446 11.4821C16.6699 12.0609 16.8884 12.6936 16.9895 13.3499C17.0346 13.6472 17.0346 13.9495 16.9895 14.2468C17.0735 14.0911 17.2366 13.7724 17.2366 13.7724C17.5632 13.1062 17.7857 12.3937 17.8962 11.66C17.9607 10.8844 17.9549 10.1046 17.8789 9.33014L17.869 9.33261Z"
        fill="url(#paint0_linear_9203_90493)"
      />
    </Svg>
  );
};

export default ENSDomainIcon;
