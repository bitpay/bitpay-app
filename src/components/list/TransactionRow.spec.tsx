import React from 'react';
import {fireEvent, render} from '@test/render';
import TransactionRow from './TransactionRow';

describe('TransactionRow', () => {
  it('passes the transaction to a stable press handler', () => {
    const transaction = {txid: 'tx-1'};
    const onPressTransaction = jest.fn();
    const {getByTestId} = render(
      <TransactionRow
        testID="transaction-row"
        description="Transaction one"
        transaction={transaction}
        onPressTransaction={onPressTransaction}
      />,
    );

    fireEvent.press(getByTestId('transaction-row'));

    expect(onPressTransaction).toHaveBeenCalledWith(transaction);
  });

  it('preserves callers which do not pass a transaction payload', () => {
    const onPressTransaction = jest.fn();
    const {getByTestId} = render(
      <TransactionRow
        testID="legacy-transaction-row"
        description="Legacy transaction"
        onPressTransaction={onPressTransaction}
      />,
    );

    fireEvent.press(getByTestId('legacy-transaction-row'));

    expect(onPressTransaction).toHaveBeenCalledWith(undefined);
  });
});
