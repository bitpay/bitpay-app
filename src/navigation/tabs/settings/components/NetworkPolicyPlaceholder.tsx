import {useTheme} from 'styled-components/native';
import {LightBlack} from '../../../../styles/colors';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import React from 'react';
import {View} from 'react-native';

const NetworkPolicyPlaceholder = () => {
  const theme = useTheme();
  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
      highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
      <View style={{marginTop: 20}}>
        {[...Array(2)].map((e, i) => (
          <View style={{marginBottom: 30}} key={i}>
            <SkeletonPlaceholder.Item
              flexDirection={'row'}
              alignItems={'center'}
              marginBottom={15}>
              <SkeletonPlaceholder.Item
                width={20}
                height={20}
                borderRadius={50}
                marginRight={10}
              />

              <SkeletonPlaceholder.Item
                width={250}
                height={18}
                borderRadius={4}
              />
            </SkeletonPlaceholder.Item>

            <SkeletonPlaceholder.Item
              marginBottom={50}
              width={250}
              height={18}
              borderRadius={4}
            />
            <SkeletonPlaceholder.Item
              marginBottom={15}
              width="100%"
              height={18}
              borderRadius={4}
            />
            <SkeletonPlaceholder.Item
              flexDirection={'row'}
              alignItems={'center'}
              justifyContent={'space-between'}>
              <SkeletonPlaceholder.Item
                width={100}
                height={18}
                borderRadius={4}
              />
              <SkeletonPlaceholder.Item
                width={100}
                height={18}
                borderRadius={4}
              />
            </SkeletonPlaceholder.Item>
          </View>
        ))}
      </View>
    </SkeletonPlaceholder>
  );
};

export default NetworkPolicyPlaceholder;
