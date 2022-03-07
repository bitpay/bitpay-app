import React from 'react';
import {Cloud, LightBlack} from '../../../styles/colors';
import {useTheme} from 'styled-components/native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {View} from 'react-native';

const TransactionDetailSkeleton = () => {
  const theme = useTheme();

  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
      highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
      <View style={{marginVertical: 20, marginHorizontal: 15}}>
        <SkeletonPlaceholder.Item
          width="65%"
          height={45}
          borderRadius={4}
          marginTop={15}
        />

        <SkeletonPlaceholder.Item
          width="50%"
          height={18}
          marginVertical={15}
          borderRadius={4}
        />

        {[...Array(5)].map((e, i) => (
          <SkeletonPlaceholder.Item
            key={i}
            flexDirection={'row'}
            alignItems={'center'}
            justifyContent={'space-between'}
            minHeight={65}
            borderBottomWidth={1}
            borderBottomColor={theme.dark ? LightBlack : Cloud}>
            <SkeletonPlaceholder.Item
              width={100}
              height={18}
              borderRadius={4}
            />
            <SkeletonPlaceholder.Item
              width={150}
              height={18}
              borderRadius={4}
            />
          </SkeletonPlaceholder.Item>
        ))}

        <SkeletonPlaceholder.Item
          width="100%"
          height={55}
          marginVertical={15}
          borderRadius={6}
        />
      </View>
    </SkeletonPlaceholder>
  );
};

export default TransactionDetailSkeleton;
