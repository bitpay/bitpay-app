import React from 'react';
import {RoundedCheckbox} from 'react-native-rounded-checkbox';
import Check from '../../../assets/img/check.svg';
import {Action, SlateDark, White} from '../../styles/colors';
import styled from 'styled-components/native';

interface Props {
  onPress: () => any;
  checked: boolean;
  disabled?: boolean;
}

interface BorderProps {
  checked: boolean;
  disabled: boolean | undefined;
}

const Border = styled.View`
  border: 1px solid
    ${({checked, disabled}: BorderProps) => {
      if (disabled) {
        return 'transparent';
      }

      return checked ? Action : SlateDark;
    }};
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  border-radius: 5px;
`;

const baseStyles = {
  borderRadius: 5,
  width: 30,
  height: 30,
};

const Checkbox: React.FC<Props> = ({onPress, checked, disabled}) => {
  return (
    <RoundedCheckbox
      onPress={() => !disabled && onPress()}
      active={checked}
      uncheckedColor={!disabled ? White : undefined}
      checkedColor={Action}
      innerStyle={{
        ...baseStyles,
      }}
      // @ts-ignore --> testing
      testID="checkbox"
      outerStyle={{
        ...baseStyles,
        borderColor: 'transparent',
      }}>
      <Border checked={checked} disabled={disabled} testID="checkboxBorder" />
      <Check />
    </RoundedCheckbox>
  );
};

export default Checkbox;
