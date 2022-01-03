import React from 'react';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import {
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';

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
