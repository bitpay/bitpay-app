import React from 'react';
import {Appearance, ColorSchemeName, Switch, Text, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import {RootState} from '../../store';
import {AppActions} from '../../store/app';
import haptic from '../haptic-feedback/haptic';

const Container = styled.View`
  align-items: center;
  border: 1px solid red;
  flex-direction: row;
  flex-grow: 1;
  padding: 10px;
`;

const ThemeToggle = () => {
  const dispatch = useDispatch();
  const scheme =
    useSelector<RootState, ColorSchemeName>(({APP}) => APP.colorScheme) ||
    Appearance.getColorScheme();

  const toggleTheme = () => {
    haptic('impactLight');
    dispatch(AppActions.setColorScheme(scheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <Container>
      <Text>Dark Mode</Text>
      <Switch value={scheme === 'dark'} onChange={() => toggleTheme()} />
    </Container>
  );
};

const LanguageToggle = () => {
  const dispatch = useDispatch();
  const language = useSelector<RootState, string>(
    ({APP}) => APP.defaultLanguage,
  );

  const toggleLanguage = () => {
    haptic('impactLight');
    dispatch(AppActions.setDefaultLanguage(language === 'es' ? 'en' : 'es'));
  };

  return (
    <Container>
      <Text>Español</Text>
      <Switch value={language === 'es'} onChange={() => toggleLanguage()} />
    </Container>
  );
};

const BpDevtools = () => {
  return (
    <View
      style={{
        backgroundColor: '#444',
        borderWidth: 2,
        borderColor: 'red',
        flexDirection: 'row',
      }}>
      <ThemeToggle />
      <LanguageToggle />
      {/* add more stuff */}
    </View>
  );
};

export default BpDevtools;
