import React, {useState} from 'react';
import {ColorSchemeName, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {AppActions} from '../../../../../store/app';
import {
  Setting,
  Settings,
  SettingsContainer,
  SettingTitle,
} from '../../SettingsRoot';
import Checkbox from '../../../../../components/checkbox/Checkbox';
import {RootState} from '../../../../../store';
import {Hr} from '../../../../../components/styled/Containers';

const ThemeSettings: React.FC = () => {
  const dispatch = useDispatch();
  const currentTheme = useSelector(({APP}: RootState) => APP.colorScheme);
  const onSetThemePress = (setScheme: ColorSchemeName) => {
    setSelected(setScheme);
    dispatch(AppActions.setColorScheme(setScheme));
  };
  const [selected, setSelected] = useState(currentTheme);

  const SETTINGS: {title: string; theme: ColorSchemeName}[] = [
    {title: 'Light Mode', theme: 'light'},
    {title: 'Dark Mode', theme: 'dark'},
    {title: 'System Mode', theme: null},
  ];

  return (
    <SettingsContainer>
      <Settings>
        <Hr />
        {SETTINGS.map(({title, theme}) => {
          return (
            <View key={theme}>
              <Setting onPress={() => onSetThemePress(theme)}>
                <SettingTitle>{title}</SettingTitle>
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
