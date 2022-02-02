import {useNavigation} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import Button from '../../components/button/Button';
import haptic from '../../components/haptic-feedback/haptic';
import {HeaderRightContainer} from '../../components/styled/Containers';
import {Network} from '../../constants';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import {RootState} from '../../store';
import {BitPayIdActions} from '../../store/bitpay-id';
import {User} from '../../store/bitpay-id/bitpay-id.models';
import Pair from './screens/Pair';
import Profile from './screens/ProfileSettings';

export type BitpayIdStackParamList = {
  Pair: {
    secret?: string;
    code?: string;
    dashboardRedirect?: boolean;
    vcd?: string;
  };
  Profile: undefined;
};

export enum BitpayIdScreens {
  PAIR = 'Pair',
  PROFILE = 'Profile',
}

const BitpayId = createStackNavigator<BitpayIdStackParamList>();

const BitpayIdStack = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const network = useSelector<RootState, Network>(({APP}) => APP.network);
  const user = useSelector<RootState, User | null>(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );

  return (
    <BitpayId.Navigator
      screenOptions={{...baseNavigatorOptions}}
      initialRouteName={BitpayIdScreens.PROFILE}>
      <BitpayId.Screen
        name={BitpayIdScreens.PAIR}
        component={Pair}
        options={{
          ...baseScreenOptions,
        }}
      />
      <BitpayId.Screen
        name={BitpayIdScreens.PROFILE}
        component={Profile}
        options={{
          ...baseScreenOptions,
          headerRight: () => {
            return (
              <HeaderRightContainer>
                <Button
                  buttonType={'pill'}
                  onPress={() => {
                    haptic('impactLight');

                    if (user) {
                      navigation.navigate('Tabs', {
                        screen: 'Settings',
                      });

                      dispatch(BitPayIdActions.bitPayIdDisconnected(network));
                    } else {
                      navigation.navigate('Auth', {
                        screen: 'LoginSignup',
                        params: {context: 'login'},
                      });
                    }
                  }}>
                  {user ? 'Log Out' : 'Log In'}
                </Button>
              </HeaderRightContainer>
            );
          },
        }}
      />
    </BitpayId.Navigator>
  );
};

export default BitpayIdStack;
