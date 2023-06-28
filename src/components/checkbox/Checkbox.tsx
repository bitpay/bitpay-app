import React from 'react';
import {RoundedCheckbox} from 'react-native-rounded-checkbox';
import Check from '../../../assets/img/check.svg';
import {Action, LightBlack, SlateDark, White} from '../../styles/colors';
import styled from 'styled-components/native';
import {useTheme} from 'styled-components/native';

interface Props {
  onPress: () => any;
  checked: boolean;
  disabled?: boolean;
  radio?: boolean;
  radioHeight?: number;
  checkHeight?: number;
}

interface BorderProps {
  checked: boolean;
  disabled: boolean | undefined;
  radio?: boolean;
}

const Border = styled.View<BorderProps>`
  border: 1px solid
    ${({checked, disabled, theme}) => {
      if (disabled) {
        return 'transparent';
      }

      return checked ? Action : theme?.dark ? '#E1E4E7' : SlateDark;
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

const Checkbox: React.FC<Props> = ({
  onPress,
  checked,
  disabled,
  radio,
  radioHeight,
  checkHeight,
}) => {
  const radioStyles = radioHeight
    ? {height: radioHeight, width: radioHeight}
    : baseRadioStyles;
  const baseStyles = radio ? radioStyles : baseCheckboxStyles;
  const theme = useTheme();

  return (
    <RoundedCheckbox
      key={Math.floor(Math.random() * 500)}
      onPress={() => !disabled && onPress()}
      active={checked}
      uncheckedColor={!disabled ? (theme.dark ? LightBlack : White) : undefined}
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
      <Border
        checked={checked}
        disabled={disabled}
        radio={radio}
        testID="checkboxBorder"
      />
      {checked ? (
        checkHeight ? (
          <Check height={checkHeight} />
        ) : (
          <Check />
        )
      ) : null}
    </RoundedCheckbox>
  );
};

export default Checkbox;
