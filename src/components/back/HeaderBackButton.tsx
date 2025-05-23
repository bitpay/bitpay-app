import React from 'react';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {useNavigation} from '@react-navigation/native';
import Back from './Back';

interface HeaderBackButtonProps {
  onPress?: () => void;
}

const HeaderBackButton: React.FC<HeaderBackButtonProps> = ({onPress}) => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={{paddingRight: 10}}>
      <Back opacity={1} />
    </TouchableOpacity>
  );
};

export default HeaderBackButton;
