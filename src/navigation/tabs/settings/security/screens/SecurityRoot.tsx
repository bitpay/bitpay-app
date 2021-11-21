import React from 'react';
import {
  Hr,
  Setting,
  Settings,
  SettingsContainer,
  SettingTitle,
} from '../../SettingsRoot';
import Button from '../../../../../components/button/Button';

const SecuritySettingsRoot: React.FC = () => {
  return (
    <SettingsContainer>
      <Settings>
        <Hr />
        <Setting>
          <SettingTitle>Lock App</SettingTitle>
          <Button buttonType={'pill'}>Disabled</Button>
        </Setting>
        <Hr />
      </Settings>
    </SettingsContainer>
  );
};

export default SecuritySettingsRoot;
