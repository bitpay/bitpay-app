import 'react-native-gesture-handler';
import React, {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {DefaultTheme, NavigationContainer} from '@react-navigation/native';
import SplashScreen from './navigation/app/screens/Splash';
import TabsStack from './navigation/tabs/TabsStack';
import OnboardingStack from './navigation/onboarding/OnboardingStack';
import {RootState} from './store';
import {AppEffects} from './store/app';

// TODO build themes
const navTheme = DefaultTheme;
navTheme.colors.background = '#fff';

const Root = () => {
  const onboardingCompleted = useSelector(
    ({APP}: RootState) => APP.onboardingCompleted,
  );
  const appIsLoading = useSelector(({APP}: RootState) => APP.appIsLoading);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(AppEffects.startAppInit());
  }, [dispatch]);

  if (appIsLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      {!onboardingCompleted ? <OnboardingStack /> : <TabsStack />}
    </NavigationContainer>
  );
};

export default Root;
