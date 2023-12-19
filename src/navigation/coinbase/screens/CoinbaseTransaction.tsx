import React from 'react';
import moment from 'moment';
import styled from 'styled-components/native';
import {CoinbaseTransactionProps} from '../../../api/coinbase/coinbase.types';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, TextAlign} from '../../../components/styled/Text';
import {SlateDark, White} from '../../../styles/colors';
import {Hr} from '../../../components/styled/Containers';

import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CoinbaseStackParamList} from '../CoinbaseStack';
import CoinbaseIcon from '../components/CoinbaseIcon';
import {View} from 'react-native';
import {formatCryptoAddress} from '../../../utils/helper-methods';
import {useTranslation} from 'react-i18next';

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
  align-items: center;
`;

const HeaderTitle = styled.Text`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 24px;
  font-weight: bold;
`;

const HeaderSubtitle = styled.Text`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 16px;
  margin-top: 8px;
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
}: NativeStackScreenProps<CoinbaseStackParamList, 'CoinbaseTransaction'>) => {
  const {t} = useTranslation();
  const {tx} = route.params;

  const parseTime = (timestamp?: string) => {
    if (!timestamp) {
      return '';
    }
    return moment(timestamp).format('MMM D, YYYY hh:mm a');
  };

  const getIcon = () => {
    return CoinbaseIcon(tx);
  };

  return (
    <TransactionContainer>
      <TransactionScrollContainer>
        <HeaderContainer>
          <View>
            <HeaderTitle>{tx.details.title}</HeaderTitle>
            <HeaderSubtitle
              numberOfLines={1}
              style={{width: '90%'}}
              ellipsizeMode={'tail'}>
              {tx.details.subtitle}
            </HeaderSubtitle>
          </View>
          <HeaderIcon>{getIcon()}</HeaderIcon>
        </HeaderContainer>
        <SummaryContainer>
          <Title>{t('Summary')}</Title>
          <Hr />
          <Details>
            <Detail>
              <Item>{t('Amount')}</Item>
              <DetailInfo align="right">
                {tx.amount.amount} {tx.amount.currency}
              </DetailInfo>
            </Detail>
            <Hr />
            <Detail>
              <Item>{t('Native Amount')}</Item>
              <DetailInfo align="right">
                {tx.native_amount.amount} {tx.native_amount.currency}
              </DetailInfo>
            </Detail>
            <Hr />
            <Detail>
              <Item>{t('Status')}</Item>
              <DetailInfo align="right">{tx.status}</DetailInfo>
            </Detail>
            <Hr />
            <Detail>
              <Item>{t('Date')}</Item>
              <DetailInfo align="right">{parseTime(tx.created_at)}</DetailInfo>
            </Detail>
            <Hr />
            {tx.to && tx.to.address ? (
              <>
                <Detail>
                  <Item>{t('To')}</Item>
                  <DetailInfo align="right">
                    {formatCryptoAddress(tx.to.address)}
                  </DetailInfo>
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
