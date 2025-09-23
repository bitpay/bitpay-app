import React from 'react';
import {Platform, StyleProp, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import {CtaContainerAbsolute} from '../styled/Containers';

const ShadowedContainer = styled(CtaContainerAbsolute)`
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
`;

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
    <ShadowedContainer
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
    </ShadowedContainer>
  );
};

export default FooterButtonContainer;
