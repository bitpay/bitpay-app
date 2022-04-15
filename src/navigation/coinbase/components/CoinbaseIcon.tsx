import {CoinbaseTransactionProps} from '../../../api/coinbase/coinbase.types';
import {TransactionIcons} from '../../../constants/TransactionIcons';

export const CoinbaseIcon = (coinbaseTx: CoinbaseTransactionProps) => {
  let txIcon;
  switch (coinbaseTx.type) {
    case 'send':
      if (coinbaseTx.from) {
        txIcon = TransactionIcons.received;
      } else {
        txIcon = TransactionIcons.sent;
      }
      break;
    case 'trade':
      txIcon = TransactionIcons.confirming;
      break;
    case 'receive':
      txIcon = TransactionIcons.received;
      break;
    default:
      txIcon = TransactionIcons.coinbase;
  }
  return txIcon;
};

export default CoinbaseIcon;
