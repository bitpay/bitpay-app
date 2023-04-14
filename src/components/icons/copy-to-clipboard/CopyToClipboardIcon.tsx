import React from 'react';
import * as Svg from 'react-native-svg';
import {Action} from '../../../styles/colors';

interface CopyToClipboardIconProps {
  size?: number;
  color?: Svg.Color;
}

const CopyToClipboardIcon: React.FC<CopyToClipboardIconProps> = props => {
  let {size = 20, color = Action} = props;

  return (
    <Svg.Svg width={size} height={size} viewBox="0 0 20 21" fill="none">
      <Svg.Path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M14.5769 0.5H2.8886C1.81718 0.5 0.940552 1.31818 0.940552 2.31818V15.0455H2.8886V2.31818H14.5769V0.5ZM17.183 4.13636H6.51631C5.44964 4.13636 4.57692 4.95455 4.57692 5.95455V18.6818C4.57692 19.6818 5.44964 20.5 6.51631 20.5H17.183C18.2496 20.5 19.1224 19.6818 19.1224 18.6818V5.95455C19.1224 4.95455 18.2496 4.13636 17.183 4.13636ZM17.3042 18.6818H6.3951V5.95455H17.3042V18.6818Z"
        fill={color}
      />
    </Svg.Svg>
  );
};

export default CopyToClipboardIcon;
