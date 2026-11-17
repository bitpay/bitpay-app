import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  Caution,
  Caution25,
  NeutralSlate,
  SlateDark,
  Success25,
  SuccessDark,
  Warning25,
  WarningDark,
} from '../../styles/colors';
import {ScreenGutter} from '../styled/Containers';

type AlertType =
  | 'caution'
  | 'success'
  | 'warning'
  | 'default'
  | null
  | undefined;

interface AlertBoxProps {
  type?: AlertType;
  children: React.ReactNode;
}

type AlertPalette = {
  [k in Exclude<AlertType, null | undefined>]: {
    background: string;
    text: string;
  };
};

const palette: AlertPalette = {
  caution: {
    background: Caution25,
    text: Caution,
  },
  success: {
    background: Success25,
    text: SuccessDark,
  },
  warning: {
    background: Warning25,
    text: WarningDark,
  },
  default: {
    background: NeutralSlate,
    text: SlateDark,
  },
};

const styles = StyleSheet.create({
  container: {
    padding: parseInt(ScreenGutter, 10),
    borderRadius: 4,
  },
});

const AlertBox: React.FC<AlertBoxProps> = props => {
  const {type = 'default', children} = props;
  const colors = palette[type || 'default'] || palette.default;

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <Text style={{color: colors.text}}>{children}</Text>
    </View>
  );
};

export default AlertBox;
