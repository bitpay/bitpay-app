import React from 'react';
import {Switch} from 'react-native';
import {Action, NeutralSlate, White} from '../../styles/colors';
interface Props {
  onChange: ((value: boolean) => any) | undefined;
  isEnabled: boolean;
  isDisabled?: boolean;
}

const ToggleSwitch = ({onChange, isEnabled, isDisabled}: Props) => {
  return (
    <Switch
      onValueChange={onChange}
      value={isEnabled}
      trackColor={{true: Action, false: NeutralSlate}}
      thumbColor={White}
      thumbTintColor={White}
      disabled={isDisabled}
    />
  );
};

export default ToggleSwitch;
