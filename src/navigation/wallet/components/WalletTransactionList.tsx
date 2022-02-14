import React, {useEffect} from 'react';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {BaseText} from '../../../components/styled/Text';
import {
  getTransactionsHistory,
  UpdateLocalTxHistory,
} from '../../../store/wallet/effects/transactions/transactions';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {useDispatch} from 'react-redux';

const WalletTransactionList = ({
  wallet,
  currentKey: key,
}: {
  wallet: Wallet;
  currentKey: Key;
}) => {
  const dispatch = useDispatch();
  const init = async () => {
    try {
      const uiFormattedTransactionList = (await dispatch<any>(
        getTransactionsHistory({wallet}),
      )) as any;
      // console.log(uiFormattedTransactionList);
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => {
    init();
  }, [wallet]);
  return <BaseText>Transactions list</BaseText>;
};

export default WalletTransactionList;
