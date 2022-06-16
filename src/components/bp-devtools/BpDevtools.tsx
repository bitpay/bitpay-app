import React from 'react';
import {useTranslation} from 'react-i18next';
import {
  Appearance,
  ColorSchemeName,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import {Network} from '../../constants';
import {navigationRef} from '../../Root';
import {RootState} from '../../store';
import {AppActions} from '../../store/app';
import {Action, NeutralSlate, SlateDark, White} from '../../styles/colors';
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

const NetworkToggle = () => {
  const dispatch = useDispatch();
  const isTestnet = useSelector<RootState, boolean>(({APP}) => {
    return APP.network === Network.testnet;
  });

  const toggleNetwork = () => {
    haptic('impactLight');
    dispatch(
      AppActions.networkChanged(isTestnet ? Network.mainnet : Network.testnet),
    );
  };

  return (
    <Container>
      <Text>Testnet</Text>
      <Switch value={isTestnet} onChange={() => toggleNetwork()} />
    </Container>
  );
};

const ThemeToggle = () => {
  const {t} = useTranslation();
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
      <Text>{t('Dark Mode')}</Text>
      <Switch value={scheme === 'dark'} onChange={() => toggleTheme()} />
    </Container>
  );
};

const LanguageToggle = () => {
  const {t} = useTranslation();
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
      <Text>{t('Spanish')}</Text>
      <Switch value={language === 'es'} onChange={() => toggleLanguage()} />
    </Container>
  );
};

const SkipIntroButton = () => {
  const {t} = useTranslation();
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
        <DebugButtonText>{t('Skip Onboarding')}</DebugButtonText>
      </DebugButton>
    </Container>
  );
};

const BpDevtools = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={{marginTop: insets.top}}>
      <ScrollView
        horizontal={true}
        style={{
          flexDirection: 'row',
          backgroundColor: SlateDark,
          borderColor: 'red',
          borderWidth: 2,
        }}>
        <NetworkToggle />
        <ThemeToggle />
        <LanguageToggle />
        <SkipIntroButton />
        {/* add more stuff */}
      </ScrollView>
    </View>
  );
};

export default BpDevtools;
