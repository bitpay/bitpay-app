import React, {memo, useMemo, ReactNode} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import styled from 'styled-components/native';

type PropsWithMoreParams<P = unknown> = P & {
  children: ReactNode;
  removeMarginTop: boolean;
};

const TabContainer: React.FC<PropsWithMoreParams> = ({
  children,
  removeMarginTop,
}) => {
  const insets = useSafeAreaInsets();
  const Container = useMemo(
    () => styled.View`
      flex: 1;
      margin-top: ${removeMarginTop ? 0 : insets.top}px;
    `,
    [insets.top, removeMarginTop],
  );
  return <Container>{children}</Container>;
};

export default memo(TabContainer);
