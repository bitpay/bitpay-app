import React from 'react';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import Button from '../../../../../components/button/Button';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {useTheme} from '@react-navigation/native';

const SecuritySettingsRoot: React.FC = () => {
  const theme = useTheme();
  return (
    <SettingsContainer>
      <Settings>
        <Hr isDark={theme.dark} />
        <Setting>
          <SettingTitle>Lock App</SettingTitle>
          <Button buttonType={'pill'}>Disabled</Button>
        </Setting>
        <Hr isDark={theme.dark} />
      </Settings>
    </SettingsContainer>
  );
};

export default SecuritySettingsRoot;
