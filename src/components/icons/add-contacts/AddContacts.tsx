import React from 'react';
import {useTheme} from '@react-navigation/native';
import {Svg, Path, Circle} from 'react-native-svg';
import {
  Action,
  LightBlack,
  LinkBlue,
  NeutralSlate,
} from '../../../styles/colors';

const AddContactsSvg: React.FC<{isDark: boolean}> = ({isDark}) => {
  return (
    <Svg width="37" height="37" viewBox="0 0 37 37" fill="none">
      <Circle
        cx="18.5"
        cy="18.5"
        r="18.5"
        fill={isDark ? LightBlack : NeutralSlate}
      />
      <Path
        d="M18 19C15.8 19 14 17.2 14 15V14C14 11.8 15.8 10 18 10C20.2 10 22 11.8 22 14V15C22 17.2 20.2 19 18 19Z"
        fill={isDark ? LinkBlue : Action}
      />
      <Path
        d="M16 21C13.2 21 11 23.2 11 26H19V21H16Z"
        fill={isDark ? LinkBlue : Action}
      />
      <Path
        d="M25 20H23V22H21V24H23V26H25V24H27V22H25V20Z"
        fill={isDark ? LinkBlue : Action}
      />
    </Svg>
  );
};

const AddContactIcon = () => {
  const theme = useTheme();

  return <AddContactsSvg isDark={theme.dark} />;
};

export default AddContactIcon;
