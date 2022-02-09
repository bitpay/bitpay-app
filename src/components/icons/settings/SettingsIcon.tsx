import React from 'react';
import {G, Path, Svg} from 'react-native-svg';
import {
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../styles/colors';
import styled, {useTheme} from 'styled-components/native';

const SettingsSvgContainer = styled.TouchableOpacity`
  margin-top: 10px;
  margin-right: 10px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 50px;
  justify-content: center;
  align-items: center;
  height: 45px;
  width: 45px;
`;

const SettingsSvg: React.FC<{isDark: boolean}> = ({isDark}) => {
  return (
    <Svg width="24px" height="24px" viewBox="0 0 24 24">
      <G
        id="Page-1"
        stroke="none"
        stroke-width="1"
        fill="none"
        fill-rule="evenodd">
        <G
          id="Artboard-Copy-69"
          transform="translate(-309.000000, -27.000000)"
          fill={isDark ? White : SlateDark}>
          <G id="Tabs/Wallets">
            <G id="Settings" transform="translate(280.000000, 1.000000)">
              <G
                id="Generic/Small/Settings"
                transform="translate(29.000000, 26.000000)">
                <G id="settings-gear">
                  <Path
                    d="M20.872,13.453 C20.9537653,12.972909 20.9965715,12.4869919 21,12 C20.9965715,11.5130081 20.9537653,11.027091 20.872,10.547 L22.972,8.518 C23.3014584,8.19919706 23.371936,7.69719821 23.143,7.3 L21.643,4.7 C21.4110152,4.30446242 20.9414902,4.11509143 20.5,4.239 L17.7,5.039 C16.9419059,4.42152683 16.0884306,3.93146247 15.173,3.588 L14.47,0.758 C14.3589292,0.312671834 13.9589705,0 13.5,0 L10.5,0 C10.0410295,0 9.64107084,0.312671834 9.53,0.758 L8.823,3.588 C7.90897533,3.93185202 7.05687784,4.42190095 6.3,5.039 L3.5,4.239 C3.05853017,4.11546064 2.58922628,4.30474244 2.357,4.7 L0.857,7.3 C0.627535562,7.69743398 0.698040781,8.20004136 1.028,8.519 L3.128,10.548 C3.04628835,11.0277616 3.00348235,11.5133421 3,12 C3.00342848,12.4869919 3.04623467,12.972909 3.128,13.453 L1.028,15.482 C0.698541645,15.8008029 0.628063973,16.3028018 0.857,16.7 L2.357,19.3 C2.53580678,19.6097028 2.86638627,19.8003484 3.224,19.8 C3.31694619,19.7995843 3.40942403,19.7868055 3.499,19.762 L6.299,18.962 C7.05709407,19.5794732 7.91056935,20.0695375 8.826,20.413 L9.533,23.243 C9.64418563,23.6868483 10.0424394,23.9986148 10.5,24 L13.5,24 C13.9589705,24 14.3589292,23.6873282 14.47,23.242 L15.177,20.412 C16.0910247,20.068148 16.9431222,19.578099 17.7,18.961 L20.5,19.761 C20.589576,19.7858055 20.6820538,19.7985843 20.775,19.799 C21.1326137,19.7993484 21.4631932,19.6087028 21.642,19.299 L23.142,16.699 C23.3714644,16.301566 23.3009592,15.7989586 22.971,15.48 L20.872,13.453 Z M12,16 C9.790861,16 8,14.209139 8,12 C8,9.790861 9.790861,8 12,8 C14.209139,8 16,9.790861 16,12 C16,13.060866 15.5785726,14.0782816 14.8284271,14.8284271 C14.0782816,15.5785726 13.060866,16 12,16 Z"
                    id="Shape"
                  />
                </G>
              </G>
            </G>
          </G>
        </G>
      </G>
    </Svg>
  );
};

const SettingsIcon = ({onPress}: {onPress: () => void}) => {
  const theme = useTheme();

  return (
    <SettingsSvgContainer activeOpacity={0.75} onPress={onPress}>
      <SettingsSvg isDark={theme.dark} />
    </SettingsSvgContainer>
  );
};

export default SettingsIcon;
