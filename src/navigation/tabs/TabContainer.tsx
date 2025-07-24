import React, {memo, useMemo, ReactNode} from 'react';
import {Platform} from 'react-native';
import styled from 'styled-components/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type PropsWithMoreParams<P = unknown> = P & {
  children: ReactNode;
  removeMarginTop?: boolean;
};

const TabContainer: React.FC<PropsWithMoreParams> = ({children}) => {
  const insets = useSafeAreaInsets();
  const Container = useMemo(
    () => styled.View`
      flex: 1;
      padding-top: ${Platform.OS === 'android' ? insets.top : 0}px;
    `,
    [],
  );
  return <Container>{children}</Container>;
};

export default memo(TabContainer);
