import {
  Wallet,
  TransactionProposal,
  Utxo,
  TransactionDetailsBuilt,
} from '../../wallet.models';
import {HistoricRate, Rates} from '../../../rate/rate.models';
import {FormatAmountStr} from '../amount/amount';
import {BwcProvider} from '../../../../lib/bwc';
import uniqBy from 'lodash.uniqby';
import {SAFE_CONFIRMATIONS} from '../../../../constants/wallet';
import {
  IsCustomERCToken,
  IsERCToken,
  IsSVMChain,
  IsUtxoChain,
} from '../../utils/currency';
import {ToAddress, ToLtcAddress} from '../address/address';
import {
  IsDateInCurrentMonth,
  WithinPastDay,
  WithinSameMonth,
  WithinSameMonthTimestamp,
} from '../../utils/time';
import moment, {MomentInput} from 'moment';
import 'moment/min/locales';
import i18n from 'i18next';
import {Effect} from '../../../index';
import {getHistoricFiatRate, startGetRates} from '../rates/rates';
import {toFiat} from '../../utils/wallet';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import {GetMinFee} from '../fee/fee';
import {
  updateAccountTxHistory,
  updateWalletTxHistory,
} from '../../wallet.actions';
import {BWCErrorMessage} from '../../../../constants/BWCError';
import {t} from 'i18next';
import {LogActions} from '../../../log';
import {partition} from 'lodash';
import {
  BitpaySupportedCoins,
  SUPPORTED_VM_TOKENS,
} from '../../../../constants/currencies';
import {BitpaySupportedTokenOptsByAddress} from '../../../../constants/tokens';

const BWC = BwcProvider.getInstance();
const Errors = BWC.getErrors();

export const TX_HISTORY_LIMIT = 25;
export const BWS_TX_HISTORY_LIMIT = 1001;

