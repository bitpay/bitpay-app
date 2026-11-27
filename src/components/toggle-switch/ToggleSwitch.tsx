import React from 'react';
import {StyleSheet, Switch, View} from 'react-native';
import {Action, LuckySevens, White} from '../../styles/colors';

interface Props {
  onChange: ((value: boolean) => any) | undefined;
  isEnabled: boolean;
  isDisabled?: boolean;
}

const styles = StyleSheet.create({
  switchContainer: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
});

const ToggleSwitch = ({onChange, isEnabled, isDisabled}: Props) => {
  return (
    <View style={styles.switchContainer}>
      <Switch
        onValueChange={onChange}
        value={isEnabled}
        trackColor={{true: Action, false: LuckySevens}}
        thumbColor={White}
        thumbTintColor={White}
        disabled={isDisabled}
      />
    </View>
  );
};

export default ToggleSwitch;
