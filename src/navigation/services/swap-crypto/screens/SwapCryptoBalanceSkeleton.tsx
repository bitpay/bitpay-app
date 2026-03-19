import React from 'react';
import {useTheme} from 'styled-components/native';
import {LightBlack} from '../../../../styles/colors';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const SwapCryptoBalanceSkeleton = () => {
  const theme = useTheme();

  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
      highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
      <SkeletonPlaceholder.Item width={210} height={15} marginTop={0} />
    </SkeletonPlaceholder>
  );
};

export default SwapCryptoBalanceSkeleton;
