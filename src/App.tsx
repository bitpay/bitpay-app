import 'react-native-gesture-handler';
import React, {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {NavigationContainer} from '@react-navigation/native';
import SplashScreen from './navigation/app/screens/Splash';
import TabsStack from './navigation/tabs/TabsStack';
import OnboardingStack from './navigation/onboarding/OnboardingStack';
import {RootState} from './store';
import {AppActions} from './store/app/app.actions';

const App = () => {
  const account = useSelector(({AUTH}: RootState) => AUTH.account);
  const appIsLoading = useSelector(({APP}: RootState) => APP.appIsLoading);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(AppActions.startAppInit());
  }, [dispatch]);

  if (appIsLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {account ? <TabsStack /> : <OnboardingStack />}
    </NavigationContainer>
  );
};

export default App;
