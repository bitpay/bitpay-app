import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  Caution,
  Caution25,
  NeutralSlate,
  Slate,
  Success,
  Success25,
  Warning,
  Warning25,
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
    text: Success,
  },
  warning: {
    background: Warning25,
    text: Warning,
  },
  default: {
    background: NeutralSlate,
    text: Slate,
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
