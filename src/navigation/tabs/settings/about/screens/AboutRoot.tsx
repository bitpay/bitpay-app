import React from 'react';
import {
  Setting,
  Settings,
  SettingsContainer,
  SettingTitle,
} from '../../SettingsRoot';

const AboutRoot: React.FC = () => {
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

export default AboutRoot;
