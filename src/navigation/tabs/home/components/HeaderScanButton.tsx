import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {TouchableOpacity} from 'react-native-gesture-handler';
import ScanSvg from '../../../../../assets/img/home/scan.svg';
import {HeaderButtonContainer} from '../HomeRoot';

const ScanButton: React.FC = () => {
  const navigation = useNavigation();

  return (
    <HeaderButtonContainer>
      <TouchableOpacity
        onPress={() => navigation.navigate('Scan', {screen: 'Root'})}>
        <ScanSvg />
      </TouchableOpacity>
    </HeaderButtonContainer>
  );
};

export default ScanButton;
