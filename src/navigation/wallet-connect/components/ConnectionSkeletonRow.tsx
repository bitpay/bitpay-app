import React from 'react';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {View} from 'react-native';
import {useTheme} from 'styled-components/native';
import {LightBlack} from '../../../styles/colors';

const ConnectionSkeletonRow = () => {
  const theme = useTheme();

  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
      highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
      <View>
        <SkeletonPlaceholder.Item flexDirection={'row'} alignItems={'center'}>
          <SkeletonPlaceholder.Item
            width={37}
            height={37}
            borderRadius={50}
            marginRight={10}
          />
          <SkeletonPlaceholder.Item width={150} height={18} borderRadius={4} />
          <SkeletonPlaceholder.Item />
        </SkeletonPlaceholder.Item>
      </View>
    </SkeletonPlaceholder>
  );
};

export default ConnectionSkeletonRow;
