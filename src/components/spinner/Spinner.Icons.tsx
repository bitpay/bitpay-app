import React from 'react';
import Svg, {G, NumberProp, Path} from 'react-native-svg';
import {useTheme} from 'styled-components/native';
import {Action, BitPay} from '../../styles/colors';

type BitPayBProps = {
  size: NumberProp | undefined;
};

export const BitPayB = (props: BitPayBProps) => {
  const {size} = props;
  const theme = useTheme();
  const fill = theme.dark ? Action : BitPay;

  return (
    <Svg
      id="bitpay_wordmark"
      height={size}
      width={size}
      x="0px"
      y="0px"
      viewBox="46 62 128 128">
      <G>
        <Path
          id="b_2_"
          fill={fill}
          d="M119.7,104.7c4.2,0,7.9,0.8,11,2.3c3.1,1.5,5.6,3.5,7.7,6.1c2,2.6,3.5,5.6,4.5,9c1,3.4,1.5,7.1,1.5,11.1c0,6.1-1.1,11.8-3.4,17.3c-2.3,5.4-5.3,10.2-9.2,14.2c-3.9,4-8.5,7.2-13.8,9.5c-5.3,2.3-11,3.5-17.2,3.5c-0.8,0-2.2,0-4.2-0.1c-2,0-4.3-0.2-6.8-0.6c-2.6-0.4-5.3-0.9-8.1-1.6c-2.9-0.7-5.6-1.7-8.1-2.9l22.9-96.2l20.5-3.2l-8.1,34.1c1.8-0.8,3.4-1.4,5.2-1.8C115.8,104.9,117.7,104.7,119.7,104.7z M102.5,161.3c3.1,0,6-0.7,8.7-2.3c2.7-1.5,5.1-3.5,7.1-6c2-2.5,3.6-5.4,4.7-8.5c1.1-3.2,1.7-6.5,1.7-9.9c0-4.2-0.7-7.5-2.1-9.9c-1.4-2.4-4.3-3.5-8.1-3.5c-1.2,0-2.5,0.1-4.5,0.6c-2,0.4-3.7,1.4-5.3,2.8l-8.6,36.3c2.6,0.4,3.4,0.5,4.1,0.5C100.7,161.3,101.5,161.3,102.5,161.3z"
        />
      </G>
    </Svg>
  );
};
