import React, {useState} from 'react';
import {ColorSchemeName, StyleProp, TextStyle, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useTheme} from 'styled-components/native';
import Checkbox from '../../../../../components/checkbox/Checkbox';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {RootState} from '../../../../../store';
import {AppActions} from '../../../../../store/app';
import {LogActions} from '../../../../../store/log';
import {Settings, SettingsContainer} from '../../SettingsRoot';

const ThemeSettings: React.FC = () => {
  const dispatch = useDispatch();
  const currentTheme = useSelector(({APP}: RootState) => APP.colorScheme);
  const onSetThemePress = (setScheme: ColorSchemeName) => {
    setSelected(setScheme);
    dispatch(AppActions.setColorScheme(setScheme));
    dispatch(
      LogActions.info('Theme updated to ' + (setScheme || 'system default')),
    );
  };
  const [selected, setSelected] = useState(currentTheme);
  const selectedTheme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: selectedTheme.colors.text};

  const SETTINGS: {title: string; theme: ColorSchemeName}[] = [
    {title: 'Light Mode', theme: 'light'},
    {title: 'Dark Mode', theme: 'dark'},
    {title: 'System Default', theme: null},
  ];

  return (
    <SettingsContainer>
      <Settings>
        <Hr />
        {SETTINGS.map(({title, theme}) => {
          return (
            <View key={theme}>
              <Setting onPress={() => onSetThemePress(theme)}>
                <SettingTitle style={textStyle}>{title}</SettingTitle>
                <Checkbox
                  radio={true}
                  onPress={() => onSetThemePress(theme)}
                  checked={selected === theme}
                />
              </Setting>
              <Hr />
            </View>
          );
        })}
      </Settings>
    </SettingsContainer>
  );
};

export default ThemeSettings;
