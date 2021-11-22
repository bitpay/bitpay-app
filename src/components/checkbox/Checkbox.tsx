import React from 'react';
import {RoundedCheckbox} from 'react-native-rounded-checkbox';
import Check from '../../../assets/img/check.svg';
import {Action, SlateDark, White} from '../../styles/colors';
import styled from 'styled-components/native';

interface Props {
  onPress: () => any;
  checked: boolean;
  disabled?: boolean;
  radio?: boolean;
}

interface BorderProps {
  checked: boolean;
  disabled: boolean | undefined;
  radio?: boolean;
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
  border-radius: ${({radio}) => (radio ? '50px' : '5px')};
`;

const baseCheckboxStyles = {
  borderRadius: 5,
  width: 30,
  height: 30,
};

const baseRadioStyles = {
  width: 33,
  height: 33,
};

const Checkbox: React.FC<Props> = ({onPress, checked, disabled, radio}) => {
  const baseStyles = radio ? baseRadioStyles : baseCheckboxStyles;

  return (
    <RoundedCheckbox
      onPress={() => !disabled && onPress()}
      active={checked}
      uncheckedColor={!disabled ? White : undefined}
      checkedColor={Action}
      innerStyle={{
        ...baseStyles,
      }}
      outerStyle={{
        ...baseStyles,
        borderColor: 'transparent',
      }}>
      <Border checked={checked} disabled={disabled} radio={radio} />
      <Check />
    </RoundedCheckbox>
  );
};

export default Checkbox;
