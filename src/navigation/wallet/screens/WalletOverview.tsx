import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../../../components/styled/Text';
import {useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';

const OverviewContainer = styled.SafeAreaView`
  flex: 1;
`;

const WalletOverview = () => {
  const route = useRoute<RouteProp<WalletStackParamList, 'WalletOverview'>>();
  const {wallet} = route.params;
  return (
    <OverviewContainer>
      <BaseText>{wallet.id}</BaseText>
    </OverviewContainer>
  );
};

export default WalletOverview;
