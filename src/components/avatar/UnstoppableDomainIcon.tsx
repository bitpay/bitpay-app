import React from 'react';
import Svg, {Circle, Path} from 'react-native-svg';
interface UnstoppableDomainIconProps {
  size?: number;
  showBackground?: boolean;
}

const UnstoppableDomainIcon: React.FC<UnstoppableDomainIconProps> = props => {
  const {size = 20, showBackground = true} = props;

  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {showBackground ? (
        <>
          <Circle cx="10" cy="10" r="10" fill="#F5F7F8" />
          <Path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M16 5.1875V9.3125L4 14.1875L16 5.1875Z"
            fill="#2FE9FF"
          />
          <Path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M13.75 5V12.125C13.75 14.1961 12.0711 15.875 10 15.875C7.92893 15.875 6.25 14.1961 6.25 12.125V9.125L8.5 7.8875V12.125C8.5 12.8499 9.08763 13.4375 9.8125 13.4375C10.5374 13.4375 11.125 12.8499 11.125 12.125V6.44375L13.75 5Z"
            fill="#4C47F7"
          />
        </>
      ) : (
        <>
          <Path d="M20 0.828247V7.637L0 15.6823L20 0.828247Z" fill="#00C9FF" />
          <Path
            d="M16.2507 0.532715V12.2783C16.2507 13.9196 15.5921 15.4938 14.42 16.6545C13.2478 17.8151 11.658 18.4672 10.0003 18.4672C8.34257 18.4672 6.75275 17.8151 5.58057 16.6545C4.4084 15.4938 3.74988 13.9196 3.74988 12.2783V7.329L7.49947 5.28576V12.2783C7.46438 12.5834 7.49478 12.8925 7.58868 13.1852C7.68263 13.478 7.83792 13.7477 8.04449 13.9769C8.25106 14.206 8.50416 14.3894 8.78725 14.5149C9.07039 14.6405 9.37707 14.7054 9.68729 14.7054C9.99746 14.7054 10.3042 14.6405 10.5873 14.5149C10.8704 14.3894 11.1235 14.206 11.33 13.9769C11.5366 13.7477 11.6919 13.478 11.7858 13.1852C11.8798 12.8925 11.9102 12.5834 11.8751 12.2783V2.903L16.2507 0.532715Z"
            fill="#0D67FE"
          />
        </>
      )}
    </Svg>
  );
};

export default UnstoppableDomainIcon;
