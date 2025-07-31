import React, {memo, useMemo, ReactNode} from 'react';
import {Platform} from 'react-native';
import styled from 'styled-components/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppSelector} from '../../utils/hooks';

type PropsWithMoreParams<P = unknown> = P & {
  children: ReactNode;
};

const TabContainer: React.FC<PropsWithMoreParams> = ({children}) => {
  const insets = useSafeAreaInsets();
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const Container = useMemo(
    () => styled.View`
      flex: 1;
      padding-top: ${Platform.OS === 'android' && !showArchaxBanner
        ? insets.top
        : 0}px;
    `,
    [],
  );
  return <Container>{children}</Container>;
};

export default memo(TabContainer);
