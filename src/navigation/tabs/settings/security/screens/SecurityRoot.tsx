import React from 'react';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import Button from '../../../../../components/button/Button';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';

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
