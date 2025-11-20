import React from 'react';
import {TouchableOpacity} from 'react-native-gesture-handler';
import Svg, {Path} from 'react-native-svg';
import {useNavigation} from '@react-navigation/native';
import styled, {useTheme} from 'styled-components/native';
import {ActiveOpacity} from '../base/TouchableOpacity';
import {LightBlack, NeutralSlate, Slate, SlateDark} from '../../styles/colors';

const Circle = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
`;

const BackTouchable = styled(TouchableOpacity)`
  padding-right: 10px;
`;

interface HeaderBackButtonProps {
  onPress?: () => void;
}

const HeaderBackButton: React.FC<HeaderBackButtonProps> = ({onPress}) => {
  const navigation = useNavigation();
  const theme = useTheme();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.goBack();
    }
  };

  const arrowFill = theme.dark ? Slate : SlateDark;
  return (
    <BackTouchable onPress={handlePress} activeOpacity={ActiveOpacity}>
      <Circle>
        <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
          <Path
            d="M2.873 8.25L8.56925 13.9462L7.5 15L0 7.5L7.5 0L8.56925 1.05375L2.873 6.75H15V8.25H2.873Z"
            fill={arrowFill}
          />
        </Svg>
      </Circle>
    </BackTouchable>
  );
};

export default HeaderBackButton;
