import {t} from 'i18next';
import React from 'react';
import styled from 'styled-components/native';
import A from '../../../components/anchor/Anchor';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, TextAlign} from '../../../components/styled/Text';
import Tabs from '../../../components/tabs/Tabs';
import {URL} from '../../../constants';
import {LightBlack, NeutralSlate} from '../../../styles/colors';

interface TableRowProps {
  index?: number;
}

const TableRow = styled.View<TableRowProps>`
  align-items: center;
  background-color: ${({index, theme}) => {
    const stripeColor = theme.dark ? LightBlack : NeutralSlate;

    return (index || 0) % 2 ? 'transparent' : stripeColor;
  }};
  flex-direction: row;
  flex-wrap: nowrap;
  min-height: 80px;
  padding: ${ScreenGutter};
`;

const TableCellTitle = styled(BaseText)`
  flex: 1;
  font-weight: 500;
  padding-right: 8px;
  text-align: left;
`;

const TableCellDescription = styled(BaseText)`
  flex: 1;
  padding-left: 8px;
  text-align: right;
`;

interface CardTableData {
  title: React.ReactNode;
  description: React.ReactNode;
}

const LIMITS = (): CardTableData[] => {
  return [
    {
      title: t('Cash Withdrawal (ATM & bank teller)'),
      description: t(
        '$2,000 per withdrawal, 3 withdrawals per day, $25,000 per month',
      ),
    },
    {
      title: t('Load Limits'),
      description: t('$10,000 per day'),
    },
    {
      title: t('Spending Limits'),
      description: t('$10,000 per day'),
    },
    {
      title: t('Maximum Balance'),
      description: t('$25,000'),
    },
  ];
};

const FEES = (): CardTableData[] => {
  return [
    {
      title: t('Virtual Card Issuance and Replacement'),
      description: t('$0.00'),
    },
    {
      title: t('Physical Card Issuance'),
      description: t('$10.00'),
    },
    {
      title: t('Physical Card Replacement'),
      description: t('$10.00'),
    },
    {
      title: t('Monthly Fee'),
      description: t('$0.00'),
    },
    {
      title: t(
        'Cash Withdrawal Fee (ATM or Inside Financial Institution) Physical Card Only',
      ),
      description: t('$2.50'),
    },
    {
      title: 'Card Load',
      description: (
        <>
          <TextAlign align="right">{t('No conversion fee\n')}</TextAlign>
          <TextAlign align="right">
            <A href={URL.HELP_MINER_FEES}>
              {t('Network and miner fees may apply')}
            </A>
          </TextAlign>
        </>
      ),
    },
    {
      title: t('International Currency Conversion'),
      description: t('3%'),
    },
    {
      title: t('Inactivity Fee'),
      description: t('$5 per month after 90 days with no transactions'),
    },
  ];
};

const CARD_INTRO_TABS = () => {
  return [
    {
      title: t('Limits'),
      content: (
        <>
          {LIMITS().map((row, idx) => {
            return (
              <TableRow key={idx} index={idx}>
                <TableCellTitle>{row.title}</TableCellTitle>
                <TableCellDescription>{row.description}</TableCellDescription>
              </TableRow>
            );
          })}
        </>
      ),
    },
    {
      title: t('Fees'),
      content: (
        <>
          {FEES().map((row, idx) => {
            return (
              <TableRow key={idx} index={idx}>
                <TableCellTitle>{row.title}</TableCellTitle>
                <TableCellDescription>{row.description}</TableCellDescription>
              </TableRow>
            );
          })}
        </>
      ),
    },
  ];
};

const FeatureTabs = <Tabs tabs={CARD_INTRO_TABS} />;

export default FeatureTabs;
