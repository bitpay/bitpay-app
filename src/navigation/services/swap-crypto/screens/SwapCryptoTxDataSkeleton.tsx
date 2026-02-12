import React from 'react';
import {useTheme} from 'styled-components/native';
import {LightBlack} from '../../../../styles/colors';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const SwapCryptoTxDataSkeleton = () => {
  const theme = useTheme();

  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
      highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
      <SkeletonPlaceholder.Item width={90} height={15} />
    </SkeletonPlaceholder>
  );
};

export default SwapCryptoTxDataSkeleton;
