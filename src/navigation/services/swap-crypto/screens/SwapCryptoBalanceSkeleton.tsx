import React from 'react';
import {useTheme} from '@react-navigation/native';
import {LightBlack} from '../../../../styles/colors';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const SwapCryptoLoadingWalletSkeleton = () => {
  const theme = useTheme();

  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
      highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
      <SkeletonPlaceholder.Item width={270} height={12} marginTop={20} />
    </SkeletonPlaceholder>
  );
};

export default SwapCryptoLoadingWalletSkeleton;
