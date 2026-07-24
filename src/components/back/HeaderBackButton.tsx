import React from 'react';
import {StyleSheet, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import Svg, {Path} from 'react-native-svg';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../../contexts';
import {ActiveOpacity} from '../base/TouchableOpacity';
import {LightBlack, NeutralSlate, Slate, SlateDark} from '../../styles/colors';

const styles = StyleSheet.create({
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backTouchable: {
    paddingRight: 10,
  },
});

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
    <TouchableOpacity
      style={styles.backTouchable}
      onPress={handlePress}
      activeOpacity={ActiveOpacity}>
      <View
        style={[
          styles.circle,
          {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        ]}>
        <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
          <Path
            d="M2.873 8.25L8.56925 13.9462L7.5 15L0 7.5L7.5 0L8.56925 1.05375L2.873 6.75H15V8.25H2.873Z"
            fill={arrowFill}
          />
        </Svg>
      </View>
    </TouchableOpacity>
  );
};

export default HeaderBackButton;
