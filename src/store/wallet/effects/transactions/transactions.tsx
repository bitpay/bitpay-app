import {Wallet} from '../../wallet.models';
import {FormatAmountStr} from '../amount/amount';
import {BwcProvider} from '../../../../lib/bwc';
import uniqBy from 'lodash.uniqby';
import {IsZceCompatible} from '../../utils/wallet';
import {
  DEFAULT_RBF_SEQ_NUMBER,
  SAFE_CONFIRMATIONS,
  SOFT_CONFIRMATION_LIMIT,
} from '../../../../constants/wallet';
import {GetChain, IsUtxoCoin} from '../../utils/currency';
import {ToCashAddress, ToLtcAddress} from '../send/address';

const BWC = BwcProvider.getInstance();

const Errors = BWC.getErrors();

const FIRST_LIMIT = 5;
const LIMIT = 100;

// Ratio low amount warning (fee/amount) in incoming TX
const LOW_AMOUNT_RATIO: number = 0.15;

interface TransactionsHistoryInterface {
  limitTx?: string;
  lowAmount?: number;
  force?: boolean;
}

const GetStoredTransactionHistory = (wallet: Wallet) => {
  let _transactionHistory: any[] = [];

  const {transactionHistory} = wallet;
  if (!transactionHistory?.length) {
    return _transactionHistory;
  }

  _transactionHistory = transactionHistory.filter(txs => txs);
  return _transactionHistory;
};

const FixTransactionsUnit = (
  currencyAbbreviation: string,
  txs: any[],
): any[] => {
  if (!txs?.length || !txs[0].amountStr) {
    return [];
  }

  const cacheCoin: string = txs[0].amountStr.split(' ')[1];

  if (cacheCoin == 'bits') {
    txs.forEach(tx => {
      tx.amountStr = FormatAmountStr(currencyAbbreviation, tx.amount);
      tx.feeStr = FormatAmountStr(currencyAbbreviation, tx.fees);
    });
  }

  return txs;
};

const RemoveEscrowReclaimTransactions = (wallet: Wallet, txs: any[]): any[] => {
  if (!IsZceCompatible(wallet)) {
    return txs;
  }

  return txs.filter(tx => {
    if (tx.action !== 'moved') {
      return true;
    }
    const sendTxAtSameTimeAsMove = txs.find(
      tx2 => tx2.action === 'sent' && Math.abs(tx.time - tx2.time) < 100,
    );
    return !sendTxAtSameTimeAsMove;
  });
};

const RemoveAndMarkSoftConfirmedTx = (txs: any[]): any[] => {
  return txs.filter((tx: any) => {
    if (tx.confirmations >= SOFT_CONFIRMATION_LIMIT) {
      return tx;
    }
    tx.recent = true;
  });
};

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
      (err, response) => {
        if (err) {
          return reject(err);
        }
        return resolve(response);
      },
    );
  });
};

