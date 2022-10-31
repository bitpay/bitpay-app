import React from 'react';
import {useTheme} from 'styled-components/native';
import {Slate30} from '../../../../styles/colors';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {View} from 'react-native';

const SwapCryptoLoadingWalletSkeleton = () => {
  const theme = useTheme();

  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? '#363636' : '#FAFAFB'}
      highlightColor={theme.dark ? '#575757' : Slate30}>
      <View>
        <SkeletonPlaceholder.Item
          flexDirection={'row'}
          alignItems={'center'}
          justifyContent={'flex-start'}>
          <SkeletonPlaceholder.Item
            width={20}
            height={20}
            borderRadius={50}
            marginRight={8}
          />
          <SkeletonPlaceholder.Item width={70} height={14} borderRadius={4} />
        </SkeletonPlaceholder.Item>
      </View>
    </SkeletonPlaceholder>
  );
};

export default SwapCryptoLoadingWalletSkeleton;
