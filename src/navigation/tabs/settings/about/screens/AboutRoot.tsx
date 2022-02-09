import {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
// @ts-ignore
import {version} from '../../../../../../package.json'; // TODO: better way to get version
import Button from '../../../../../components/button/Button';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import {AboutStackParamList} from '../AboutStack';

export interface AboutRootParamList {}

type AboutScreenProps = StackScreenProps<AboutStackParamList, 'Root'>;

const AboutRoot: React.FC<AboutScreenProps> = ({navigation}) => {
  return (
    <SettingsContainer>
      <Settings>
        <Setting>
          <SettingTitle>Version</SettingTitle>

          <Button buttonType="pill">{version}</Button>
        </Setting>

        <Hr />

        <Setting onPress={() => navigation.navigate('SessionLogs')}>
          <SettingTitle>Session Log</SettingTitle>
        </Setting>
      </Settings>
    </SettingsContainer>
  );
};

export default AboutRoot;