const GetCoinsForTx = (wallet: Wallet, txId: string): Promise<any> => {
  const {currencyAbbreviation, network} = wallet;
  return new Promise((resolve, reject) => {
    wallet.getCoinsForTx(
      {
        coin: currencyAbbreviation,
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

export const RemoveTxProposal = (wallet: Wallet, txp: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    wallet.removeTxProposal(txp, (err: Error) => {
      if (err) {
        return reject(BWCErrorMessage(err));
      }
      return resolve();
    });
  });
};

export const RejectTxProposal = (wallet: Wallet, txp: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    wallet.rejectTxProposal(txp, null, (err: Error, rejectedTxp: any) => {
      if (err) {
        return reject(BWCErrorMessage(err));
      }
      return resolve(rejectedTxp);
    });
  });
};

export const ProcessPendingTxps =
  (txps: TransactionProposal[], wallet: any): Effect<any> =>
  dispatch => {
    const now = Math.floor(Date.now() / 1000);
    const {
      currencyAbbreviation,
      chain,
      tokenAddress,
      credentials: {walletId, copayerId},
    } = wallet;

    const ret: TransactionProposal[] = [];
    txps.forEach((tx: TransactionProposal) => {
      try {
        if (wallet.id !== tx.walletId) {
          return;
        }

        // Workaround for txps with matic as coin
        if (tx.coin === 'matic') {
          tx.coin = 'pol';
        }
        tx = dispatch(ProcessTx(tx, wallet));

        // no future transactions...
        if (tx.createdOn > now) {
          tx.createdOn = now;
        }

        tx.copayerId = copayerId;
        tx.walletId = walletId;

        const action: any = tx.actions.find(
          (a: any) => a.copayerId === copayerId,
        );

        if ((!action || action.type === 'failed') && tx.status === 'pending') {
          tx.pendingForUs = true;
        }

        if (action && action.type === 'accept') {
          tx.statusForUs = 'accepted';
        } else if (action && action.type === 'reject') {
          tx.statusForUs = 'rejected';
        } else {
          tx.statusForUs = 'pending';
        }

        if (!tx.deleteLockTime) {
          tx.canBeRemoved = true;
        }
        ret.push(tx);
      } catch (e) {
        const error = e instanceof Error ? e.message : JSON.stringify(e);
        dispatch(
          LogActions.error(
            `The transaction proposal could not be processed correctly ${tx.id}: ${error}`,
          ),
        );
      }
    });
    return BuildUiFriendlyList(
      ret,
      currencyAbbreviation,
      chain,
      [],
      tokenAddress,
      walletId,
    );
  };

const ProcessTx =
  (tx: TransactionProposal, wallet: Wallet): Effect<TransactionProposal> =>
  (dispatch, getState) => {
    if (!tx || tx.action === 'invalid') {
      return tx;
    }

    const {tokenOptionsByAddress, customTokenOptionsByAddress} =
      getState().WALLET;
    const tokensOptsByAddress = {
      ...BitpaySupportedTokenOptsByAddress,
      ...tokenOptionsByAddress,
      ...customTokenOptionsByAddress,
    };

    const {chain, coin, tokenAddress: txpContractAddress} = tx;
    let {tokenAddress} = wallet;
    // Only for payouts/refunds. For this case chain and coin have the same value.
    // Therefore, to identify an ERC20 token payout it is necessary to check if exist the tokenAddress field
    let tokenSymbol: string | undefined;

    if (txpContractAddress) {
      const matchedToken = Object.values(tokensOptsByAddress).find(
        ({address}) => {
          if (IsSVMChain(chain)) {
            return txpContractAddress === address;
          }
          return txpContractAddress?.toLowerCase() === address?.toLowerCase();
        },
      );

      if (matchedToken?.symbol) {
        tokenSymbol = matchedToken.symbol.toLowerCase();
        tokenAddress = txpContractAddress;
      }
    }

    // New transaction output format. Fill tx.amount and tx.toAmount for
    // backward compatibility.
    if (tx.outputs?.length) {
      // ThorSwap has OP_RETURN output in the first position with addressTo = 'false'.
      tx.outputs = tx.outputs.filter(o => o.address !== 'false');
      tx.addressTo = tx.outputs[0].address!;

      const outputsNr = tx.outputs.length;

      if (tx.action !== 'received') {
        if (outputsNr > 1) {
          tx.recipientCount = outputsNr;
          tx.hasMultiplesOutputs = true;
        }
        tx.amount = tx.outputs.reduce((total: number, o: any) => {
          o.amountStr = dispatch(
            FormatAmountStr(
              tokenSymbol || coin,
              chain,
              tokenAddress,
              Number(o.amount),
            ),
          );
          return total + Number(o.amount);
        }, 0);
      }
      tx.toAddress = tx.outputs[0].toAddress!;

      // translate legacy addresses
      if (tx.addressTo && coin === 'ltc') {
        for (let o of tx.outputs) {
          o.address = o.addressToShow = ToLtcAddress(tx.addressTo);
        }
      }

      if (tx.toAddress) {
        tx.toAddress = ToAddress(tx.toAddress, coin);
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

    // New data structure for ERC20 token transactions
    if (tx.effects?.[0] && IsERCToken(tx.coin, tx.chain)) {
      tx.amount = tx.effects.reduce(
        (total, {amount}) => total + Number(amount),
        0,
      );
      tokenAddress = tx.effects[0].contractAddress?.toLowerCase();
    }

    if (tx.coin === wallet.currencyAbbreviation) {
      tx.amountStr = dispatch(
        FormatAmountStr(tokenSymbol || coin, chain, tokenAddress, tx.amount),
      );
    }

    tx.feeStr =
      tx.receipt?.gasUsed &&
      tx.receipt?.gasUsed > 0 &&
      tx.receipt?.effectiveGasPrice &&
      tx.receipt?.effectiveGasPrice > 0
        ? // @ts-ignore
          dispatch(
            FormatAmountStr(
              BitpaySupportedCoins[chain]?.feeCurrency,
              chain,
              undefined,
              tx.receipt?.gasUsed * tx.receipt?.effectiveGasPrice,
            ),
          )
        : tx.fee !== undefined && tx.fee !== null
        ? // @ts-ignore
          dispatch(
            FormatAmountStr(
              BitpaySupportedCoins[chain]?.feeCurrency,
              chain,
              undefined,
              tx.fee,
            ),
          )
        : tx.fees !== undefined && tx.fees !== null
        ? // @ts-ignore
          dispatch(
            FormatAmountStr(
              BitpaySupportedCoins[chain]?.feeCurrency,
              chain,
              undefined,
              tx.fees,
            ),
          )
        : 'N/A';

    if (tx.amountStr) {
      tx.amountValueStr = tx.amountStr.split(' ')[0];
      tx.amountUnitStr = tx.amountStr.split(' ')[1];
    }

    if (tx.size && (tx.fee || tx.fees) && tx.amountUnitStr) {
      tx.feeRate = `${((tx.fee || tx.fees) / tx.size).toFixed(0)} sat/byte`;
    }

    if (tx.addressTo) {
      tx.addressTo = ToAddress(tx.addressTo, coin);
    }

    return tx;
  };

const shouldFilterTx = (tx: any, wallet: Wallet) => {
  const isERCToken = IsERCToken(tx.coin, tx.chain);
  const emptyEffects = Array.isArray(tx.effects) && tx.effects.length === 0;
  const hasEffects = Array.isArray(tx.effects) && tx.effects.length > 0;
  const isReceived = tx.action === 'received';

  // Workaround for handling old txs with no effects
  if (isERCToken && emptyEffects) {
    return false;
  }

  // Filter if contract doesn't match the wallet token address
  if (isERCToken && hasEffects) {
    tx.effects = tx.effects.filter((effect: any) => {
      const isMatchingContract =
        effect.contractAddress?.toLowerCase() ===
        wallet.tokenAddress?.toLowerCase();
      const isMatchingRecipient =
        !isReceived || effect.to === wallet.receiveAddress;
      return isMatchingContract && isMatchingRecipient;
    });
    if (tx.effects.length === 0) {
      return true;
    }
  }

  // Filter received txs with effects for non ERC20 wallets
  if (!isERCToken && hasEffects && tx.action === 'received') {
    return true;
  }

  return false;
};

const ProcessNewTxs =
  (wallet: Wallet, txs: any[]): Effect<Promise<any>> =>
  async dispatch => {
    const now = Math.floor(Date.now() / 1000);
    const txHistoryUnique: any = {};
    const ret = [];
    const {currencyAbbreviation} = wallet;

    for (let tx of txs) {
      try {
        // workaround for BWS bug / coin is missing and chain is in uppercase
        tx.coin = wallet.currencyAbbreviation;
        tx.chain = wallet.chain;

        if (shouldFilterTx(tx, wallet)) {
          continue;
        }

        tx = dispatch(ProcessTx(tx, wallet));

        // no future transactions...
        if (tx.time > now) {
          tx.time = now;
        }

        if (tx.confirmations === 0 && currencyAbbreviation === 'btc') {
          const {inputs} = await GetCoinsForTx(wallet, tx.txid);
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

        if (!txHistoryUnique[`${tx.txid}-${tx.coin}`]) {
          ret.push(tx);
          txHistoryUnique[`${tx.txid}-${tx.coin}`] = true;
        } else {
          dispatch(
            LogActions.info(
              `Ignoring duplicate TX in history: ${tx.txid}-${tx.coin}`,
            ),
          );
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : JSON.stringify(e);
        dispatch(
          LogActions.error(
            `The transaction could not be processed correctly ${tx.txid}: ${error}`,
          ),
        );
        continue;
      }
    }
    return Promise.resolve(ret);
  };

const GetNewTransactions =
  (
    newTxs: any[],
    skip: number,
    wallet: Wallet,
    requestLimit: number,
    lastTransactionId: string | null,
    tries: number = 0,
  ): Effect<Promise<any>> =>
  dispatch => {
    return new Promise((resolve, reject) => {
      GetTransactionHistoryFromServer(
        wallet,
        skip,
        lastTransactionId,
        requestLimit,
      )
        .then(async result => {
          const {transactions, loadMore = false} = result;

          let _transactions = transactions.filter(txs => txs);
          const _newTxs = await dispatch(ProcessNewTxs(wallet, _transactions));
          newTxs = newTxs.concat(_newTxs);

          dispatch(
            LogActions.info(
              `Merging TXs for: ${wallet.id}. Got: ${newTxs.length} Skip: ${skip} lastTransactionId: ${lastTransactionId} Load more: ${loadMore}`,
            ),
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
                dispatch(
                  GetNewTransactions(
                    newTxs,
                    skip,
                    wallet,
                    requestLimit,
                    lastTransactionId,
                    ++tries,
                  ),
                ),
              );
            }, 2000 + 3000 * tries);
          } else {
            return reject(err);
          }
        });
    });
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

const IsFirstInCoinbaseGroup = (index: number, history: any[]) => {
  if (index === 0) {
    return true;
  }
  const curTx = history[index];
  const prevTx = history[index - 1];
  return !WithinSameMonthTimestamp(curTx.created_at, prevTx.created_at);
};

const getMonthName = (time: MomentInput): String => {
  let month = '';
  try {
    month = moment(time).locale(i18n.language).format('MMMM');
  } catch (e) {
    // Fallback to default locale if the language is not supported
    const error = e instanceof Error ? e.message : JSON.stringify(e);
    LogActions.warn('Error formatting date:', error);
    month = moment(time).format('MMMM');
  }
  return month;
};

export const GroupCoinbaseTransactions = (txs: any[]) => {
  const [_pendingTransactions, _confirmedTransactions] = partition(txs, t => {
    return t.status === 'pending';
  });
  const pendingTransactionsGroup =
    _pendingTransactions.length > 0
      ? [
          {
            title: t('Pending Transactions'),
            data: _pendingTransactions,
          },
        ]
      : [];
  const confirmedTransactionsGroup = _confirmedTransactions
    .reduce((groups, tx, txInd) => {
      IsFirstInCoinbaseGroup(txInd, _confirmedTransactions)
        ? groups.push([tx])
        : groups[groups.length - 1].push(tx);
      return groups;
    }, [])
    .map((group: any[]) => {
      const time = Date.parse(group[0].created_at);
      const month = getMonthName(time);
      const title = IsDateInCurrentMonth(time) ? t('Recent') : month;
      return {title, data: group};
    });
  return pendingTransactionsGroup.concat(confirmedTransactionsGroup);
};

export const GroupTransactionHistory = (history: any[]) => {
  // workaround to show pending transactions first even if it was broadcasted earlier that the confirmed ones
  const [_pendingTransactions, _confirmedTransactions] = partition(
    history.sort((x, y) => y.time - x.time),
    t => {
      return t.confirmations === 0;
    },
  );
  const pendingTransactionsGroup =
    _pendingTransactions.length > 0
      ? [
          {
            title: t('Pending Transactions'),
            data: _pendingTransactions,
            time: Date.now(),
          },
        ]
      : [];
  const confirmedTransactionsGroup = _confirmedTransactions
    .reduce((groups, tx, txInd) => {
      IsFirstInGroup(txInd, _confirmedTransactions)
        ? groups.push([tx])
        : groups[groups.length - 1].push(tx);
      return groups;
    }, [])
    .map((group: any[]) => {
      const time = group[0].time * 1000;
      const month = getMonthName(time);
      const title = IsDateInCurrentMonth(time) ? t('Recent') : month;
      return {title, data: group, time};
    });
  return pendingTransactionsGroup.concat(confirmedTransactionsGroup);
};

export const GetAccountTransactionHistory =
  ({
    wallets,
    accountTransactionsHistory = {},
    keyId,
    limit = TX_HISTORY_LIMIT,
    refresh = false,
    contactList = [],
    selectedChainFilterOption,
  }: {
    wallets: Wallet[];
    accountTransactionsHistory: {
      [key: string]: {
        transactions: any[];
        loadMore: boolean;
        hasConfirmingTxs: boolean;
      };
    };
    keyId: string;
    limit: number;
    refresh?: boolean;
    contactList?: any[];
    selectedChainFilterOption?: string;
  }): Effect<
    Promise<{
      accountTransactionsHistory: {
        [key: string]: {
          transactions: any[];
          loadMore: boolean;
          hasConfirmingTxs: boolean;
        };
      };
      sortedCompleteHistory: any[];
    }>
  > =>
  async (
    dispatch,
    getState,
  ): Promise<{
    accountTransactionsHistory: {
      [key: string]: {
        transactions: any[];
        loadMore: boolean;
        hasConfirmingTxs: boolean;
      };
    };
    sortedCompleteHistory: any[];
  }> => {
    return new Promise(async (resolve, reject) => {
      let allTransactions = [] as any[];
      const transactionPromises = wallets.map(async wallet => {
        try {
          const transactionHistory = await dispatch(
            GetTransactionHistory({
              wallet,
              transactionsHistory:
                accountTransactionsHistory[wallet.id]?.transactions ?? [],
              limit,
              contactList,
              refresh,
              isAccountDetailsView: true,
            }),
          );
          accountTransactionsHistory[wallet.id] = transactionHistory;
          return transactionHistory.transactions;
        } catch (error) {
          dispatch(
            LogActions.error(
              `!! Could not update transaction history for ${wallet.id}: ${error}`,
            ),
          );
          return [];
        }
      });
      const results = await Promise.all(transactionPromises);

      // filter transactions by txid, but prioritize the one that isERC20 when is not Received
      let transactionsWithoutRepeated = results
        .flat()
        .reduce((acc, transaction) => {
          const existingTransaction = acc.find(
            t => t.txid === transaction.txid,
          );

          if (!existingTransaction || IsReceived(transaction.action)) {
            acc.push(transaction);
          } else if (IsERCToken(transaction.coin, transaction.chain)) {
            const index = acc.findIndex(t => t.txid === transaction.txid);
            acc[index] = transaction;
          }

          return acc;
        }, []);

      if (selectedChainFilterOption) {
        transactionsWithoutRepeated = transactionsWithoutRepeated.filter(tx => {
          return tx.chain === selectedChainFilterOption;
        });
      }

      allTransactions = transactionsWithoutRepeated.sort(
        (a, b) =>
          new Date(b.time || b.createdOn).getTime() -
          new Date(a.time || a.createdOn).getTime(),
      );

      const sortedCompleteHistory = allTransactions.slice(0, limit);

      dispatch(
        updateAccountTxHistory({
          keyId: keyId,
          accountTransactionsHistory,
        }),
      );
      return resolve({
        accountTransactionsHistory,
        sortedCompleteHistory,
      });
    });
  };

export const GetTransactionHistory =
  ({
    wallet,
    transactionsHistory = [],
    limit = TX_HISTORY_LIMIT,
    refresh = false,
    contactList = [],
    isAccountDetailsView = false,
  }: {
    wallet: Wallet;
    transactionsHistory: any[];
    limit: number;
    refresh?: boolean;
    contactList?: any[];
    isAccountDetailsView?: boolean;
  }): Effect<
    Promise<{transactions: any[]; loadMore: boolean; hasConfirmingTxs: boolean}>
  > =>
  async (
    dispatch,
    getState,
  ): Promise<{
    transactions: any[];
    loadMore: boolean;
    hasConfirmingTxs: boolean;
  }> => {
    return new Promise(async (resolve, reject) => {
      let requestLimit = limit;

      let {
        currencyAbbreviation,
        chain,
        tokenAddress,
        credentials: {walletId, keyId},
        transactionHistory,
      } = wallet;

      if (!keyId) {
        keyId = keyId;
      }
      if (!walletId || !wallet.isComplete()) {
        return resolve({
          transactions: [],
          loadMore: false,
          hasConfirmingTxs: false,
        });
      }

      const lastTransactionId = refresh
        ? null
        : transactionsHistory[0]
        ? transactionsHistory[0].txid
        : null;
      const skip = refresh ? 0 : transactionsHistory.length;

      if (transactionHistory?.transactions?.length && !refresh && !skip) {
        return resolve(transactionHistory);
      }

      try {
        let {transactions, loadMore} = await dispatch(
          GetNewTransactions([], skip, wallet, requestLimit, lastTransactionId),
        );

        // To get transaction list details: icon, description, amount and date
        transactions = BuildUiFriendlyList(
          transactions,
          currencyAbbreviation,
          chain,
          contactList,
          tokenAddress,
          walletId,
          isAccountDetailsView,
        );

        const array = transactions
          .concat(transactionsHistory)
          .filter((txs: any) => txs);

        const newHistory = uniqBy(array, x => {
          return (x as any).txid;
        });

        let hasConfirmingTxs: boolean = false;
        if (!skip) {
          let transactionHistory;
          // linked eth wallet could have pendings txs from different tokens
          // this means we need to check pending txs from the linked wallet if is ERC20Token instead of the sending wallet
          const {WALLET} = getState();
          const key = WALLET.keys[keyId];
          if (IsERCToken(currencyAbbreviation, chain) && key) {
            const linkedWallet = key.wallets.find(({tokens}) =>
              tokens?.includes(walletId),
            );
            transactionHistory = linkedWallet?.transactionHistory?.transactions;
          } else {
            transactionHistory = newHistory;
          }

          // look for sent or moved unconfirmed until find a confirmed
          if (transactionHistory && transactionHistory[0]) {
            for (let tx of transactionHistory) {
              if (tx.action === 'sent' || tx.action === 'moved') {
                if (tx.confirmations === 0) {
                  hasConfirmingTxs = true;
                } else {
                  break;
                }
              }
            }
          }
          if (!isAccountDetailsView) {
            dispatch(
              updateWalletTxHistory({
                walletId: walletId,
                keyId: keyId,
                transactionHistory: {
                  transactions: newHistory.slice(0, TX_HISTORY_LIMIT),
                  loadMore,
                  hasConfirmingTxs,
                },
              }),
            );
          }
        }
        return resolve({transactions: newHistory, loadMore, hasConfirmingTxs});
      } catch (err) {
        const errString =
          err instanceof Error ? err.message : JSON.stringify(err);

        dispatch(
          LogActions.error(
            `!! Could not update transaction history for
          ${wallet.id}: ${errString}`,
          ),
        );
        return reject(err);
      }
    });
  };

//////////////////////// Edit Transaction Note ///////////////////////////

export interface NoteArgs {
  txid: string;
  body: string;
}

export const EditTxNote = (wallet: Wallet, args: NoteArgs): Promise<any> => {
  return new Promise((resolve, reject) => {
    wallet.editTxNote(args, (err: Error, res: any) => {
      if (err) {
        return reject(err);
      }
      return resolve(res);
    });
  });
};

/////////////////////// Transaction Helper Methods /////////////////////////////////////

export const GetContactName = (
  address: string | undefined,
  tokenAddress: string | undefined,
  chain: string,
  contactList: any[] = [],
) => {
  if (!address || !contactList.length) {
    return null;
  }
  const existsContact = contactList.find(
    contact =>
      contact.address === address &&
      contact.chain === chain?.toLowerCase() &&
      (!contact.tokenAddress || contact.tokenAddress === tokenAddress),
  );
  if (existsContact) {
    return existsContact.name;
  }
  return null;
};

const getFormattedDate = (time: number): string => {
  return WithinPastDay(time)
    ? moment(time).fromNow()
    : moment(time).format('MMM D, YYYY');
};

export const IsSent = (action: string | undefined): boolean => {
  return action === 'sent';
};

export const IsMoved = (action: string | undefined): boolean => {
  return action === 'moved';
};

export const IsReceived = (action: string | undefined): boolean => {
  return action === 'received';
};

export const IsInvalid = (action: string | undefined): boolean => {
  return action === 'invalid';
};

export const IsZeroAmountEVM = (amount: number, chain: string): boolean => {
  return amount === 0 && SUPPORTED_VM_TOKENS.includes(chain);
};

export const TxForPaymentFeeEVM = (
  walletCoin: string,
  txCoin: string,
  txChain: string,
  amount: number,
): boolean => {
  return (
    walletCoin.toLowerCase() !== txCoin.toLowerCase() ||
    IsZeroAmountEVM(amount, txChain.toLowerCase())
  );
};

export const IsShared = (wallet: Wallet): boolean => {
  const {credentials} = wallet;
  return credentials.n > 1;
};

export const IsMultisigEthInfo = (wallet: Wallet): boolean => {
  const {credentials} = wallet;
  return !!credentials.multisigEthInfo;
};

/////////////////////// Transaction List /////////////////////////////////////

export const BuildUiFriendlyList = (
  transactionList: any[] = [],
  currencyAbbreviation: string,
  chain: string,
  contactList: any[] = [],
  tokenAddress: string | undefined,
  walletId: string,
  isAccountDetailsView?: boolean,
): any[] => {
  return transactionList.map(transaction => {
    const {
      confirmations,
      error,
      customData,
      action,
      time,
      createdOn,
      coin,
      amount,
      amountStr,
      feeStr,
      outputs,
      note,
      message,
      creatorName,
      recipientCount,
    } = transaction || {};
    const {
      service: customDataService,
      toWalletName,
      billPayMerchantIds,
      giftCardName,
    } = customData || {};
    const {body: noteBody} = note || {};

    const isSent = IsSent(action);
    const isMoved = IsMoved(action);
    const isReceived = IsReceived(action);
    const isInvalid = IsInvalid(action);

    const isTxForPaymentFee =
      !isReceived &&
      TxForPaymentFeeEVM(currencyAbbreviation, coin, chain, amount);
    let contactName;
    if (
      (isSent || isMoved) &&
      contactList?.length &&
      outputs?.length &&
      chain &&
      GetContactName(outputs[0]?.address, tokenAddress, chain, contactList)
    ) {
      contactName = GetContactName(
        outputs[0]?.address,
        tokenAddress,
        chain,
        contactList,
      );
    }

    if (!confirmations || confirmations <= 0) {
      transaction.uiIcon = 'confirming';

      if (!isTxForPaymentFee) {
        if (contactName || transaction.customData?.recipientEmail) {
          if (isSent || isMoved) {
            transaction.uiDescription =
              contactName || transaction.customData?.recipientEmail;
          }
        } else {
          if (isSent) {
            transaction.uiDescription =
              t('Sending') +
              (isAccountDetailsView
                ? ` ${currencyAbbreviation?.toUpperCase()}`
                : '');
          }

          if (isMoved) {
            transaction.uiDescription =
              t('Moving') +
              (isAccountDetailsView
                ? ` ${currencyAbbreviation?.toUpperCase()}`
                : '');
          }
        }

        if (isReceived) {
          transaction.uiDescription =
            t('Receiving') +
            (isAccountDetailsView
              ? ` ${currencyAbbreviation?.toUpperCase()}`
              : '');
        }
      }
    }

    if (confirmations > 0) {
      if (isSent) {
        if (
          (currencyAbbreviation === 'eth' ||
            IsCustomERCToken(tokenAddress, chain)) &&
          error
        ) {
          transaction.uiIcon = 'error';
        } else {
          transaction.uiIcon = ['billpay', 'giftcards'].includes(
            customDataService,
          )
            ? 'shop'
            : customDataService || 'sent';
          transaction.uiIconURI =
            (billPayMerchantIds &&
              billPayMerchantIds.length === 1 &&
              billPayMerchantIds[0]) ||
            giftCardName;
        }
        if (!isTxForPaymentFee) {
          if (noteBody) {
            transaction.uiDescription = noteBody;
          } else if (message) {
            transaction.uiDescription = message;
          } else if (recipientCount && recipientCount > 1) {
            transaction.uiDescription = t('Multiple recipients');
          } else if (contactName || transaction.customData?.recipientEmail) {
            transaction.uiDescription =
              contactName || transaction.customData?.recipientEmail;
          } else if (toWalletName) {
            // t('SentToWalletName')
            transaction.uiDescription = t('SentToWalletName', {
              walletName: toWalletName,
            });
          } else {
            transaction.uiDescription =
              t('Sent') +
              (isAccountDetailsView
                ? ` ${currencyAbbreviation?.toUpperCase()}`
                : '');
          }
        }
      }

      if (isReceived) {
        transaction.uiIcon = 'received';

        if (noteBody) {
          transaction.uiDescription = noteBody;
        } else if (contactName) {
          transaction.uiDescription = contactName;
        } else {
          transaction.uiDescription =
            t('Received') +
            (isAccountDetailsView
              ? ` ${currencyAbbreviation?.toUpperCase()}`
              : '');
        }
      }

      if (isMoved) {
        transaction.uiIcon = 'moved';

        if (noteBody) {
          transaction.uiDescription = noteBody;
        } else if (message) {
          transaction.uiDescription = message;
        } else {
          transaction.uiDescription =
            transaction.customData?.recipientEmail ||
            t('Sent to self') +
              (isAccountDetailsView
                ? ` ${currencyAbbreviation?.toUpperCase()}`
                : '');
        }
      }

      if (isInvalid) {
        transaction.uiIcon = 'error';

        transaction.uiDescription = t('Invalid');
      }
    }

    if (isTxForPaymentFee) {
      const {uiDescription} = transaction;
      transaction.uiIcon = 'contractInteraction';

      transaction.uiDescription = uiDescription
        ? t('Interaction with contract') + ` ${uiDescription}`
        : t('Interaction with contract');
      transaction.uiValue = feeStr;
    }

    if (isInvalid) {
      transaction.uiValue = t('(possible double spend)');
    } else {
      if (!isTxForPaymentFee) {
        transaction.uiValue = amountStr;
      }
    }

    transaction.uiTime = getFormattedDate((time || createdOn) * 1000);
    transaction.uiCreator = creatorName;
    transaction.walletId = walletId;

    return transaction;
  });
};

export const CanSpeedupTx = (
  tx: any,
  currencyAbbreviation: string,
  chain: string,
): boolean => {
  const isERC20Wallet = IsERCToken(currencyAbbreviation, chain);
  const isEthWallet = currencyAbbreviation === 'eth';

  if (currencyAbbreviation !== 'btc' && isEthWallet && isERC20Wallet) {
    return false;
  }

  const {action, abiType, confirmations} = tx || {};
  const isERC20Transfer = abiType?.name === 'transfer';
  const isUnconfirmed = !confirmations || confirmations === 0;

  if ((isEthWallet && !isERC20Transfer) || (isERC20Wallet && isERC20Transfer)) {
    // Can speed up the eth/erc20 tx instantly
    return isUnconfirmed && (IsSent(action) || IsMoved(action));
  } else {
    const currentTime = moment();
    const txTime = moment(tx.time * 1000);

    // Can speed up the btc tx after 1 hours without confirming
    return (
      currentTime.diff(txTime, 'hours') >= 1 &&
      isUnconfirmed &&
      IsReceived(action) &&
      currencyAbbreviation === 'btc'
    );
  }
};

///////////////////////////////////////// Transaction Details ////////////////////////////////////////////////

export const getDetailsTitle = (transaction: any, wallet: Wallet) => {
  if (!transaction) {
    return;
  }
  const {action, error} = transaction;
  const {chain} = wallet;

  if (!IsInvalid(action)) {
    if (SUPPORTED_VM_TOKENS.includes(chain) && error) {
      return t('Failed');
    } else if (IsSent(action)) {
      return t('Sent');
    } else if (IsReceived(action)) {
      return t('Received');
    } else if (IsMoved(action)) {
      return t('Sent to self');
    }
  }
};

export const buildTransactionDetails =
  ({
    transaction,
    wallet,
    defaultAltCurrencyIsoCode = 'USD',
  }: {
    transaction: TransactionProposal;
    wallet: Wallet;
    defaultAltCurrencyIsoCode?: string;
  }): Effect<Promise<TransactionDetailsBuilt>> =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const _transaction: TransactionDetailsBuilt = {...transaction};
        const {
          fees,
          fee,
          amount,
          note,
          message,
          action,
          time,
          hasMultiplesOutputs,
          coin,
          chain,
          tokenAddress,
          receipt,
        } = transaction;

        const {
          WALLET: {tokenOptionsByAddress, customTokenOptionsByAddress},
        } = getState();

        const tokensOptsByAddress = {
          ...BitpaySupportedTokenOptsByAddress,
          ...tokenOptionsByAddress,
          ...customTokenOptionsByAddress,
        };

        // Only for payouts. For this case chain and coin have the same value.
        // Therefore, to identify an ERC20 token payout it is necessary to check if exist the tokenAddress field
        let tokenSymbol: string | undefined;

        if (tokenAddress) {
          tokenSymbol = Object.values(tokensOptsByAddress)
            .find(
              ({address}) =>
                tokenAddress?.toLowerCase() === address?.toLowerCase(),
            )
            ?.symbol.toLowerCase();
        }

        const _fee =
          receipt?.gasUsed &&
          receipt?.gasUsed > 0 &&
          receipt?.effectiveGasPrice &&
          receipt?.effectiveGasPrice > 0
            ? receipt?.gasUsed * receipt?.effectiveGasPrice
            : fees != null
            ? fees
            : fee;

        const alternativeCurrency = defaultAltCurrencyIsoCode;

        const rates = await dispatch(startGetRates({}));

        _transaction.feeFiatStr = formatFiatAmount(
          dispatch(
            toFiat(_fee, alternativeCurrency, chain, chain, rates, undefined),
          ),
          alternativeCurrency,
        );

        if (hasMultiplesOutputs) {
          if (action !== 'received') {
            _transaction.outputs = _transaction.outputs.map((o: any) => {
              o.alternativeAmountStr = formatFiatAmount(
                dispatch(
                  toFiat(
                    o.amount,
                    alternativeCurrency,
                    tokenSymbol || coin,
                    chain,
                    rates,
                    wallet.tokenAddress,
                  ),
                ),
                alternativeCurrency,
              );
              return o;
            });
          }
        }

        if (IsUtxoChain(chain)) {
          _transaction.feeRateStr =
            ((_fee / (amount + _fee)) * 100).toFixed(2) + '%';
          try {
            const minFee = await GetMinFee(wallet);
            _transaction.lowAmount = amount < minFee;
          } catch (minFeeErr) {
            const e =
              minFeeErr instanceof Error
                ? minFeeErr.message
                : JSON.stringify(minFeeErr);
            dispatch(LogActions.error('[GeMinFee] ', e));
          }
        }

        if (!note) {
          _transaction.txDescription = message;
        }

        if (note?.body) {
          _transaction.txDescription = note.body;
        }

        _transaction.actionsList = GetActionsList(transaction, wallet);

        const historicFiatRate = await getHistoricFiatRate(
          alternativeCurrency,
          tokenSymbol || coin,
          (time! * 1000).toString(),
        );
        _transaction.fiatRateStr = dispatch(
          UpdateFiatRate(
            historicFiatRate,
            transaction,
            rates,
            tokenSymbol || coin,
            alternativeCurrency,
            chain,
            wallet.tokenAddress,
          ),
        );

        resolve(_transaction);
      } catch (e) {
        return reject(e);
      }
    });
  };