const ProcessTx = (currencyAbbreviation: string, tx: any) => {
  if (!tx || tx.action == 'invalid') {
    return tx;
  }

  // New transaction output format. Fill tx.amount and tx.toAmount for
  // backward compatibility.
  if (tx.outputs?.length) {
    const outputsNr = tx.outputs.length;

    if (tx.action != 'received') {
      if (outputsNr > 1) {
        tx.recipientCount = outputsNr;
        tx.hasMultiplesOutputs = true;
      }
      tx.amount = tx.outputs.reduce((total, o) => {
        o.amountStr = FormatAmountStr(currencyAbbreviation, o.amount);
        //TODO: get Alternative amount str
        // o.alternativeAmountStr = FormatAlternativeStr(o.amount, currencyAbbreviation);
        return total + o.amount;
      }, 0);
    }
    tx.toAddress = tx.outputs[0].toAddress;

    // translate legacy addresses
    if (tx.addressTo && currencyAbbreviation == 'ltc') {
      for (let o of tx.outputs) {
        o.address = o.addressToShow = ToLtcAddress(tx.addressTo);
      }
    }

    // toDo: translate all tx.outputs[x].toAddress ?
    if (tx.toAddress && currencyAbbreviation == 'bch') {
      tx.toAddress = ToCashAddress(tx.toAddress);
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

  if (tx.addressTo && currencyAbbreviation == 'bch') {
    tx.addressTo = ToCashAddress(tx.addressTo);
  } else if (tx.addressTo && currencyAbbreviation == 'ltc') {
    tx.addressTo = ToLtcAddress(tx.addressTo);
  }

  return tx;
};

const ProcessNewTxs = async (wallet: Wallet, txs: any[]): Promise<any> => {
  const now = Math.floor(Date.now() / 1000);
  const txHistoryUnique = {};
  const ret = [];
  const {currencyAbbreviation} = wallet;
  // TODO: dispatch
  // wallet.hasUnsafeConfirmed = false;

  for (let tx of txs) {
    tx = ProcessTx(currencyAbbreviation, tx);

    // no future transactions...
    if (tx.time > now) {
      tx.time = now;
    }

    if (tx.confirmations === 0 && currencyAbbreviation === 'btc') {
      const {inputs} = await GetCoinsForTx(wallet, tx.txid);
      tx.isRBF = inputs.some((input: any) => {
        return (
          input.sequenceNumber &&
          input.sequenceNumber < DEFAULT_RBF_SEQ_NUMBER - 1
        );
      });
      tx.hasUnconfirmedInputs = inputs.some((input: any) => {
        return input.mintHeight < 0;
      });
    }

    if (tx.confirmations >= SAFE_CONFIRMATIONS) {
      tx.safeConfirmed = SAFE_CONFIRMATIONS + '+';
    } else {
      tx.safeConfirmed = false;
      // TODO: dispatch
      // wallet.hasUnsafeConfirmed = true;
    }

    if (tx.note) {
      delete tx.note.encryptedEditedByName;
      delete tx.note.encryptedBody;
    }

    if (!txHistoryUnique[tx.txid]) {
      ret.push(tx);
      txHistoryUnique[tx.txid] = true;
    } else {
      // this.logger.debug('Ignoring duplicate TX in history: ' + tx.txid);
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

export const UpdateLocalTxHistory = (
  wallet: Wallet,
  opts: TransactionsHistoryInterface = {},
): Promise<any> => {
  return new Promise((resolve, reject) => {
    opts = opts || {};
    let requestLimit = FIRST_LIMIT;
    const {walletId, coin} = wallet.credentials;
    // WalletProvider.progressFn[walletId] = progressFn || (() => {});
    let foundLimitTx: any = [];

    // if (WalletProvider.historyUpdateOnProgress[wallet.id]) {
    //     this.logger.debug(
    //         '!! History update already on progress for: ' + wallet.id
    //     );
    //
    //     if (progressFn) {
    //         WalletProvider.progressFn[walletId] = progressFn;
    //     }
    //     return reject('HISTORY_IN_PROGRESS'); // no callback call yet.
    // }
    //
    // this.logger.debug(
    //     'Updating Transaction History for ' + wallet.credentials.walletName
    // );

    // WalletProvider.historyUpdateOnProgress[wallet.id] = true;
    let storedTransactionHistory: any[] = GetStoredTransactionHistory(wallet);
    storedTransactionHistory = FixTransactionsUnit(
      coin,
      storedTransactionHistory,
    );
    const nonEscrowReclaimTxs = RemoveEscrowReclaimTransactions(
      wallet,
      storedTransactionHistory,
    );
    const confirmedTxs = RemoveAndMarkSoftConfirmedTx(nonEscrowReclaimTxs);
    const lastTransactionId = confirmedTxs[0] ? confirmedTxs[0].txid : null;
    const lastTransactionTime = confirmedTxs[0] ? confirmedTxs[0].time : null;

    // TODO: dispatch store txs history
    // (nonEscrowReclaimTxs)

    const GetNewTransactions = (
      newTxs: any[],
      skip: number,
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
            const {res, loadMore = false} = result;

            const _res = res.filter(txs => txs);
            const _newTxs = await ProcessNewTxs(wallet, _res);
            newTxs = newTxs.concat(_newTxs);
            // WalletProvider.progressFn[walletId](
            //     newTxs.concat(txsFromLocal),
            //     newTxs.length
            // );
            skip = skip + requestLimit;
            // this.logger.debug(
            //     'Syncing TXs for:' +
            //     walletId +
            //     '. Got:' +
            //     newTxs.length +
            //     ' Skip:' +
            //     skip,
            //     ' EndingTxid:',
            //     endingTxid,
            //     ' Continue:',
            //     shouldContinue
            // );

            // TODO Dirty <HACK>
            // do not sync all history, just looking for a single TX.
            // if (opts.limitTx) {
            //     foundLimitTx = _.find(newTxs.concat(txsFromLocal), {
            //         txid: opts.limitTx as any
            //     });
            //     if (!_.isEmpty(foundLimitTx)) {
            //         this.logger.debug('Found limitTX: ' + opts.limitTx);
            //         return resolve([foundLimitTx]);
            //     }
            // }
            // </HACK>
            if (!loadMore) {
              // this.logger.debug(
              //     'Finished Sync: New / soft confirmed Txs: ' +
              //     newTxs.length
              // );
              return resolve(newTxs);
            }

            requestLimit = LIMIT;
            return GetNewTransactions(newTxs, skip).then(txs => {
              resolve(txs);
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
                return resolve(GetNewTransactions(newTxs, skip, ++tries));
              }, 2000 + 3000 * tries);
            } else {
              return reject(err);
            }
          });
      });
    };

    GetNewTransactions([], 0)
      .then(txs => {
        const array = txs.concat(confirmedTxs).filter(txs => txs);
        const newHistory = uniqBy(array, x => {
          return (x as any).txid;
        });

        const updateNotes = (): Promise<any> => {
          return new Promise((res, rej) => {
            if (!lastTransactionTime) {
              return res();
            }

            // this.logger.debug('Syncing notes from: ' + endingTs);
            wallet.getTxNotes(
              {
                minTs: lastTransactionTime,
              },
              (err, notes) => {
                if (err) {
                  // this.logger.warn('Could not get TxNotes: ', err);
                  return rej(err);
                }
                notes.forEach(notes, note => {
                  // this.logger.debug('Note for ' + note.txid);
                  newHistory.forEach(newHistory, (tx: any) => {
                    if (tx.txid == note.txid) {
                      // this.logger.debug(
                      //  '...updating note for ' + note.txid
                      // );
                      tx.note = note;
                    }
                  });
                });
                return res();
              },
            );
          });
        };

        const updateLowAmount = txs => {
          if (!opts.lowAmount) {
            return;
          }

          txs.forEach(tx => {
            tx.lowAmount = tx.amount < opts.lowAmount;
          });
        };

        if (IsUtxoCoin(coin)) {
          GetLowAmount(wallet).then(fee => {
            opts.lowAmount = fee;
            updateLowAmount(txs);
          });
        }

        updateNotes()
          .then(() => {
            // <HACK>
            if (!foundLimitTx.length) {
              // this.logger.debug(
              //     'Tx history read until limitTx: ' + opts.limitTx
              // );
              return resolve(newHistory);
            }
            // </HACK>

            const historyToSave = JSON.stringify(newHistory);
            txs.forEach(tx => {
              tx.recent = true;
            });
            // Final update
            if (walletId == wallet.credentials.walletId) {
              // TODO: dispatch store txs history
              // (nonEscrowReclaimTxs)
              const nonEscrowReclaimTxsStatus = RemoveEscrowReclaimTransactions(
                wallet,
                newHistory,
              );
            }

            // TOSD: dispatch to store history
            resolve(historyToSave);
          })
          .catch(err => {
            return reject(err);
          });
      })
      .catch(err => {
        return reject(err);
      });
  });
};

export const GetTransactionHistoryFromServer = (
  wallet: Wallet,
  skip: number,
  lastTransactionId: string | null,
  limit: number,
): Promise<{res: any[]; loadMore: boolean}> => {
  return new Promise((resolve, reject) => {
    let res: any[] = [];

    const result = {
      res,
      loadMore: res.length >= limit,
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
      (err: Error, txsFromServer: any) => {
        if (err) {
          return reject(err);
        }

        if (!txsFromServer?.length) {
          resolve(result);
        }

        txsFromServer.some((tx: any) => {
          if (tx.txid !== lastTransactionId) {
            res.push(tx);
          }
          return tx.txid === lastTransactionId;
        });

        result.res = res;

        result.loadMore = res.length >= limit;

        return resolve(result);
      },
    );
  });
};
