import {Platform} from 'react-native';
import {useContext} from 'react';
import {BottomTabBarHeightContext} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  FLOATING_TAB_BAR_CONTENT_GAP,
  getFloatingTabBarBottomOffset,
} from './floatingTabBar';

const useFloatingTabBarInset = () => {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const {bottom} = useSafeAreaInsets();
  if (Platform.OS !== 'ios') {
    return 0;
  }
  // Without the tab context (e.g. root-stack route) there is no pill to clear.
  const barInset =
    tabBarHeight === undefined
      ? bottom
      : tabBarHeight + getFloatingTabBarBottomOffset(bottom);
  return barInset + FLOATING_TAB_BAR_CONTENT_GAP;
};

export default useFloatingTabBarInset;
