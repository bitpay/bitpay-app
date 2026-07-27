import React from 'react';
import {View} from 'react-native';
import {RoundedCheckbox} from 'react-native-rounded-checkbox';
import Check from '../../../assets/img/check.svg';
import {Action, SlateDark} from '../../styles/colors';
import {useTheme} from '../../contexts';

interface Props {
  onPress: () => any;
  checked: boolean;
  disabled?: boolean;
  radio?: boolean;
  radioHeight?: number;
  checkHeight?: number;
  testID?: string;
}

interface BorderProps {
  checked: boolean;
  disabled: boolean | undefined;
  radio?: boolean;
}

const Border: React.FC<BorderProps & React.ComponentProps<typeof View>> = ({
  checked,
  disabled,
  radio,
  style,
  ...rest
}) => {
  const theme = useTheme();
  const borderColor = disabled
    ? 'transparent'
    : checked
    ? Action
    : theme?.dark
    ? SlateDark
    : '#E5E5F2';
  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor,
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          borderRadius: radio ? 50 : 5,
        },
        style,
      ]}
      {...rest}
    />
  );
};

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
  testID,
}) => {
  const radioStyles = radioHeight
    ? {height: radioHeight, width: radioHeight}
    : baseRadioStyles;
  const baseStyles = radio ? radioStyles : baseCheckboxStyles;
  const theme = useTheme();

  return (
    <RoundedCheckbox
      onPress={() => !disabled && onPress()}
      active={checked}
      uncheckedColor={
        !disabled ? (theme.dark ? SlateDark : '#E5E5F2') : undefined
      }
      checkedColor={Action}
      innerStyle={{
        ...baseStyles,
      }}
      // @ts-ignore --> testing
      testID={testID || 'checkbox'}
      accessibilityLabel="Checkbox"
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
