import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import HeaderBackButton from '../back/HeaderBackButton';
import {HeaderTitle as StyledHeaderTitle} from '../styled/Text';
import {useAppSelector} from '../../utils/hooks';

/*
  A lightweight custom header that replaces the default native-stack toolbar so
  we can fully control safe-area handling on Android & iOS.
*/

interface HeaderProps {
  navigation: any;
  back?: {title?: string; href?: string};
  options: any;
}

export const headerHeight = 56;

const styles = StyleSheet.create({
  wrapper: {
    marginTop: -5,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: headerHeight,
    paddingVertical: 0,
    paddingHorizontal: 16,
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const CustomHeader: React.FC<HeaderProps> = ({navigation, back, options}) => {
  const insets = useSafeAreaInsets();
  const bgColor = options.headerStyle?.backgroundColor || 'transparent';
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);

  // Header title resolution logic from React-Navigation docs
  const title =
    options.headerTitle !== undefined
      ? options.headerTitle
      : options.title !== undefined
      ? options.title
      : options.route?.name;

  const paddingTop = !showArchaxBanner ? insets.top : 0;

  // Resolve custom left/right components if provided via navigation.setOptions
  const resolvedLeft =
    options.headerLeft !== undefined ? (
      typeof options.headerLeft === 'function' ? (
        options.headerLeft({tintColor: options.headerTintColor})
      ) : (
        options.headerLeft
      )
    ) : back ? (
      <HeaderBackButton onPress={navigation.goBack} />
    ) : null;

  const renderLeft = resolvedLeft ?? <View style={{width: 24}} />;

  const resolvedRight =
    options.headerRight !== undefined
      ? typeof options.headerRight === 'function'
        ? options.headerRight({tintColor: options.headerTintColor})
        : options.headerRight
      : null;

  const renderRight = resolvedRight ?? <View style={{width: 24}} />;

  return (
    <View style={[styles.wrapper, {paddingTop, backgroundColor: bgColor}]}>
      <View style={styles.container}>
        {renderLeft}
        <View style={styles.titleContainer}>
          {typeof title === 'function' ? (
            title({tintColor: options.headerTintColor})
          ) : (
            <StyledHeaderTitle>{title}</StyledHeaderTitle>
          )}
        </View>
        {renderRight}
      </View>
    </View>
  );
};

export default CustomHeader;
