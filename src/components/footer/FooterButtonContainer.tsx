import React from 'react';
import {Platform, StyleProp, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CtaContainerAbsolute} from '../styled/Containers';

export type FooterButtonContainerProps = React.PropsWithChildren<{
  background?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

const FooterButtonContainer: React.FC<FooterButtonContainerProps> = ({
  background = true,
  style,
  children,
}) => {
  const insets = useSafeAreaInsets();

  const paddingBottom = insets.bottom;
  const androidCompensation = Platform.OS === 'android' ? -insets.bottom : 0;

  return (
    <CtaContainerAbsolute
      background={background}
      style={[
        {
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
          paddingBottom,
          marginBottom: androidCompensation,
        },
        style,
      ]}>
      {children}
    </CtaContainerAbsolute>
  );
};

export default FooterButtonContainer;
