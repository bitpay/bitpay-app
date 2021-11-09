import React from 'react';
import { Button, ColorSchemeName, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { AppActions } from '../../../store/app';

const ThemeSettings: React.FC = () => {
  const dispatch = useDispatch();
  const onSetThemePress = (setScheme: ColorSchemeName) => {
    dispatch(AppActions.setColorScheme(setScheme))
  };

  return (
    <View>
      <Button onPress={() => onSetThemePress('light')} title="Light Mode" />
      <Button onPress={() => onSetThemePress('dark')} title="Dark Mode" />
      <Button onPress={() => onSetThemePress(null)} title="System Mode" />
    </View>
  );
};

export default ThemeSettings;
