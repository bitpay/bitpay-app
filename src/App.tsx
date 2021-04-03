import 'react-native-gesture-handler';
import React, {useEffect, useState} from 'react';
import {useSelector} from 'react-redux';
import {NavigationContainer} from '@react-navigation/native';
import SplashScreen from './navigation/app/screens/Splash';
import TabsStack from './navigation/tabs/TabsStack';
import OnboardingStack from './navigation/onboarding/OnboardingStack';
import {RootState} from './store';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const account = useSelector(({AUTH}: RootState) => AUTH.account);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {account ? <TabsStack /> : <OnboardingStack />}
    </NavigationContainer>
  );
};

export default App;
