import {useContext} from 'react';
import {BottomTabBarHeightContext} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {getFloatingTabBarBottomOffset} from './floatingTabBar';

const useFloatingTabBarInset = () => {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const {bottom} = useSafeAreaInsets();
  return tabBarHeight
    ? tabBarHeight + getFloatingTabBarBottomOffset(bottom)
    : 0;
};

export default useFloatingTabBarInset;
