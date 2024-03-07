import React from 'react';
import {useTheme} from 'styled-components/native';
import {LightBlack} from '../../../../styles/colors';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const SellCryptoLoadingWalletSkeleton = () => {
  const theme = useTheme();

  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
      highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
      <SkeletonPlaceholder.Item width={220} height={12} marginTop={20} />
    </SkeletonPlaceholder>
  );
};

export default SellCryptoLoadingWalletSkeleton;
