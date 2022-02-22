import {Wallet} from '../../wallet.models';
import {FormatAmountStr} from '../amount/amount';
import {BwcProvider} from '../../../../lib/bwc';
import uniqBy from 'lodash.uniqby';
import {
  DEFAULT_RBF_SEQ_NUMBER,
  SAFE_CONFIRMATIONS,
} from '../../../../constants/wallet';
import {GetChain, IsUtxoCoin} from '../../utils/currency';
import {ToAddress, ToLtcAddress} from '../address/address';
import {IsDateInCurrentMonth, WithinSameMonth} from '../../utils/time';
import moment from 'moment';

const BWC = BwcProvider.getInstance();

const Errors = BWC.getErrors();

const LIMIT = 15;

// Ratio low amount warning (fee/amount) in incoming TX
const LOW_AMOUNT_RATIO: number = 0.15;

interface TransactionsHistoryInterface {
  limitTx?: string;
  lowAmount?: number;
  force?: boolean;
}

const GetCoinsForTx = (wallet: Wallet, txId: string): Promise<any> => {
  const {
    credentials: {coin, network},
  } = wallet;
  return new Promise((resolve, reject) => {
    wallet.getCoinsForTx(
      {
        coin,
        network,
        txId,
      },
      (err: Error, response: any) => {
        if (err) {
          return reject(err);
        }
        return resolve(response);
      },
    );
  });
};

const ProcessTx = (currencyAbbreviation: string, tx: any) => {
  if (!tx || tx.action === 'invalid') {
    return tx;
  }

  // New transaction output format. Fill tx.amount and tx.toAmount for
  // backward compatibility.
  if (tx.outputs?.length) {
    const outputsNr = tx.outputs.length;

    if (tx.action !== 'received') {
      if (outputsNr > 1) {
        tx.recipientCount = outputsNr;
        tx.hasMultiplesOutputs = true;
      }
      tx.amount = tx.outputs.reduce((total: number, o: any) => {
        o.amountStr = FormatAmountStr(currencyAbbreviation, o.amount);
        //TODO: get Alternative amount str
        // o.alternativeAmountStr = FormatAlternativeStr(o.amount, currencyAbbreviation);
        return total + o.amount;
      }, 0);
    }
    tx.toAddress = tx.outputs[0].toAddress;

    // translate legacy addresses
    if (tx.addressTo && currencyAbbreviation === 'ltc') {
      for (let o of tx.outputs) {
        o.address = o.addressToShow = ToLtcAddress(tx.addressTo);
      }
    }

    if (tx.toAddress) {
      tx.toAddress = ToAddress(tx.toAddress, currencyAbbreviation);
    }
  }

  // Old tx format. Fill .output, for forward compatibility
  if (!tx.outputs) {
    tx.outputs = [
      {
        address: tx.toAddress,
        amount: tx.amount,
      },
    ];
  }

  tx.amountStr = FormatAmountStr(currencyAbbreviation, tx.amount);
  //TODO: alternative amount str
  // tx.alternativeAmountStr = FormatAlternativeStr(tx.amount, currencyAbbreviation);

  const chain = GetChain(currencyAbbreviation).toLowerCase();

  tx.feeStr = tx.fee
    ? FormatAmountStr(chain, tx.fee)
    : tx.fees
    ? FormatAmountStr(chain, tx.fees)
    : 'N/A';

  if (tx.amountStr) {
    tx.amountValueStr = tx.amountStr.split(' ')[0];
    tx.amountUnitStr = tx.amountStr.split(' ')[1];
  }

  if (tx.size && (tx.fee || tx.fees) && tx.amountUnitStr) {
    tx.feeRate = `${((tx.fee || tx.fees) / tx.size).toFixed(0)} sat/byte`;
  }

  if (tx.addressTo) {
    tx.addressTo = ToAddress(tx.addressTo, currencyAbbreviation);
  }

  return tx;
};

const ProcessNewTxs = async (wallet: Wallet, txs: any[]): Promise<any> => {
  const now = Math.floor(Date.now() / 1000);
  const txHistoryUnique: any = {};
  const ret = [];
  const {currencyAbbreviation} = wallet;

  for (let tx of txs) {
    tx = ProcessTx(currencyAbbreviation, tx);

    // no future transactions...
    if (tx.time > now) {
      tx.time = now;
    }

    if (tx.confirmations === 0 && currencyAbbreviation === 'btc') {
      const {inputs} = await GetCoinsForTx(wallet, tx.txid);
      tx.isRBF = inputs.some(
        (input: any) =>
          input.sequenceNumber &&
          input.sequenceNumber < DEFAULT_RBF_SEQ_NUMBER - 1,
      );
      tx.hasUnconfirmedInputs = inputs.some(
        (input: any) => input.mintHeight < 0,
      );
    }

    if (tx.confirmations >= SAFE_CONFIRMATIONS) {
      tx.safeConfirmed = SAFE_CONFIRMATIONS + '+';
    } else {
      tx.safeConfirmed = false;
    }

    if (tx.note) {
      delete tx.note.encryptedEditedByName;
      delete tx.note.encryptedBody;
    }

    if (!txHistoryUnique[tx.txid]) {
      ret.push(tx);
      txHistoryUnique[tx.txid] = true;
    } else {
      console.debug('Ignoring duplicate TX in history: ' + tx.txid);
    }
  }
  return Promise.resolve(ret);
};

