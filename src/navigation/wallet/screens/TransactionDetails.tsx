import {BaseText} from '../../../components/styled/Text';
import React, {useEffect} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {useAppDispatch} from '../../../utils/hooks';
import {buildTransactionDetails} from '../../../store/wallet/effects/transactions/transactions';

const TransactionDetails = () => {
  const navigation = useNavigation();
  const {
    params: {transaction, wallet},
  } = useRoute<RouteProp<WalletStackParamList, 'TransactionDetails'>>();

  const dispatch = useAppDispatch();

  const init = async () => {
    try {
      const _transaction = await dispatch(
          buildTransactionDetails({transaction, wallet}),
      );
      console.log(_transaction);
    } catch (e) {
      console.log(e);
    }
  };
  useEffect(() => {
    init();
  }, [transaction]);

  return <BaseText>Txs details coming soon</BaseText>;
};

export default TransactionDetails;
