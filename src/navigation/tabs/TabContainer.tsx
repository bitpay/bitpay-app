import React, {memo, useMemo} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import styled from 'styled-components/native';

const TabContainer: React.FC<React.PropsWithChildren> = ({children}) => {
  const insets = useSafeAreaInsets();
  const Container = useMemo(
    () => styled.View`
      flex: 1;
    `,
    [insets.top],
  );
  return <Container>{children}</Container>;
};

export default memo(TabContainer);
