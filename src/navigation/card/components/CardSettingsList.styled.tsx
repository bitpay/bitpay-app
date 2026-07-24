import React from 'react';
import {View, ViewProps, Text, TextProps, StyleSheet} from 'react-native';
import {SvgProps} from 'react-native-svg';
import AngleRight from '../../../../assets/img/angle-right.svg';
import {
  ActiveOpacity,
  Setting,
  SettingIcon,
  SettingTitle,
} from '../../../components/styled/Containers';
import {H4} from '../../../components/styled/Text';
import ToggleSwitch from '../../../components/toggle-switch/ToggleSwitch';
import Spinner, {ToggleSpinnerState} from './ToggleSpinner';

const styles = StyleSheet.create({
  categoryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
  },
  categoryHeading: {
    fontWeight: '700',
    marginTop: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 58,
  },
});

export const CategoryRow = ({style, ...rest}: ViewProps) => (
  <View style={[styles.categoryRow, style]} {...rest} />
);

export const CategoryHeading = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => (
    <H4 ref={ref} style={[styles.categoryHeading, style]} {...rest} />
  ),
);

interface SettingsRowBaseProps {
  Icon: React.FC<SvgProps>;
}

interface SettingsLinkProps extends SettingsRowBaseProps {
  onPress?: () => any;
}

interface SettingsToggleProps extends SettingsRowBaseProps {
  value: boolean;
  onChange?: (value: boolean) => any;
  state?: ToggleSpinnerState;
}

const ICON_SIZE = 20;

export const SettingsLink: React.FC<SettingsLinkProps> = props => {
  const {Icon, onPress, children} = props;

  return (
    <Setting onPress={onPress} activeOpacity={ActiveOpacity}>
      <SettingIcon prefix>
        <Icon height={ICON_SIZE} width={ICON_SIZE} />
      </SettingIcon>

      <SettingTitle>{children}</SettingTitle>

      <SettingIcon suffix>
        <AngleRight />
      </SettingIcon>
    </Setting>
  );
};

export const SettingsToggle: React.FC<SettingsToggleProps> = props => {
  const {Icon, onChange, value, state, children} = props;

  return (
    <Setting activeOpacity={ActiveOpacity}>
      <SettingIcon prefix>
        <Icon height={ICON_SIZE} width={ICON_SIZE} />
      </SettingIcon>

      <SettingTitle>{children}</SettingTitle>

      <SettingIcon
        suffix
        style={{
          flexDirection: 'row',
        }}>
        <View
          style={{
            justifyContent: 'center',
          }}>
          <Spinner state={state} />
        </View>
        <ToggleSwitch isEnabled={value} onChange={onChange} />
      </SettingIcon>
    </Setting>
  );
};
