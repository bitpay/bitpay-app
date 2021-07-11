import BackIcon from '../../../assets/img/back.svg';
import React from 'react';
import {TouchableOpacity} from 'react-native';

interface Props {
  onPress: () => any;
}
const Back = ({onPress}: Props) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <BackIcon />
    </TouchableOpacity>
  );
};

export default Back;
