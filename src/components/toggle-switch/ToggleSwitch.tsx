import React from 'react';
import {Switch} from 'react-native';
import styled from 'styled-components/native';
import {Action, NeutralSlate, White} from '../../styles/colors';

interface Props {
  onChange: ((value: boolean) => any) | undefined;
  isEnabled: boolean;
  isDisabled?: boolean;
}

const SwitchContainer = styled.View`
  align-self: stretch;
  justify-content: center;
`;

const ToggleSwitch = ({onChange, isEnabled, isDisabled}: Props) => {
  return (
    <SwitchContainer>
      <Switch
        onValueChange={onChange}
        value={isEnabled}
        trackColor={{true: Action, false: NeutralSlate}}
        thumbColor={White}
        thumbTintColor={White}
        disabled={isDisabled}
      />
    </SwitchContainer>
  );
};

export default ToggleSwitch;
