import React from 'react';
import {useTheme} from 'styled-components/native';
import {LightBlack} from '../../../../styles/colors';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const MoonpaySellCheckoutSkeleton = () => {
  const theme = useTheme();

  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
      highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
      {
        [...Array(5)].map((e, i) => (
          <SkeletonPlaceholder.Item
            key={i}
            flexDirection={'row'}
            alignItems={'center'}
            justifyContent={'space-between'}
            height={65}>
            <SkeletonPlaceholder.Item
              width={150}
              height={20}
              borderRadius={4}
              marginRight={10}
            />

            <SkeletonPlaceholder.Item
              width={120}
              height={20}
              borderRadius={4}
              marginRight={10}
            />
          </SkeletonPlaceholder.Item>
        )) as any
      }
    </SkeletonPlaceholder>
  );
};

export default MoonpaySellCheckoutSkeleton;
