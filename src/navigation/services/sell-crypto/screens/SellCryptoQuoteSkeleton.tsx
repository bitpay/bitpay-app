import React from 'react';
import {useTheme} from 'styled-components/native';
import {LightBlack} from '../../../../styles/colors';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const SellCryptoLoadingQuoteSkeleton = () => {
  const theme = useTheme();

  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
      highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
      {
        [...Array(2)].map((e, i) => (
          <SkeletonPlaceholder.Item
            key={i}
            flexDirection={'row'}
            alignItems={'center'}
            justifyContent={'space-between'}
            height={26}>
            <SkeletonPlaceholder.Item
              width={100}
              height={14}
              borderRadius={4}
              marginRight={10}
            />
            <SkeletonPlaceholder.Item
              width={70}
              height={14}
              borderRadius={4}
              marginRight={25}
            />
          </SkeletonPlaceholder.Item>
        )) as any
      }
    </SkeletonPlaceholder>
  );
};

export default SellCryptoLoadingQuoteSkeleton;
