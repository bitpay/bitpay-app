import React from 'react';
import moment from 'moment';
import styled from 'styled-components/native';
import {Paragraph} from '../../../../../components/styled/Text';
import {
  Action,
  Slate30,
  SlateDark,
  LightBlack,
  LinkBlue,
} from '../../../../../styles/colors';
import {
  BillPayAccount,
  BillPayment,
} from '../../../../../store/shop/shop.models';

export type BillStatusString =
  | 'dueSoon'
  | 'dueLater'
  | 'complete'
  | 'processing';
interface BillStatusProps {
  account: BillPayAccount;
  payment?: BillPayment;
}
interface BillStatusStyleProps {
  status: BillStatusString;
  darkTheme?: any;
}

const statusFields = {
  dueNow: {
    backgroundColor: '#ffd8de',
    color: '#b51b16',
    text: 'Due in 1 day',
  },
  dueSoon: {
    backgroundColor: '#FEECD4',
    color: '#A05708',
    text: 'Due in 1 day',
  },
  dueLater: {
    backgroundColor: '#ffffff',
    color: SlateDark,
    text: 'Due in 15 days',
    darkTheme: {
      color: Slate30,
      backgroundColor: 'transparent',
    },
  },
  failed: {
    backgroundColor: '#ffd8de',
    color: '#b51b16',
    text: 'Failed',
  },
  canceled: {
    backgroundColor: '#ffd8de',
    color: '#b51b16',
    text: 'Canceled',
  },
  reversed: {
    backgroundColor: '#ffd8de',
    color: '#b51b16',
    text: 'Failed',
  },
  reversalRequired: {
    backgroundColor: '#ffd8de',
    color: '#b51b16',
    text: 'Failed',
  },
  reversalProcessing: {
    backgroundColor: '#ffd8de',
    color: '#b51b16',
    text: 'Failed',
  },
  complete: {
    backgroundColor: '#CBF3E8',
    color: '#0B754A',
    text: 'Completed',
    darkTheme: {
      backgroundColor: '#076A46',
      color: '#4FEFC4',
    },
  },
  sent: {
    backgroundColor: '#CBF3E8',
    color: '#0B754A',
    text: 'Completed',
    darkTheme: {
      backgroundColor: '#076A46',
      color: '#4FEFC4',
    },
  },
  processing: {
    backgroundColor: '#ECEFFD',
    color: Action,
    text: 'Processing',
    darkTheme: {
      backgroundColor: '#071A6A',
      color: LinkBlue,
    },
  },
  pending: {
    backgroundColor: '#ECEFFD',
    color: Action,
    text: 'Processing',
    darkTheme: {
      backgroundColor: '#071A6A',
      color: LinkBlue,
    },
  },
  default: {
    backgroundColor: '#ECEFFD',
    color: Action,
  },
};

const getStatusStyle = (status: string, style: string, isDark: boolean) => {
  const statusObj = statusFields[status] || statusFields.default;
  return isDark && statusObj.darkTheme
    ? statusObj.darkTheme[style]
    : statusObj[style];
};

const StatusContainer = styled.View<BillStatusStyleProps>`
  background-color: ${({status, theme}) =>
      getStatusStyle(status, 'backgroundColor', theme.dark)}
    ${({status, theme}) =>
      status === 'dueLater'
        ? `border: 1px solid ${theme.dark ? LightBlack : Slate30}`
        : ''};
  border-radius: 6px;
  padding: 0 10px;
`;

const StatusText = styled(Paragraph)<BillStatusStyleProps>`
  color: ${({status, theme}) => getStatusStyle(status, 'color', theme.dark)};
  font-size: 14px;
`;

const getBillStatus = (account: BillPayAccount) => {
  const nextPaymentDueDate = account[account.type].paddedNextPaymentDueDate;
  if (!nextPaymentDueDate) {
    return {status: 'dueLater', statusText: 'No payment due'};
  }
  const now = new Date();
  const dueDate = moment(nextPaymentDueDate).utc().toDate();
  const fourDaysFromNow = moment(now).add(5, 'days').toDate();
  const fourteenDaysFromNow = moment(now).add(14, 'days').toDate();
  const dueDateString = moment(dueDate).utc().format('MM/DD/YY');
  const dueStatusString = `Due ${dueDateString}`;
  if (fourDaysFromNow > dueDate) {
    return {status: 'dueNow', statusText: dueStatusString};
  }
  if (fourteenDaysFromNow > dueDate) {
    return {status: 'dueSoon', statusText: dueStatusString};
  }
  return {status: 'dueLater', statusText: dueStatusString};
};

export default ({account, payment}: BillStatusProps) => {
  const paymentStatusStyle =
    payment && statusFields[payment.status]
      ? payment.status || 'processing'
      : 'processing';
  const paymentStatusText = statusFields[payment && payment.status]
    ? statusFields[paymentStatusStyle].text
    : payment?.status || 'Processing';
  const statusStyle = payment
    ? paymentStatusStyle
    : getBillStatus(account).status;
  const statusText = payment
    ? paymentStatusText
    : getBillStatus(account).statusText;
  return (
    <StatusContainer status={statusStyle as BillStatusString}>
      <StatusText status={statusStyle as BillStatusString}>
        {statusText}
      </StatusText>
    </StatusContainer>
  );
};
