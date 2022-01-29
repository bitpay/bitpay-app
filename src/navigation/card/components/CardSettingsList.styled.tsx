import React from 'react';
import {SvgProps} from 'react-native-svg';
import styled from 'styled-components/native';
import AngleRight from '../../../../assets/img/angle-right.svg';
import {
  Setting,
  SettingIcon,
  SettingTitle,
} from '../../../components/styled/Containers';
import {H4} from '../../../components/styled/Text';
import ToggleSwitch from '../../../components/toggle-switch/ToggleSwitch';

export const CategoryRow = styled.View`
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
  min-height: 58px;
`;

export const CategoryHeading = styled(H4)`
  font-weight: 700;
  margin-top: 25px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  min-height: 58px;
`;

interface SettingsRowBaseProps {
  Icon: React.FC<SvgProps>;
}

interface SettingsLinkProps extends SettingsRowBaseProps {
  onPress?: () => any;
}

interface SettingsToggleProps extends SettingsRowBaseProps {
  value: boolean;
  onChange?: (value: boolean) => any;
}

const ICON_SIZE = 20;

export const SettingsLink: React.FC<SettingsLinkProps> = props => {
  const {Icon, onPress, children} = props;

  return (
    <Setting onPress={onPress}>
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
  const {Icon, onChange, value, children} = props;

  return (
    <Setting>
      <SettingIcon prefix>
        <Icon height={ICON_SIZE} width={ICON_SIZE} />
      </SettingIcon>

      <SettingTitle>{children}</SettingTitle>

      <SettingIcon suffix>
        <ToggleSwitch isEnabled={value} onChange={onChange} />
      </SettingIcon>
    </Setting>
  );
};
