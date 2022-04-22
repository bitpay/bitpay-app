import {useTheme} from 'styled-components/native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {LightBlack} from '../../../styles/colors';
import React from 'react';

const ReferralCodeSkeleton = () => {
  const theme = useTheme();

  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
      highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
      <SkeletonPlaceholder.Item
        paddingVertical={10}
        borderRadius={4}
        height={55}
      />
      <SkeletonPlaceholder.Item
        paddingVertical={10}
        borderRadius={4}
        marginVertical={20}
        height={55}
      />
    </SkeletonPlaceholder>
  );
};

export default ReferralCodeSkeleton;
