import React from 'react';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {View} from 'react-native';
import {TRANSACTION_ICON_SIZE} from '../../constants/TransactionIcons';
import {useTheme} from 'styled-components/native';
import {LightBlack} from '../../styles/colors';

const WalletTransactionSkeletonRow = () => {
  const theme = useTheme();

  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
      highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
      <View>
        <SkeletonPlaceholder.Item width="100%" height={55} />

        <SkeletonPlaceholder.Item
          flexDirection={'row'}
          alignItems={'center'}
          justifyContent={'space-between'}
          padding={15}>
          <SkeletonPlaceholder.Item
            width={TRANSACTION_ICON_SIZE}
            height={TRANSACTION_ICON_SIZE}
            borderRadius={50}
            marginRight={8}
          />
          <SkeletonPlaceholder.Item width={150} height={18} borderRadius={4} />
          <SkeletonPlaceholder.Item marginLeft={'auto'} alignItems={'flex-end'}>
            <SkeletonPlaceholder.Item
              width={80}
              height={14}
              borderRadius={4}
              marginBottom={5}
            />
            <SkeletonPlaceholder.Item width={70} height={12} borderRadius={4} />
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder.Item>
      </View>
    </SkeletonPlaceholder>
  );
};

export default WalletTransactionSkeletonRow;
