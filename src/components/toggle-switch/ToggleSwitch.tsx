import React from 'react';
import {Switch} from 'react-native';
import {Action, White} from '../../styles/colors';
interface Props {
  onChange: (value: boolean) => void;
  isEnabled: boolean;
}

const ToggleSwitch = ({onChange, isEnabled}: Props) => {
  return (
    <Switch
      onValueChange={onChange}
      value={isEnabled}
      trackColor={{true: Action}}
      thumbColor={White}
      thumbTintColor={White}
    />
  );
};

export default ToggleSwitch;
