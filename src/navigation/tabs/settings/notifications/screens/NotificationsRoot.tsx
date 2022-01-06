import React from 'react';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import {
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';

const NotificationSettingsRoot: React.FC = () => {
  return (
    <SettingsContainer>
      <Settings>
        <Setting>
          <SettingTitle>TODO</SettingTitle>
        </Setting>
      </Settings>
    </SettingsContainer>
  );
};

export default NotificationSettingsRoot;
