import React, {memo, useMemo, ReactNode} from 'react';
import styled from 'styled-components/native';

type PropsWithMoreParams<P = unknown> = P & {
  children: ReactNode;
  removeMarginTop?: boolean;
};

const TabContainer: React.FC<PropsWithMoreParams> = ({children}) => {
  const Container = useMemo(
    () => styled.View`
      flex: 1;
    `,
    [],
  );
  return <Container>{children}</Container>;
};

export default memo(TabContainer);
