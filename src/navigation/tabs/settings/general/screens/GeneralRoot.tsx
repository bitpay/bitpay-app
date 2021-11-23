import React from 'react';
import {
  Setting,
  Settings,
  SettingsContainer,
  SettingTitle,
} from '../../SettingsRoot';
import Button from '../../../../../components/button/Button';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../../store';
import {Hr} from '../../../../../components/styled/Containers';

const GeneralSettingsRoot: React.FC = () => {
  const navigation = useNavigation();
  const colorScheme = useSelector(({APP}: RootState) => APP.colorScheme);

  return (
    <SettingsContainer>
      <Settings>
        <Hr />
        <Setting
          onPress={() =>
            navigation.navigate('GeneralSettings', {screen: 'Theme'})
          }>
          <SettingTitle>Theme</SettingTitle>
          <Button
            buttonType={'pill'}
            onPress={() =>
              navigation.navigate('GeneralSettings', {screen: 'Theme'})
            }>
            {colorScheme === 'light'
              ? 'Light Mode'
              : colorScheme === 'dark'
              ? 'Dark Mode'
              : 'System Default'}
          </Button>
        </Setting>
        <Hr />
      </Settings>
    </SettingsContainer>
  );
};

export default GeneralSettingsRoot;
