import React, {memo, ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../contexts';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppSelector} from '../../utils/hooks';

type PropsWithMoreParams<P = unknown> = P & {
  children: ReactNode;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const TabContainer: React.FC<PropsWithMoreParams> = ({children}) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: !showArchaxBanner ? insets.top : 0,
          backgroundColor: theme.colors.background,
        },
      ]}>
      {children}
    </View>
  );
};

export default memo(TabContainer);
