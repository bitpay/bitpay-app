import React from 'react';
import {useTheme} from 'styled-components/native';
import {LightBlack} from '../../../../styles/colors';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {View} from 'react-native';

const AddressesSkeleton = () => {
  const theme = useTheme();

  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
      highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
      <View>
        <SkeletonPlaceholder.Item
          width="40%"
          height={25}
          marginTop={25}
          marginBottom={10}
          borderRadius={4}
        />

        <SkeletonPlaceholder.Item
          flexDirection={'row'}
          alignItems={'center'}
          justifyContent={'space-between'}
          height={55}>
          <SkeletonPlaceholder.Item
            width={100}
            height={25}
            marginTop={10}
            marginBottom={10}
            borderRadius={4}
          />
        </SkeletonPlaceholder.Item>

        {[...Array(3)].map((e, i) => (
          <SkeletonPlaceholder.Item
            key={i}
            flexDirection={'row'}
            alignItems={'center'}
            justifyContent={'space-between'}
            height={55}>
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
        ))}
      </View>
    </SkeletonPlaceholder>
  );
};

export default AddressesSkeleton;
