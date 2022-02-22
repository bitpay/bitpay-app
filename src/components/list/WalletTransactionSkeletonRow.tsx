import React from 'react';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {View} from 'react-native';
import {Row, ScreenGutter} from '../styled/Containers';
import styled from 'styled-components/native';

const SkeletonRow = styled.View`
  flex-direction: row;
  align-items: center;
  flex: 1;
  background-color: teal;
`;
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
          style={{width: 35, height: 35, borderRadius: 50, marginRight: 10}}
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
