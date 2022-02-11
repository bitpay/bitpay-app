import React, {useEffect} from 'react';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {BaseText} from '../../../components/styled/Text';
import {UpdateLocalTxHistory} from '../../../store/wallet/effects/transactions/transactions';

const WalletTransactionList = ({
  wallet,
  currentKey: key,
}: {
  wallet: Wallet;
  currentKey: Key;
}) => {
  const init = async () => {
    try {
      const uiFormattedTransactionList = await UpdateLocalTxHistory(wallet);
      console.log(uiFormattedTransactionList);
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