const UpdateFiatRate =
  (
    historicFiatRate: HistoricRate,
    transaction: any,
    rates: Rates = {},
    currency: string,
    alternativeCurrency: string,
    chain: string,
    tokenAddress: string | undefined,
  ): Effect<string> =>
  dispatch => {
    const {amountValueStr, amount} = transaction;
    let fiatRateStr;
    if (historicFiatRate?.rate) {
      const {rate} = historicFiatRate;
      fiatRateStr =
        (rate !== 1
          ? formatFiatAmount(
              parseFloat((rate * amountValueStr).toFixed(2)),
              alternativeCurrency,
            )
          : '') +
        ` @ ${formatFiatAmount(rate, alternativeCurrency)} ` +
        t('per') +
        ` ${currency.toUpperCase()}`;
    } else {
      // Get current fiat value when historic rates are unavailable
      fiatRateStr = dispatch(
        toFiat(
          amount,
          alternativeCurrency,
          currency,
          chain,
          rates,
          tokenAddress,
        ),
      );
      fiatRateStr = formatFiatAmount(fiatRateStr, alternativeCurrency);
    }
    return fiatRateStr;
  };

export interface TxActions {
  type: string;
  time: number;
  description: string;
  by?: string;
}

const GetActionsList = (transaction: any, wallet: Wallet) => {
  const {actions, createdOn, creatorName, time, action} = transaction;

  if (!IsShared(wallet) || IsReceived(action)) {
    return;
  }

  const actionList: TxActions[] = [];

  let actionDescriptions: {[key in string]: string} = {
    created: t('Proposal Created'),
    failed: t('Execution Failed'),
    accept: t('Accepted'),
    reject: t('Rejected'),
    broadcasted: t('Broadcasted'),
  };

  actionList.push({
    type: 'created',
    time: createdOn,
    description: actionDescriptions.created,
    by: creatorName,
  });

  actions.forEach((action: any) => {
    actionList.push({
      type: action.type,
      time: action.createdOn,
      description: actionDescriptions[action.type],
      by: action.copayerName,
    });
  });

  if (transaction.confirmations > 0) {
    actionList.push({
      type: 'broadcasted',
      time,
      description: actionDescriptions.broadcasted,
    });
  }

  return actionList.reverse();
};

export const GetUtxos = (wallet: Wallet): Promise<Utxo[]> => {
  return new Promise((resolve, reject) => {
    wallet.getUtxos(
      {
        coin: wallet.credentials.chain,
      },
      (err: any, resp: any) => {
        if (err || !resp || !resp.length) {
          return reject(err ? err : 'No UTXOs');
        }
        return resolve(resp);
      },
    );
  });
};

export const GetInput = async (wallet: Wallet, txid: string) => {
  try {
    const utxos = await GetUtxos(wallet);
    let biggestUtxo = 0;
    let input;
    utxos.forEach((u: any, i: any) => {
      if (u.txid === txid) {
        if (u.amount > biggestUtxo) {
          biggestUtxo = u.amount;
          input = utxos[i];
        }
      }
    });
    return input;
  } catch (err) {
    return;
  }
};
