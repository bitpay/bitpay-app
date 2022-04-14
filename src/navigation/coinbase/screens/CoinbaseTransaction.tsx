import React from 'react';
import moment from 'moment';
import styled from 'styled-components/native';
import {CoinbaseTransactionProps} from '../../../api/coinbase/coinbase.types';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, TextAlign} from '../../../components/styled/Text';
import {SlateDark, White} from '../../../styles/colors';
import {Hr} from '../../../components/styled/Containers';

import {StackScreenProps} from '@react-navigation/stack';
import {CoinbaseStackParamList} from '../CoinbaseStack';
import CoinbaseIcon from '../components/CoinbaseIcon';

const TransactionContainer = styled.SafeAreaView`
  flex: 1;
`;

const TransactionScrollContainer = styled.ScrollView`
  margin-top: 10px;
  padding: 0 ${ScreenGutter};
`;

const HeaderContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: 20px;
`;

const HeaderTitle = styled.Text`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 24px;
  font-weight: bold;
`;

const HeaderSubtitle = styled.Text`
  font-size: 16px;
`;

const HeaderIcon = styled.View`
  font-size: 16px;
`;

const SummaryContainer = styled.View`
  margin-top: 20px;
`;

const Details = styled.View`
  margin-top: 10px;
`;

const Detail = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 60px;
`;

const DetailInfo = styled(TextAlign)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
`;

const Item = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0;
`;

const Title = styled(BaseText)`
  margin-top: 20px;
  margin-bottom: 10px;
  font-size: 16px;
  font-style: normal;
  font-weight: bold;
  letter-spacing: 0;
  border-bottom-color: #000000;
  border-bottom-width: 2px;
`;

export type CoinbaseTransactionScreenParamList = {
  tx: CoinbaseTransactionProps;
};

const CoinbaseTransaction = ({
  route,
}: StackScreenProps<CoinbaseStackParamList, 'CoinbaseTransaction'>) => {
  const {tx} = route.params;

  const parseTime = (timestamp?: string) => {
    if (!timestamp) return '';
    return moment(timestamp).format('MMM D, YYYY hh:mm a');
  };

  const getIcon = () => {
    return CoinbaseIcon(tx);
  };

  return (
    <TransactionContainer>
      <TransactionScrollContainer>
        <HeaderContainer>
          <HeaderTitle>
            {tx.details.title}
            {'\n'}
            <HeaderSubtitle>{tx.details.subtitle}</HeaderSubtitle>
          </HeaderTitle>
          <HeaderIcon>{getIcon()}</HeaderIcon>
        </HeaderContainer>
        <SummaryContainer>
          <Title>Summary</Title>
          <Hr />
          <Details>
            <Detail>
              <Item>Amount</Item>
              <DetailInfo align="right">
                {tx.amount.amount} {tx.amount.currency}
              </DetailInfo>
            </Detail>
            <Hr />
            <Detail>
              <Item>Native Amount</Item>
              <DetailInfo align="right">
                {tx.native_amount.amount} {tx.native_amount.currency}
              </DetailInfo>
            </Detail>
            <Hr />
            <Detail>
              <Item>Status</Item>
              <DetailInfo align="right">{tx.status}</DetailInfo>
            </Detail>
            <Hr />
            <Detail>
              <Item>Date</Item>
              <DetailInfo align="right">{parseTime(tx.created_at)}</DetailInfo>
            </Detail>
            <Hr />
            {tx.to && tx.to.address ? (
              <>
                <Detail>
                  <Item>To</Item>
                  <DetailInfo align="right">{tx.to.address}</DetailInfo>
                </Detail>
                <Hr />
              </>
            ) : null}
          </Details>
        </SummaryContainer>
      </TransactionScrollContainer>
    </TransactionContainer>
  );
};

export default CoinbaseTransaction;