// Approx utxo amount, from which the uxto is economically redeemable
const GetLowAmount = (wallet: Wallet): Promise<any> => {
  return new Promise((resolve, reject) => {
    //TODO: Get min fee rates
    resolve(1);
  });
};

const GetNewTransactions = (
  newTxs: any[],
  skip: number,
  wallet: Wallet,
  requestLimit: number,
  lastTransactionId: string | null,
  tries: number = 0,
): Promise<any> => {
  return new Promise((resolve, reject) => {
    GetTransactionHistoryFromServer(
      wallet,
      skip,
      lastTransactionId,
      requestLimit,
    )
      .then(async result => {
        const {transactions, loadMore = false} = result;

        const _transactions = transactions.filter(txs => txs);
        const _newTxs = await ProcessNewTxs(wallet, _transactions);
        newTxs = newTxs.concat(_newTxs);
        skip = skip + requestLimit;

        console.debug(
          `Syncing TXs for: ${wallet.id}. Got: ${newTxs.length} Skip: ${skip} lastTransactionId: ${lastTransactionId} Continue: ${loadMore}`,
        );

        return resolve({
          transactions: newTxs,
          loadMore,
        });
      })
      .catch(err => {
        if (
          err instanceof Errors.CONNECTION_ERROR ||
          (err.message && err.message.match(/5../))
        ) {
          if (tries > 1) {
            return reject(err);
          }

          return setTimeout(() => {
            return resolve(
              GetNewTransactions(
                newTxs,
                skip,
                wallet,
                requestLimit,
                lastTransactionId,
                ++tries,
              ),
            );
          }, 2000 + 3000 * tries);
        } else {
          return reject(err);
        }
      });
  });
};

const UpdateLowAmount = (
  transactions: any[] = [],
  opts: TransactionsHistoryInterface = {},
) => {
  if (!opts.lowAmount) {
    return;
  }

  transactions.forEach(tx => {
    // @ts-ignore
    tx.lowAmount = tx.amount < opts.lowAmount;
  });

  return transactions;
};

export const GetTransactionHistoryFromServer = (
  wallet: Wallet,
  skip: number,
  lastTransactionId: string | null,
  limit: number,
): Promise<{transactions: any[]; loadMore: boolean}> => {
  return new Promise((resolve, reject) => {
    let transactions: any[] = [];
    const result = {
      transactions,
      loadMore: transactions.length >= limit,
    };

    const {token, multisigEthInfo} = wallet.credentials;
    wallet.getTxHistory(
      {
        skip,
        limit,
        tokenAddress: token ? token.address : '',
        multisigContractAddress: multisigEthInfo
          ? multisigEthInfo.multisigContractAddress
          : '',
      },
      (err: Error, _transactions: any) => {
        if (err) {
          return reject(err);
        }

        if (!_transactions?.length) {
          return resolve(result);
        }

        _transactions.some((tx: any) => {
          if (tx.txid !== lastTransactionId) {
            transactions.push(tx);
          }
          return tx.txid === lastTransactionId;
        });

        result.transactions = transactions;
        result.loadMore = transactions.length >= limit;

        return resolve(result);
      },
    );
  });
};

const IsFirstInGroup = (index: number, history: any[]) => {
  if (index === 0) {
    return true;
  }
  const curTx = history[index];
  const prevTx = history[index - 1];
  return !WithinSameMonth(curTx.time * 1000, prevTx.time * 1000);
};

export const GroupTransactionHistory = (history: any[]) => {
  return history
    .reduce((groups, tx, txInd) => {
      IsFirstInGroup(txInd, history)
        ? groups.push([tx])
        : groups[groups.length - 1].push(tx);
      return groups;
    }, [])
    .map((group: any[]) => {
      const time = group[0].time * 1000;
      const title = IsDateInCurrentMonth(time)
        ? 'Recent'
        : moment(time).format('MMMM');
      return {title, data: group};
    });
};

export const GetTransactionHistory = ({
  wallet,
  transactionsHistory = [],
  limit = LIMIT,
  opts = {},
}: {
  wallet: Wallet;
  transactionsHistory: any[];
  limit: number;
  opts?: TransactionsHistoryInterface;
}): Promise<{transactions: any[]; loadMore: boolean}> => {
  return new Promise(async (resolve, reject) => {
    let requestLimit = limit;

    const {walletId, coin} = wallet.credentials;

    if (!walletId || !wallet.isComplete()) {
      return resolve({transactions: [], loadMore: false});
    }

    const lastTransactionId = transactionsHistory[0]
      ? transactionsHistory[0].txid
      : null;
    const skip = transactionsHistory.length;

    try {
      let {transactions, loadMore} = await GetNewTransactions(
        [],
        skip,
        wallet,
        requestLimit,
        lastTransactionId,
      );

      if (IsUtxoCoin(coin)) {
        const _lowAmount = await GetLowAmount(wallet);
        opts.lowAmount = _lowAmount;
        transactions = UpdateLowAmount(transactions, opts);
      }

      const array = transactionsHistory
        .concat(transactions)
        .filter((txs: any) => txs);

      const newHistory = uniqBy(array, x => {
        return (x as any).txid;
      });

      return resolve({transactions: newHistory, loadMore});
    } catch (err) {
      console.log(
        '!! Could not update transaction history for ',
        wallet.id,
        err,
      );
      return reject(err);
    }
  });
};
