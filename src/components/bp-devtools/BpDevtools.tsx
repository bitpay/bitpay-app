import React from 'react';
import {
  Appearance,
  ColorSchemeName,
  Switch,
  Text,
  View,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import {navigationRef} from '../../Root';
import {RootState} from '../../store';
import {AppActions} from '../../store/app';
import {Action, NeutralSlate, White} from '../../styles/colors';
import haptic from '../haptic-feedback/haptic';

const Container = styled.View`
  align-items: center;
  border: 1px solid red;
  flex-direction: row;
  flex-grow: 1;
  padding: 10px;
`;

const DebugButton = styled.TouchableOpacity<{disabled?: boolean}>`
  justify-content: center;
  background-color: ${({disabled}) => (disabled ? NeutralSlate : Action)};
  opacity: ${({disabled}) => (disabled ? 0.5 : 1)};
  padding: 10px;
`;

const DebugButtonText = styled.Text`
  color: ${White};
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

const SkipIntroButton = () => {
  const dispatch = useDispatch();
  const onboardingCompleted = useSelector<RootState, boolean>(
    ({APP}) => APP.onboardingCompleted,
  );

  const onPress = () => {
    if (onboardingCompleted) {
      return;
    }

    dispatch(AppActions.setOnboardingCompleted());

    navigationRef.navigate('Tabs', {screen: 'Home'});
  };

  return (
    <Container>
      <DebugButton disabled={onboardingCompleted} onPress={onPress}>
        <DebugButtonText>Skip Onboarding</DebugButtonText>
      </DebugButton>
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
      <SkipIntroButton />
      {/* add more stuff */}
    </View>
  );
};

export default BpDevtools;
