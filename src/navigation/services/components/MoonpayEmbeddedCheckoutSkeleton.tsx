import React from 'react';
import {useTheme} from '../../../contexts';
import {LightBlack} from '../../../styles/colors';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const MoonpayEmbeddedCheckoutSkeleton = ({
  context,
}: {
  context: 'data' | 'amount';
}) => {
  const theme = useTheme();

  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
      highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
      {context === 'amount' ? (
        <SkeletonPlaceholder.Item
          key={'amount-skeleton'}
          flexDirection={'row'}
          alignItems={'center'}
          justifyContent={'center'}
          height={20}>
          <SkeletonPlaceholder.Item width={120} height={20} borderRadius={4} />
        </SkeletonPlaceholder.Item>
      ) : null}
      {context === 'data'
        ? ([...Array(6)].map((e, i) => (
            <SkeletonPlaceholder.Item
              key={i}
              flexDirection={'row'}
              alignItems={'center'}
              justifyContent={'space-between'}
              height={46}>
              <SkeletonPlaceholder.Item
                width={100}
                height={20}
                borderRadius={4}
                marginRight={10}
              />

              <SkeletonPlaceholder.Item
                width={140}
                height={20}
                borderRadius={4}
                marginRight={0}
              />
            </SkeletonPlaceholder.Item>
          )) as any)
        : null}
    </SkeletonPlaceholder>
  );
};

export default MoonpayEmbeddedCheckoutSkeleton;
