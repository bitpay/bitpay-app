import {useTheme} from 'styled-components/native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {LightBlack} from '../../../styles/colors';
import React from 'react';

const ReferredUsersSkeleton = () => {
  const theme = useTheme();

  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
      highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
      {[...Array(3)].map((e, i) => (
        <SkeletonPlaceholder.Item
          key={i}
          flexDirection={'row'}
          alignItems={'center'}
          justifyContent={'space-between'}
          height={55}>
          <SkeletonPlaceholder.Item width={125} height={20} borderRadius={4} />

          <SkeletonPlaceholder.Item width={75} height={20} borderRadius={4} />
        </SkeletonPlaceholder.Item>
      ))}
    </SkeletonPlaceholder>
  );
};

export default ReferredUsersSkeleton;
