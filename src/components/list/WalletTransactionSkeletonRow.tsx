import React from 'react';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {View} from 'react-native';
import {TRANSACTION_ICON_SIZE} from '../../store/wallet/effects/transactions/transactions';

const WalletTransactionSkeletonRow = () => {
  return (
    <SkeletonPlaceholder>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View
          style={{
            width: TRANSACTION_ICON_SIZE,
            height: TRANSACTION_ICON_SIZE,
            borderRadius: 50,
            marginRight: 10,
          }}
        />
        <View style={{width: 150, height: 18, borderRadius: 4}} />
        <View style={{marginLeft: 'auto', alignItems: 'flex-end'}}>
          <View
            style={{width: 80, height: 14, borderRadius: 4, marginBottom: 5}}
          />
          <View style={{width: 70, height: 12, borderRadius: 4}} />
        </View>
      </View>
    </SkeletonPlaceholder>
  );
};

export default WalletTransactionSkeletonRow;
