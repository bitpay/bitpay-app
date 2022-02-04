import React from 'react';
import {View} from 'react-native';
import styled from 'styled-components/native';
import A from '../../../components/anchor/Anchor';
import {ScreenGutter} from '../../../components/styled/Containers';
import {TextAlign} from '../../../components/styled/Text';
import Tabs from '../../../components/tabs/Tabs';
import {NeutralSlate, White} from '../../../styles/colors';

interface TableRowProps {
  index?: number;
}

const MINER_FEES_URL =
  'https://support.bitpay.com/hc/en-us/articles/115003393863-What-are-bitcoin-miner-fees-';

const TableRow = styled.View<TableRowProps>`
  align-items: center;
  background-color: ${({index}) => ((index || 0) % 2 ? White : NeutralSlate)};
  flex-direction: row;
  flex-wrap: nowrap;
  min-height: 80px;
  padding: ${ScreenGutter};
`;

const TableCellTitle = styled.Text`
  flex: 1;
  font-weight: bold;
  padding-right: 8px;
  text-align: left;
`;

const TableCellDescription = styled.Text`
  flex: 1;
  padding-left: 8px;
  text-align: right;
`;

interface CardTableData {
  title: React.ReactNode;
  description: React.ReactNode;
}

const LIMITS: CardTableData[] = [
  {
    title: 'Cash Withdrawal (ATM & bank teller)',
    description:
      '$2,000 per withdrawal, 3 withdrawals per day, $25,000 per month',
  },
  {
    title: 'Load Limits',
    description: '$10,000 per day',
  },
  {
    title: 'Spending Limits',
    description: '$10,000 per day',
  },
  {
    title: 'Maximum Balance',
    description: '$25,000',
  },
];

const FEES: CardTableData[] = [
  {
    title: 'Virtual Card Issuance and Replacement',
    description: '$0.00',
  },
  {
    title: 'Physical Card Issuance',
    description: '$10.00',
  },
  {
    title: 'Physical Card Replacement',
    description: '$10.00',
  },
  {
    title: 'Monthly Fee',
    description: '$0.00',
  },
  {
    title:
      'Cash Withdrawal Fee (ATM or Inside Financial Institution) Physical Card Only',
    description: '$2.50',
  },
  {
    title: 'Card Load',
    description: (
      <View>
        <TextAlign align="right">No conversion fee</TextAlign>
        <TextAlign align="right">
          <A href={MINER_FEES_URL}>Network and miner fees may apply</A>
        </TextAlign>
      </View>
    ),
  },
  {
    title: 'International Currency Conversion',
    description: '3%',
  },
  {
    title: 'Inactivity Fee',
    description: '$5 per month after 90 days with no transactions',
  },
];

const CARD_INTRO_TABS = [
  {
    title: 'Limits',
    content: (
      <View>
        {LIMITS.map((row, idx) => {
          return (
            <TableRow key={idx} index={idx}>
              <TableCellTitle>{row.title}</TableCellTitle>
              <TableCellDescription>{row.description}</TableCellDescription>
            </TableRow>
          );
        })}
      </View>
    ),
  },
  {
    title: 'Fees',
    content: (
      <View>
        {FEES.map((row, idx) => {
          return (
            <TableRow key={idx} index={idx}>
              <TableCellTitle>{row.title}</TableCellTitle>
              <TableCellDescription>{row.description}</TableCellDescription>
            </TableRow>
          );
        })}
      </View>
    ),
  },
];

const FeatureTabs = <Tabs tabs={CARD_INTRO_TABS} />;

export default FeatureTabs;
