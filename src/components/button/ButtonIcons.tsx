import React from 'react';
import * as Svg from 'react-native-svg';
import {Caution, Success, White} from '../../styles/colors';
import {ButtonStyle} from './Button';

interface IconProps {
  buttonStyle: ButtonStyle;
}

export const Check: React.FC<IconProps> = props => {
  const {buttonStyle = 'primary'} = props;
  const isPrimary = buttonStyle === 'primary';

  return (
    <Svg.Svg width="20" height="15" viewBox="0 0 20 15" fill="none">
      <Svg.Path
        fill={isPrimary ? White : Success}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.50682 12.0639L2.24653 7.72917L0.639893 9.36387L5.69447 14.5067C5.92012 14.7363 6.22701 14.92 6.49779 14.92C6.76857 14.92 7.06643 14.7363 7.29208 14.5159L19.3599 2.17305L17.7713 0.519989L6.50682 12.0639Z"
      />
    </Svg.Svg>
  );
};

export const Close: React.FC<IconProps> = props => {
  const {buttonStyle = 'primary'} = props;
  const isPrimary = buttonStyle === 'primary';

  return (
    <Svg.Svg width="50px" height="50px" viewBox="0 0 41 41">
      <Svg.G
        id="Dashboard-(Mobile-Responsive)"
        stroke="none"
        strokeWidth="1"
        fill="none"
        fillRule="evenodd">
        <Svg.G
          id="Personal-Dashboard---Navigation/Home-(Mobile)"
          transform="translate(-313.000000, -21.000000)">
          <Svg.G id="Group-3" transform="translate(23.000000, 16.000000)">
            <Svg.G
              id="Wallet/Large-(50px)/Close-(Light)"
              transform="translate(285.000000, 0.000000)">
              <Svg.G id="Close" transform="translate(5.000000, 5.000000)">
                <Svg.G
                  id="Wallet/Small/Close-"
                  transform="translate(14.000000, 15.000000)"
                  fill={isPrimary ? White : Caution}>
                  <Svg.Path d="M12.0992857,0.900714286 C11.765,0.566428571 11.2635714,0.566428571 10.9292857,0.900714286 L6.5,5.33 L2.07071429,0.900714286 C1.73642857,0.566428571 1.235,0.566428571 0.900714286,0.900714286 C0.566428571,1.235 0.566428571,1.73642857 0.900714286,2.07071429 L5.33,6.5 L0.900714286,10.9292857 C0.566428571,11.2635714 0.566428571,11.765 0.900714286,12.0992857 C1.06785714,12.2664286 1.235,12.35 1.48571429,12.35 C1.73642857,12.35 1.90357143,12.2664286 2.07071429,12.0992857 L6.5,7.67 L10.9292857,12.0992857 C11.0964286,12.2664286 11.3471429,12.35 11.5142857,12.35 C11.6814286,12.35 11.9321429,12.2664286 12.0992857,12.0992857 C12.4335714,11.765 12.4335714,11.2635714 12.0992857,10.9292857 L7.67,6.5 L12.0992857,2.07071429 C12.4335714,1.73642857 12.4335714,1.235 12.0992857,0.900714286 Z" />
                </Svg.G>
              </Svg.G>
            </Svg.G>
          </Svg.G>
        </Svg.G>
      </Svg.G>
    </Svg.Svg>
  );
};
