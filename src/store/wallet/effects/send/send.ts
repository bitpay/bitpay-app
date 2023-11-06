import {Effect} from '../../../index';
import {
  CustomTransactionData,
  Key,
  ProposalErrorHandlerProps,
  Recipient,
  TransactionOptions,
  SendMaxInfo,
  TransactionProposal,
  TxDetails,
  Wallet,
  TransactionOptionsContext,
} from '../../wallet.models';
import {
  FormatAmount,
  FormatAmountStr,
  ParseAmount,
  parseAmountToStringIfBN,
} from '../amount/amount';
import {FeeLevels, GetBitcoinSpeedUpTxFee, getFeeRatePerKb} from '../fee/fee';
import {GetInput} from '../transactions/transactions';
import {
  formatCryptoAddress,
  formatFiatAmount,
  getCWCChain,
  getRateByCurrencyName,
  sleep,
} from '../../../../utils/helper-methods';
import {toFiat, checkEncryptPassword} from '../../utils/wallet';
import {startGetRates} from '../rates/rates';
import {
  startUpdateWalletStatus,
  waitForTargetAmountAndUpdateWallet,
} from '../status/status';
import {
  CustomErrorMessage,
  ExcludedUtxosWarning,
  GeneralError,
} from '../../../../navigation/wallet/components/ErrorMessages';
import {BWCErrorMessage, getErrorName} from '../../../../constants/BWCError';
import {Invoice} from '../../../shop/shop.models';
import {GetPayProDetails, HandlePayPro, PayProOptions} from '../paypro/paypro';
import {
  checkingBiometricForSending,
  dismissBottomNotificationModal,
  dismissDecryptPasswordModal,
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showDecryptPasswordModal,
} from '../../../app/app.actions';
import {GetPrecision, IsERCToken} from '../../utils/currency';
import {CommonActions, NavigationProp} from '@react-navigation/native';
import {BwcProvider} from '../../../../lib/bwc';
import {createWalletAddress, ToCashAddress} from '../address/address';
import {WalletRowProps} from '../../../../components/list/WalletRow';
import {t} from 'i18next';
import {
  openUrlWithInAppBrowser,
  startOnGoingProcessModal,
} from '../../../app/app.effects';
import {LogActions} from '../../../log';
import _ from 'lodash';
import TouchID from 'react-native-touch-id-ng';
import {
  authOptionalConfigObject,
  BiometricErrorNotification,
  TO_HANDLE_ERRORS,
} from '../../../../constants/BiometricError';
import {Platform} from 'react-native';
import {Rates} from '../../../rate/rate.models';
import {
  getCoinAndChainFromCurrencyCode,
  getCurrencyCodeFromCoinAndChain,
} from '../../../../navigation/bitpay-id/utils/bitpay-id-utils';
import {navigationRef} from '../../../../Root';
import {WalletScreens} from '../../../../navigation/wallet/WalletStack';
import {keyBackupRequired} from '../../../../navigation/tabs/home/components/Crypto';
import {Analytics} from '../../../analytics/analytics.effects';
import {AppActions} from '../../../app';
import {URL} from '../../../../constants';
import {WCV2RequestType} from '../../../wallet-connect-v2/wallet-connect-v2.models';
import {WALLET_CONNECT_SUPPORTED_CHAINS} from '../../../../constants/WalletConnectV2';

export const createProposalAndBuildTxDetails =
  (
    tx: TransactionOptions,
  ): Effect<
    Promise<{
      txDetails: TxDetails;
      txp: TransactionProposal;
    }>
  > =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        // base tx
        let {
          wallet,
          recipient,
          amount,
          context,
          feeLevel: customFeeLevel,
          feePerKb,
          invoice,
          payProUrl,
          dryRun = true,
          destinationTag,
          payProDetails,
        } = tx;

        let {credentials, currencyAbbreviation, network, tokenAddress} = wallet;
        const {token, chain} = credentials;
        const formattedAmount = dispatch(
          ParseAmount(amount, currencyAbbreviation, chain, tokenAddress),
        );
        const {
          WALLET: {
            feeLevel: cachedFeeLevel,
            useUnconfirmedFunds,
            queuedTransactions,
            enableReplaceByFee,
          },
        } = getState();
        const {
          APP: {defaultAltCurrency},
        } = getState();

        if (
          chain === 'eth' &&
          wallet.transactionHistory?.hasConfirmingTxs &&
          context !== 'speedupEth'
        ) {
          if (!queuedTransactions) {
            return reject({
              err: new Error(
                t(
                  'There is a pending transaction with a lower account nonce. Wait for your pending transactions to confirm or enable "ETH Queued transactions" in Advanced Settings.',
                ),
              ),
            });
          } else {
            await dispatch(setEthAddressNonce(wallet, tx));
          }
        }

        if (currencyAbbreviation === 'xrp') {
          if (payProDetails) {
            const instructions = payProDetails.instructions[0];
            const {outputs} = instructions;
            tx.invoiceID = outputs[0].invoiceID;
          }
          tx.destinationTag = destinationTag || recipient.destinationTag;

          if (wallet.receiveAddress === recipient.address) {
            return reject({
              err: new Error(
                t(
                  'Cannot send XRP to the same wallet you are trying to send from. Please check the destination address and try it again.',
                ),
              ),
            });
          }
        }

        if (
          currencyAbbreviation === 'btc' &&
          !(context && ['paypro', 'selectInputs'].includes(context))
        ) {
          tx.enableRBF = tx.enableRBF || enableReplaceByFee;
        }

        const tokenFeeLevel = token ? cachedFeeLevel.eth : undefined;
        const feeLevel =
          customFeeLevel ||
          cachedFeeLevel[currencyAbbreviation] ||
          tokenFeeLevel ||
          FeeLevels.NORMAL;
        if (!feePerKb && tx.sendMax) {
          feePerKb = await getFeeRatePerKb({
            wallet,
            feeLevel: feeLevel,
          });
        }

        // build transaction proposal options then create full proposal
        const txp = {
          ...(await dispatch(
            buildTransactionProposal({
              ...tx,
              context,
              currency: currencyAbbreviation.toLowerCase(),
              chain,
              tokenAddress: token ? token.address : null,
              toAddress: recipient.address,
              amount: formattedAmount.amountSat,
              network,
              payProUrl,
              feePerKb,
              feeLevel,
              useUnconfirmedFunds,
            }),
          )),
          dryRun,
        } as Partial<TransactionProposal>;

        wallet.createTxProposal(
          txp,
          async (err: Error, proposal: TransactionProposal) => {
            if (err) {
              return reject({err, tx, txp, getState});
            }
            try {
              const rates = await dispatch(startGetRates({}));
              // building UI object for details
              const txDetails = dispatch(
                buildTxDetails({
                  proposal,
                  rates,
                  defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
                  wallet,
                  recipient,
                  invoice,
                  context,
                  feeLevel,
                }),
              );
              txp.id = proposal.id;
              resolve({txDetails, txp: txp as TransactionProposal});
            } catch (err2) {
              reject({err: err2});
            }
          },
          null,
        );
      } catch (err) {
        reject({err});
      }
    });
  };

const setEthAddressNonce =
  (wallet: Wallet, tx: TransactionOptions): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    return new Promise(async resolve => {
      try {
        const {
          coin: currencyAbbreviation,
          chain,
          keyId,
          walletId,
        } = wallet.credentials;

        if (chain !== 'eth' || tx.context === 'speedupEth') {
          return resolve();
        }

        let transactionHistory;
        let nonceWallet: Wallet;
        // linked eth wallet could have pendings txs from different tokens
        // this means we need to check pending txs from the linked wallet if is ERC20Token instead of the sending wallet
        if (IsERCToken(currencyAbbreviation, chain)) {
          const {WALLET} = getState();
          const key = WALLET.keys[keyId];
          const linkedWallet = key.wallets.find(({tokens}) =>
            tokens?.includes(walletId),
          );
          transactionHistory = linkedWallet?.transactionHistory?.transactions;
          nonceWallet = linkedWallet!;
        } else {
          transactionHistory = wallet.transactionHistory?.transactions;
          nonceWallet = wallet;
        }

        let address = nonceWallet?.receiveAddress;

        if (!address) {
          dispatch(startOnGoingProcessModal('GENERATING_ADDRESS'));
          address = await dispatch<Promise<string>>(
            createWalletAddress({wallet: nonceWallet, newAddress: false}),
          );
          dispatch(dismissOnGoingProcessModal());
        }

        const nonce = await getNonce(nonceWallet, chain, address);
        let suggestedNonce: number = nonce;

        const pendingTxsNonce = [];
        if (transactionHistory && transactionHistory[0]) {
          for (let transaction of transactionHistory) {
            if (
              transaction.action === 'sent' ||
              transaction.action === 'moved'
            ) {
              if (transaction.confirmations === 0) {
                pendingTxsNonce.push(transaction.nonce);
              } else {
                break;
              }
            }
          }
        }

        if (pendingTxsNonce && pendingTxsNonce.length > 0) {
          pendingTxsNonce.sort((a, b) => a! - b!);
          for (let i = 0; i < pendingTxsNonce.length; i++) {
            if (pendingTxsNonce[i]! + 1 !== pendingTxsNonce[i + 1]) {
              suggestedNonce = pendingTxsNonce[i]! + 1;
              break;
            }
          }
        }

        dispatch(
          LogActions.info(
            `Using web3 nonce: ${nonce} - Suggested Nonce: ${suggestedNonce} - pending txs: ${
              suggestedNonce! - nonce
            }`,
          ),
        );

        tx.nonce = suggestedNonce;

        return resolve();
      } catch (error: any) {
        const errString =
          error instanceof Error ? error.message : JSON.stringify(error);
        dispatch(LogActions.error(`Could not get address nonce ${errString}`));
        return resolve();
      }
    });
  };

export const getNonce = (
  wallet: Wallet,
  chain: string,
  address: string,
): Promise<number> => {
  return new Promise((resolve, reject) => {
    wallet.getNonce(
      {
        coin: chain, // use chain as coin for nonce
        chain,
        network: wallet.network,
        address,
      },
      (err: any, nonce: number) => {
        if (err) {
          return reject(err);
        }
        return resolve(nonce);
      },
    );
  });
};

export const getInvoiceEffectiveRate =
  (invoice: Invoice, coin: string, chain: string): Effect<number | undefined> =>
  dispatch => {
    const precision = dispatch(GetPrecision(coin, chain));
    const invoiceCurrency = getCurrencyCodeFromCoinAndChain(coin, chain);
    return (
      precision &&
      invoice.price /
        (invoice.paymentSubtotals[invoiceCurrency] / precision.unitToSatoshi)
    );
  };

/*
 * UI formatted details for confirm view
 * */
export const buildTxDetails =
  ({
    proposal,
    rates,
    defaultAltCurrencyIsoCode,
    wallet,
    recipient,
    invoice,
    context,
    feeLevel = 'custom',
    request,
    feePerKb,
  }: {
    proposal?: TransactionProposal;
    rates: Rates;
    defaultAltCurrencyIsoCode: string;
    wallet: Wallet | WalletRowProps;
    recipient?: Recipient;
    invoice?: Invoice;
    context?: TransactionOptionsContext;
    feeLevel?: string;
    request?: WCV2RequestType;
    feePerKb?: number;
  }): Effect<TxDetails> =>
  dispatch => {
    let gasPrice, gasLimit, nonce, destinationTag, coin, chain, amount, fee;

    const tokenAddress = wallet.tokenAddress;

    if (context === 'walletConnect' && request) {
      const {params} = request.params.request;
      gasPrice = params[0].gasPrice
        ? parseInt(params[0]?.gasPrice, 16)
        : feePerKb!;
      gasLimit =
        (params[0].gasLimit && parseInt(params[0]?.gasLimit, 16)) ||
        (params[0].gas && parseInt(params[0]?.gas, 16));
      nonce = params[0].nonce && parseInt(params[0]?.nonce, 16);
      coin = chain =
        WALLET_CONNECT_SUPPORTED_CHAINS[request.params.chainId]?.chain;
      amount = parseInt(params[0]?.value, 16) || 0;
      fee = gasLimit * gasPrice;
    }

    if (proposal) {
      gasPrice = proposal.gasPrice;
      gasLimit = proposal.gasLimit;
      nonce = proposal.nonce;
      destinationTag = proposal.destinationTag;
      coin = proposal.coin;
      chain = proposal.chain;
      amount = proposal.amount;
      fee = proposal.fee || 0; // proposal fee is zero for coinbase
    }

    const selectedTransactionCurrency =
      invoice?.buyerProvidedInfo!.selectedTransactionCurrency ||
      wallet.currencyAbbreviation.toUpperCase();

    const isOffChain = !proposal;
    if (invoice && selectedTransactionCurrency) {
      amount = isOffChain
        ? invoice.paymentSubtotals[selectedTransactionCurrency]
        : invoice.paymentTotals[selectedTransactionCurrency];
      const coinAndChain = getCoinAndChainFromCurrencyCode(
        selectedTransactionCurrency.toLowerCase(),
      );
      coin = coinAndChain.coin;
      chain = coinAndChain.chain;
      if (isOffChain) {
        fee = 0;
      }
    }

    if (!coin || !chain) {
      throw new Error('Invalid coin or chain');
    }

    amount = Number(amount); // Support BN (use number instead string only for view)
    let effectiveRate;
    if (
      invoice &&
      selectedTransactionCurrency &&
      defaultAltCurrencyIsoCode === invoice.currency
    ) {
      effectiveRate = dispatch(
        getInvoiceEffectiveRate(invoice, selectedTransactionCurrency, chain),
      );
    }
    const opts = {
      effectiveRate,
      defaultAltCurrencyIsoCode,
      rates,
      coin,
      chain,
    };
    const rateStr = getRateStr(opts);
    const networkCost =
      !isOffChain &&
      selectedTransactionCurrency &&
      invoice?.minerFees[selectedTransactionCurrency]?.totalFee;
    const isERC20 = IsERCToken(coin, chain);
    const effectiveRateForFee = isERC20 ? undefined : effectiveRate; // always use chain rates for fee values

    const {type, name, address, email} = recipient || {};
    const feeToFiat = dispatch(
      toFiat(
        fee,
        defaultAltCurrencyIsoCode,
        chain,
        chain,
        rates,
        undefined,
        effectiveRateForFee,
      ),
    );
    const amountToFiat = dispatch(
      toFiat(
        amount,
        defaultAltCurrencyIsoCode,
        coin,
        chain,
        rates,
        tokenAddress,
        effectiveRate,
      ),
    );
    const percentageOfTotalAmount =
      (feeToFiat / (amountToFiat + feeToFiat)) * 100;
    return {
      context,
      currency: coin,
      sendingTo: {
        recipientType: type,
        recipientName: name,
        recipientEmail: email,
        recipientAddress: address && formatCryptoAddress(address),
        img: wallet.img,
        recipientFullAddress: address,
        recipientChain: chain,
      },
      ...(fee !== 0 && {
        fee: {
          feeLevel,
          cryptoAmount: dispatch(FormatAmountStr(chain, chain, undefined, fee)),
          fiatAmount: formatFiatAmount(feeToFiat, defaultAltCurrencyIsoCode),
          percentageOfTotalAmountStr: `${percentageOfTotalAmount.toFixed(2)}%`,
          percentageOfTotalAmount,
        },
      }),
      ...(networkCost && {
        networkCost: {
          cryptoAmount: dispatch(
            FormatAmountStr(chain, chain, undefined, networkCost),
          ),
          fiatAmount: formatFiatAmount(
            dispatch(
              toFiat(
                networkCost,
                defaultAltCurrencyIsoCode,
                chain,
                chain,
                rates,
                undefined,
                effectiveRateForFee,
              ),
            ),
            defaultAltCurrencyIsoCode,
          ),
        },
      }),
      sendingFrom: {
        walletName: wallet.walletName || wallet.credentials.walletName,
        img: wallet.img,
        badgeImg: wallet.badgeImg,
      },
      subTotal: {
        cryptoAmount: dispatch(
          FormatAmountStr(coin, chain, tokenAddress, amount),
        ),
        fiatAmount: formatFiatAmount(amountToFiat, defaultAltCurrencyIsoCode),
      },
      total: {
        cryptoAmount: isERC20
          ? `${dispatch(
              FormatAmountStr(coin, chain, tokenAddress, amount),
            )}\n + ${dispatch(FormatAmountStr(chain, chain, undefined, fee))}`
          : dispatch(FormatAmountStr(coin, chain, tokenAddress, amount + fee)),
        fiatAmount: formatFiatAmount(
          amountToFiat + feeToFiat,
          defaultAltCurrencyIsoCode,
        ),
      },
      gasPrice: gasPrice ? Number((gasPrice * 1e-9).toFixed(2)) : undefined,
      gasLimit,
      nonce,
      destinationTag,
      rateStr,
    };
  };

const getRateStr = (opts: {
  effectiveRate: number | undefined;
  rates: Rates;
  defaultAltCurrencyIsoCode: string;
  coin: string;
  chain: string;
}): string | undefined => {
  const fiatRate = !opts.effectiveRate
    ? getRateByCurrencyName(
        opts.rates,
        opts.coin.toLowerCase(),
        opts.chain,
      ).find(r => r.code === opts.defaultAltCurrencyIsoCode)!.rate
    : opts.effectiveRate;
  return `1 ${opts.coin.toUpperCase()} @ ${formatFiatAmount(
    parseFloat(fiatRate.toFixed(2)),
    opts.defaultAltCurrencyIsoCode,
  )}`;
};
/*
 * txp options object for wallet.createTxProposal
 * */
const buildTransactionProposal =
  (tx: Partial<TransactionOptions>): Effect<Promise<object>> =>
  dispatch => {
    return new Promise(async (resolve, reject) => {
      try {
        const {
          currency,
          chain,
          feeLevel,
          feePerKb,
          invoiceID,
          message,
          payProUrl,
          sendMax,
          wallet,
          inputs,
          recipientList,
        } = tx;
        let {customData} = tx;

        if (!customData) {
          if (tx.recipient?.type === 'wallet') {
            customData = {
              toWalletName: tx.recipient.name || null,
            };
          } else if (tx.recipient?.type === 'coinbase') {
            customData = {
              service: 'coinbase',
            };
          } else if (tx.recipient?.email) {
            customData = {
              recipientEmail: tx.recipient.email,
            };
          }
        }

        // base tx
        const txp: Partial<TransactionProposal> = {
          coin: currency?.toLowerCase(),
          chain,
          customData,
          feePerKb,
          ...(!feePerKb && {feeLevel}),
          invoiceID,
          message,
        };
        // currency specific
        switch (chain) {
          case 'btc':
            txp.enableRBF = tx.enableRBF;
            txp.replaceTxByFee = tx.replaceTxByFee;
            break;
          case 'eth':
          case 'matic':
            txp.from = tx.from;
            txp.nonce = tx.nonce;
            txp.gasLimit = tx.gasLimit;
            txp.tokenAddress = tx.tokenAddress;
            txp.multisigContractAddress = tx.multisigContractAddress;
            break;
          case 'xrp':
            txp.destinationTag = tx.destinationTag;
            break;
          case 'bch':
            tx.toAddress = !recipientList
              ? ToCashAddress(tx.toAddress!, false)
              : undefined;
            break;
        }

        // unconfirmed funds
        txp.excludeUnconfirmedUtxos = !tx.useUnconfirmedFunds;

        const verifyExcludedUtxos = (
          sendMaxInfo: SendMaxInfo,
          currencyAbbreviation: string,
          tokenAddress: string | undefined,
        ) => {
          const warningMsg = [];
          if (sendMaxInfo.utxosBelowFee > 0) {
            const amountBelowFeeStr =
              sendMaxInfo.amountBelowFee /
              dispatch(
                GetPrecision(currencyAbbreviation, chain!, tokenAddress),
              )!.unitToSatoshi!;
            const message = t(
              'A total of were excluded. These funds come from UTXOs smaller than the network fee provided',
              {
                amountBelowFeeStr,
                currencyAbbreviation: currencyAbbreviation.toUpperCase(),
              },
            );
            warningMsg.push(message);
          }

          if (sendMaxInfo.utxosAboveMaxSize > 0) {
            const amountAboveMaxSizeStr =
              sendMaxInfo.amountAboveMaxSize /
              dispatch(
                GetPrecision(currencyAbbreviation, chain!, tokenAddress),
              )!.unitToSatoshi;
            const message = t(
              'A total of were excluded. The maximum size allowed for a transaction was exceeded.',
              {
                amountAboveMaxSizeStr,
                currencyAbbreviation: currencyAbbreviation.toUpperCase(),
              },
            );
            warningMsg.push(message);
          }
          return warningMsg.join('\n');
        };

        // send max
        if (sendMax && wallet) {
          if (IsERCToken(wallet.currencyAbbreviation, wallet.chain)) {
            txp.amount = tx.amount = wallet.balance.satAvailable;
          } else {
            const sendMaxInfo = await getSendMaxInfo({
              wallet,
              opts: {
                feePerKb,
                excludeUnconfirmedUtxos: txp.excludeUnconfirmedUtxos,
                returnInputs: true,
              },
            });
            const {amount, inputs, fee} = sendMaxInfo;

            txp.amount = tx.amount = amount;
            txp.inputs = inputs;
            // Either fee or feePerKb can be available
            txp.fee = fee;
            txp.feePerKb = undefined;

            const warningMsg = verifyExcludedUtxos(
              sendMaxInfo,
              wallet.currencyAbbreviation,
              wallet.tokenAddress,
            );

            if (!_.isEmpty(warningMsg)) {
              dispatch(
                showBottomNotificationModal(
                  ExcludedUtxosWarning({
                    errMsg: warningMsg,
                  }),
                ),
              );
            }
          }
        }

        const {context} = tx;
        // outputs
        txp.outputs = [];
        switch (context) {
          case 'multisend':
            if (recipientList) {
              recipientList.forEach(r => {
                const formattedAmount = dispatch(
                  ParseAmount(r.amount || 0, chain!, chain!, undefined),
                );
                txp.outputs?.push({
                  toAddress:
                    chain === 'bch'
                      ? ToCashAddress(r.address!, false)
                      : r.address,
                  amount: formattedAmount.amountSat,
                  message: tx.description,
                  data: tx.data,
                });
              });
            }
            break;
          case 'paypro':
            txp.payProUrl = payProUrl;
            const {instructions} = tx.payProDetails;
            for (const instruction of instructions) {
              txp.outputs.push({
                toAddress: instruction.toAddress,
                amount: instruction.amount,
                message: instruction.message,
                data: instruction.data,
                gasLimit: tx.gasLimit,
              });
            }
            break;
          case 'selectInputs':
            txp.inputs = inputs;
            txp.fee = tx.fee;
            txp.feeLevel = undefined;
            if (tx.replaceTxByFee) {
              txp.replaceTxByFee = true;
            }
            txp.outputs.push({
              toAddress: tx.toAddress,
              amount: tx.amount!,
              message: tx.description,
              data: tx.data,
            });
            break;
          case 'fromReplaceByFee':
            txp.inputs = tx.inputs;
            txp.replaceTxByFee = true;
            if (recipientList) {
              recipientList.forEach(r => {
                const formattedAmount = dispatch(
                  ParseAmount(r.amount || 0, chain!, chain!, undefined),
                );
                txp.outputs?.push({
                  toAddress: r.address,
                  amount: formattedAmount.amountSat,
                  message: tx.description,
                });
              });
            } else {
              txp.outputs.push({
                toAddress: tx.toAddress,
                amount: tx.amount!,
                message: tx.description,
                data: tx.data,
              });
            }
            break;
          case 'speedupBtcReceive':
            txp.inputs = tx.inputs;
            txp.excludeUnconfirmedUtxos = true;
            txp.fee = tx.fee;
            txp.feeLevel = undefined;

            txp.outputs.push({
              toAddress: tx.toAddress,
              amount: tx.amount!,
              message: tx.description,
              data: tx.data,
            });
            break;
          default:
            txp.outputs.push({
              toAddress: tx.toAddress,
              amount: tx.amount!,
              message: tx.description,
              data: tx.data,
              gasLimit: tx.gasLimit,
            });
        }

        if (tx.tokenAddress) {
          txp.tokenAddress = tx.tokenAddress;
          if (tx.context !== 'paypro') {
            for (const output of txp.outputs) {
              if (output.amount) {
                output.amount = parseAmountToStringIfBN(output.amount);
              }
              if (!output.data) {
                output.data = BwcProvider.getInstance()
                  .getCore()
                  .Transactions.get({chain: getCWCChain(txp.chain!)})
                  .encodeData({
                    recipients: [
                      {address: output.toAddress, amount: output.amount},
                    ],
                    tokenAddress: tx.tokenAddress,
                  });
              }
            }
          }
        }

        resolve(txp);
      } catch (error) {
        reject(error);
      }
    });
  };

export const startSendPayment =
  ({
    txp,
    key,
    wallet,
    recipient,
  }: {
    txp: Partial<TransactionProposal>;
    key: Key;
    wallet: Wallet;
    recipient: Recipient;
  }): Effect<Promise<any>> =>
  async dispatch => {
    return new Promise(async (resolve, reject) => {
      try {
        wallet.createTxProposal(
          {...txp, dryRun: false},
          async (err: Error, proposal: TransactionProposal) => {
            if (err) {
              return reject(err);
            }

            try {
              const broadcastedTx = await dispatch(
                publishAndSign({
                  txp: proposal,
                  key,
                  wallet,
                  recipient,
                }),
              );
              return resolve(broadcastedTx);
            } catch (e) {
              return reject(e);
            }
          },
          null,
        );
      } catch (err) {
        const errString =
          err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(LogActions.error(`startSendPayment: ${errString}`));
        reject(err);
      }
    });
  };

export const publishAndSign =
  ({
    txp,
    key,
    wallet,
    recipient,
    password,
    signingMultipleProposals,
  }: {
    txp: TransactionProposal;
    key: Key;
    wallet: Wallet;
    recipient?: Recipient;
    password?: string;
    signingMultipleProposals?: boolean; // when signing multiple proposals from a wallet we ask for decrypt password and biometric before
  }): Effect<Promise<Partial<TransactionProposal> | void>> =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      const {
        APP: {biometricLockActive},
      } = getState();

      if (biometricLockActive && !signingMultipleProposals) {
        try {
          await dispatch(checkBiometricForSending());
        } catch (error) {
          return reject(error);
        }
      }
      if (key.isPrivKeyEncrypted && !signingMultipleProposals) {
        try {
          password = await new Promise<string>(async (_resolve, _reject) => {
            dispatch(dismissOnGoingProcessModal()); // dismiss any previous modal
            await sleep(500);
            dispatch(
              showDecryptPasswordModal({
                onSubmitHandler: async (_password: string) => {
                  dispatch(dismissDecryptPasswordModal());
                  await sleep(500);
                  checkEncryptPassword(key, _password)
                    ? _resolve(_password)
                    : _reject('invalid password');
                },
                onCancelHandler: () => {
                  _reject('password canceled');
                },
              }),
            );
          });
          dispatch(startOnGoingProcessModal('SENDING_PAYMENT'));
        } catch (error) {
          return reject(error);
        }
      }

      try {
        let publishedTx, broadcastedTx;

        // Already published?
        if (txp.status !== 'pending') {
          publishedTx = await publishTx(wallet, txp);
          dispatch(LogActions.debug('success publish [publishAndSign]'));
        }

        if (key.isReadOnly) {
          // read only wallet
          return resolve(publishedTx);
        }

        const signedTx: any = await signTx(
          wallet,
          key,
          publishedTx || txp,
          password,
        );
        dispatch(LogActions.debug('success sign [publishAndSign]'));
        if (signedTx.status === 'accepted') {
          broadcastedTx = await broadcastTx(wallet, signedTx);
          dispatch(LogActions.debug('success broadcast [publishAndSign]'));
          const {fee, amount} = broadcastedTx as {
            fee: number;
            amount: number;
          };
          const targetAmount = wallet.balance.sat - (fee + amount);

          dispatch(
            waitForTargetAmountAndUpdateWallet({
              key,
              wallet,
              targetAmount,
              recipient,
            }),
          );
        } else {
          dispatch(startUpdateWalletStatus({key, wallet, force: true}));
        }

        let resultTx = broadcastedTx ? broadcastedTx : signedTx;
        dispatch(
          LogActions.info(`resultTx [publishAndSign]: ${resultTx?.txid}`),
        );

        // Check if ConfirmTx notification is enabled
        const {APP} = getState();
        if (APP.confirmedTxAccepted) {
          wallet.txConfirmationSubscribe(
            {txid: resultTx?.id, amount: txp.amount},
            (err: any) => {
              if (err) {
                dispatch(
                  LogActions.error(
                    '[publishAndSign] txConfirmationSubscribe err',
                    err,
                  ),
                );
              }
            },
          );
        }

        resolve(resultTx);
      } catch (err) {
        const errorStr =
          err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(LogActions.error(`[publishAndSign] err: ${errorStr}`));
        // if broadcast fails, remove transaction proposal
        try {
          // except for multisig pending transactions
          if (txp.status !== 'pending') {
            await removeTxp(wallet, txp);
          }
        } catch (removeTxpErr: any) {
          dispatch(
            LogActions.error(
              `[publishAndSign] err - Could not delete payment proposal: ${removeTxpErr?.message}`,
            ),
          );
        }
        reject(err);
      }
    });
  };

export const publishAndSignMultipleProposals =
  ({
    txps,
    key,
    wallet,
    recipient,
  }: {
    txps: TransactionProposal[];
    key: Key;
    wallet: Wallet;
    recipient?: Recipient;
  }): Effect<Promise<(Partial<TransactionProposal> | void)[]>> =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const signingMultipleProposals = true;
        let password: string;
        const {
          APP: {biometricLockActive},
        } = getState();

        if (biometricLockActive) {
          try {
            await dispatch(checkBiometricForSending());
          } catch (error) {
            return reject(error);
          }
        }
        if (key.isPrivKeyEncrypted) {
          try {
            password = await new Promise<string>(async (_resolve, _reject) => {
              dispatch(dismissOnGoingProcessModal()); // dismiss any previous modal
              await sleep(500);
              dispatch(
                showDecryptPasswordModal({
                  onSubmitHandler: async (_password: string) => {
                    dispatch(dismissDecryptPasswordModal());
                    await sleep(500);
                    checkEncryptPassword(key, _password)
                      ? _resolve(_password)
                      : _reject('invalid password');
                  },
                  onCancelHandler: () => {
                    _reject('password canceled');
                  },
                }),
              );
            });
          } catch (error) {
            return reject(error);
          }
        }
        const promises: Promise<Partial<TransactionProposal> | void>[] = [];

        txps.forEach(async txp => {
          promises.push(
            dispatch(
              publishAndSign({
                txp,
                key,
                wallet,
                recipient,
                password,
                signingMultipleProposals,
              }),
            ).catch(err => {
              const errorStr =
                err instanceof Error ? err.message : JSON.stringify(err);
              dispatch(
                LogActions.error(
                  `Error signing transaction proposal: ${errorStr}`,
                ),
              );
              return err;
            }),
          );
        });
        return resolve(await Promise.all(promises));
      } catch (err) {
        const errorStr =
          err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(
          LogActions.error(`Error signing transaction proposal: ${errorStr}`),
        );
        return reject(err);
      }
    });
  };

export const createTxProposal = (
  wallet: Wallet,
  txp: Partial<TransactionProposal>,
): Promise<TransactionProposal> => {
  return new Promise((resolve, reject) => {
    wallet.createTxProposal(
      txp,
      (err: Error, createdTxp: TransactionProposal) => {
        if (err) {
          return reject(err);
        }
        return resolve(createdTxp);
      },
      null,
    );
  });
};

export const publishTx = (
  wallet: Wallet,
  txp: any,
): Promise<Partial<TransactionProposal>> => {
  return new Promise((resolve, reject) => {
    wallet.publishTxProposal({txp}, (err: Error, publishedProposal: any) => {
      if (err) {
        return reject(err);
      }
      resolve(publishedProposal);
    });
  });
};

export const signTx = (
  wallet: Wallet,
  key: Key,
  txp: any,
  password?: string,
): Promise<Partial<TransactionProposal>> => {
  return new Promise(async (resolve, reject) => {
    try {
      const rootPath = wallet.getRootPath();
      const signatures = key.methods!.sign(rootPath, txp, password);
      wallet.pushSignatures(
        txp,
        signatures,
        (err: Error, signedTxp: any) => {
          if (err) {
            reject(err);
          }
          resolve(signedTxp);
        },
        null,
      );
    } catch (err) {
      reject(err);
    }
  });
};

export const broadcastTx = (
  wallet: Wallet,
  txp: TransactionProposal,
): Promise<Partial<TransactionProposal>> => {
  return new Promise(async (resolve, reject) => {
    wallet.broadcastTxProposal(txp, (err: Error, broadcastedTxp: any) => {
      if (err) {
        return reject(err);
      }
      resolve(broadcastedTxp);
    });
  });
};

export const removeTxp = (wallet: Wallet, txp: TransactionProposal) => {
  return new Promise<void>((resolve, reject) => {
    wallet.removeTxProposal(txp, (err: Error) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};

export const handleCreateTxProposalError =
  (proposalErrorProps: ProposalErrorHandlerProps): Effect<Promise<any>> =>
  async dispatch => {
    try {
      const {err} = proposalErrorProps;

      switch (getErrorName(err)) {
        case 'INSUFFICIENT_FUNDS':
          const {tx, txp, getState} = proposalErrorProps;

          if (!tx || !txp || !getState) {
            return GeneralError();
          }

          const {wallet, amount} = tx;
          const {feeLevel} = txp;

          const feeRatePerKb = await getFeeRatePerKb({
            wallet,
            feeLevel: feeLevel || FeeLevels.NORMAL,
          });

          if (
            !getState().WALLET.useUnconfirmedFunds &&
            wallet.balance.sat >=
              dispatch(
                ParseAmount(
                  amount,
                  wallet.currencyAbbreviation,
                  wallet.chain,
                  wallet.tokenAddress,
                ),
              ).amountSat +
                feeRatePerKb
          ) {
            return CustomErrorMessage({
              title: t('Insufficient confirmed funds'),
              errMsg: t(
                'You do not have enough confirmed funds to make this payment. Wait for your pending transactions to confirm or enable "Use unconfirmed funds" in Advanced Settings.',
              ),
            });
          } else {
            return CustomErrorMessage({
              title: t('Insufficient funds'),
              errMsg: BWCErrorMessage(err),
            });
          }

        default:
          return CustomErrorMessage({
            title: t('Error'),
            errMsg: BWCErrorMessage(err),
          });
      }
    } catch (err2) {
      return GeneralError();
    }
  };

export const createPayProTxProposal =
  async ({
    wallet,
    paymentUrl,
    payProOptions,
    invoice,
    invoiceID,
    customData,
    message,
  }: {
    wallet: Wallet;
    paymentUrl: string;
    payProOptions?: PayProOptions;
    invoice?: Invoice;
    invoiceID?: string;
    customData?: CustomTransactionData;
    message?: string;
  }): Promise<Effect<Promise<any>>> =>
  async dispatch => {
    const payProDetails = await dispatch(
      GetPayProDetails({
        paymentUrl,
        coin: wallet!.currencyAbbreviation,
        chain: wallet!.chain,
      }),
    );
    const confirmScreenParams = await dispatch(
      HandlePayPro({
        payProDetails,
        payProOptions,
        url: paymentUrl,
        coin: wallet!.currencyAbbreviation,
        chain: wallet!.chain,
      }),
    );
    const {
      toAddress: address,
      requiredFeeRate: feePerKb,
      data,
      gasLimit,
      description,
      amount,
    } = confirmScreenParams!;
    const {unitToSatoshi} = dispatch(
      GetPrecision(
        wallet.currencyAbbreviation,
        wallet.chain,
        wallet.tokenAddress,
      ),
    ) || {
      unitToSatoshi: 100000000,
    };
    return await dispatch(
      createProposalAndBuildTxDetails({
        context: 'paypro',
        invoice,
        invoiceID,
        wallet,
        ...(feePerKb && {feePerKb}),
        payProUrl: paymentUrl,
        payProDetails,
        recipient: {address},
        gasLimit,
        data,
        amount: amount / unitToSatoshi,
        ...(customData && {customData}),
        message: message || description,
      }),
    );
  };

export const getSendMaxInfo = ({
  wallet,
  opts,
}: {
  wallet: Wallet;
  opts?: {
    feePerKb?: number;
    excludeUnconfirmedUtxos?: boolean;
    returnInputs?: boolean;
  };
}): Promise<SendMaxInfo> => {
  return new Promise((resolve, reject) => {
    wallet.getSendMaxInfo(opts, (err: Error, sendMaxInfo: SendMaxInfo) => {
      if (err) {
        return reject(err);
      }
      resolve(sendMaxInfo);
    });
  });
};

export const buildEthERCTokenSpeedupTx =
  (wallet: Wallet, transaction: any): Effect<Promise<any>> =>
  dispatch => {
    return new Promise((resolve, reject) => {
      try {
        const {
          currencyAbbreviation,
          network,
          chain,
          credentials: {walletName, walletId},
          keyId,
          tokenAddress,
        } = wallet;

        const {customData, addressTo, nonce, data, gasLimit} = transaction;
        const amount = Number(
          dispatch(
            FormatAmount(
              currencyAbbreviation,
              chain,
              tokenAddress,
              transaction.amount,
            ),
          ),
        );
        const recipient = {
          type: 'wallet',
          name: customData ? customData.toWalletName : walletName,
          walletId,
          keyId,
          address: addressTo,
          chain,
        };

        return resolve({
          wallet,
          amount,
          recipient,
          network,
          currency: currencyAbbreviation,
          toAddress: addressTo,
          nonce,
          data,
          gasLimit,
          customData,
          feeLevel: 'urgent',
          context: 'speedupEth' as TransactionOptionsContext,
        });
      } catch (e) {
        return reject(e);
      }
    });
  };

export const buildBtcSpeedupTx =
  (wallet: Wallet, tx: any, address: string): Effect<Promise<any>> =>
  dispatch => {
    return new Promise(async (resolve, reject) => {
      try {
        const {data, customData, txid, size} = tx;

        const {
          currencyAbbreviation,
          network,
          credentials: {walletName, walletId},
          keyId,
        } = wallet;

        const recipient = {
          type: 'wallet',
          name: walletName,
          walletId,
          keyId,
          address,
        };
        const fee = await GetBitcoinSpeedUpTxFee(wallet, size);
        const input = await GetInput(wallet, txid);
        const inputs = [];
        inputs.push(input);
        const {satoshis} = input || {satoshis: 0};
        let amount = satoshis - fee;

        if (amount < 0) {
          return reject('InsufficientFunds');
        }

        if (!input) {
          return reject('NoInput');
        }

        const {unitToSatoshi} = dispatch(
          GetPrecision('btc', 'btc', undefined),
        ) || {
          unitToSatoshi: 100000000,
        };

        amount = amount / unitToSatoshi;

        return resolve({
          wallet,
          data,
          customData,
          name: walletName,
          toAddress: address,
          network,
          currency: currencyAbbreviation,
          amount,
          recipient,
          inputs,
          speedupFee: fee / unitToSatoshi,
          fee,
          context: 'speedupBtcReceive' as TransactionOptionsContext,
        });
      } catch (e) {
        return reject(e);
      }
    });
  };

export const getTx = (wallet: Wallet, txpid: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    wallet.getTx(txpid, (err: any, txp: Partial<TransactionProposal>) => {
      if (err) {
        return reject(err);
      }
      return resolve(txp);
    });
  });
};

export const showNoWalletsModal =
  ({navigation}: {navigation: any}): Effect<void> =>
  async dispatch => {
    dispatch(
      showBottomNotificationModal({
        type: 'info',
        title: t('No compatible wallets'),
        message: t(
          "You currently don't have any wallets capable of sending this payment. Would you like to import one?",
        ),
        enableBackdropDismiss: false,
        actions: [
          {
            text: t('Import Wallet'),
            action: () => {
              dispatch(dismissBottomNotificationModal());
              navigation.dispatch(
                CommonActions.reset({
                  index: 2,
                  routes: [
                    {
                      name: 'Tabs',
                      params: {screen: 'Home'},
                    },
                    {
                      name: 'Wallet',
                      params: {
                        screen: 'CreationOptions',
                      },
                    },
                  ],
                }),
              );
            },
            primary: true,
          },
          {
            text: t('Maybe Later'),
            action: () => {
              dispatch(dismissBottomNotificationModal());
              while (navigation.canGoBack()) {
                navigation.goBack();
              }
            },
            primary: false,
          },
        ],
      }),
    );
  };

export const checkBiometricForSending =
  (): Effect<Promise<any>> => async dispatch => {
    // preventing for asking biometric again when the app goes to background ( ios only )
    if (Platform.OS === 'ios') {
      dispatch(checkingBiometricForSending(true));
    }
    return TouchID.authenticate(
      'Authentication Check',
      authOptionalConfigObject,
    )
      .then(success => {
        if (success) {
          return Promise.resolve();
        } else {
          return Promise.reject('biometric check failed');
        }
      })
      .catch(error => {
        if (error.code && TO_HANDLE_ERRORS[error.code]) {
          const err = TO_HANDLE_ERRORS[error.code];
          dispatch(
            showBottomNotificationModal(BiometricErrorNotification(err)),
          );
        }
        return Promise.reject('biometric check failed');
      });
  };

export const sendCrypto =
  (loggerContext: string): Effect<void> =>
  (dispatch, getState) => {
    const keys = getState().WALLET.keys;
    const walletsWithBalance = Object.values(keys)
      .filter(key => key.backupComplete)
      .flatMap(key => key.wallets)
      .filter(wallet => !wallet.hideWallet && wallet.isComplete())
      .filter(wallet => wallet.balance.sat > 0);

    if (!walletsWithBalance.length) {
      dispatch(
        showBottomNotificationModal({
          type: 'warning',
          title: t('No funds available'),
          message: t('You do not have any funds to send.'),
          enableBackdropDismiss: true,
          actions: [
            {
              text: t('Add funds'),
              action: () => {
                dispatch(
                  Analytics.track('Clicked Buy Crypto', {
                    context: 'HomeRoot',
                  }),
                );
                navigationRef.navigate('Wallet', {
                  screen: WalletScreens.AMOUNT,
                  params: {
                    onAmountSelected: (amount: string) => {
                      navigationRef.navigate('BuyCrypto', {
                        screen: 'BuyCryptoRoot',
                        params: {
                          amount: Number(amount),
                        },
                      });
                    },
                    context: 'buyCrypto',
                  },
                });
              },
              primary: true,
            },
            {
              text: t('Got It'),
              action: () => null,
              primary: false,
            },
          ],
        }),
      );
    } else {
      dispatch(
        Analytics.track('Clicked Send', {
          context: loggerContext,
        }),
      );
      navigationRef.navigate('Wallet', {
        screen: 'GlobalSelect',
        params: {context: 'send'},
      });
    }
  };

export const receiveCrypto =
  (navigation: NavigationProp<any>, loggerContext: string): Effect<void> =>
  (dispatch, getState) => {
    const keys = getState().WALLET.keys;
    if (Object.keys(keys).length === 0) {
      dispatch(
        showBottomNotificationModal({
          type: 'warning',
          title: t("Let's create a key"),
          message: t(
            'To start using the app, you need to have a key. You can create or import a key.',
          ),
          enableBackdropDismiss: true,
          actions: [
            {
              text: t('Got It'),
              action: () => null,
              primary: false,
            },
          ],
        }),
      );
    } else {
      const needsBackup = !Object.values(keys).filter(key => key.backupComplete)
        .length;
      if (needsBackup) {
        dispatch(
          showBottomNotificationModal(
            keyBackupRequired(Object.values(keys)[0], navigation, dispatch),
          ),
        );
      } else {
        dispatch(
          Analytics.track('Clicked Receive', {
            context: loggerContext,
          }),
        );
        navigationRef.navigate('Wallet', {
          screen: 'GlobalSelect',
          params: {context: 'receive'},
        });
      }
    }
  };

export const showConfirmAmountInfoSheet =
  (type: 'total' | 'subtotal'): Effect<void> =>
  dispatch => {
    let title: string, message: string, readMoreUrl: string;

    switch (type) {
      case 'total':
        title = t('Total');
        message = t(
          'The total amount is the subtotal amount plus transaction fees.',
        );
        readMoreUrl = URL.HELP_MINER_FEES;
        break;
      case 'subtotal':
        title = t('Subtotal');
        message = t(
          'For BitPay invoices the subtotal amount is the product or service amount plus network costs.',
        );
        readMoreUrl = URL.HELP_PAYPRO_NETWORK_COST;
        break;
      default:
        return;
    }

    dispatch(
      AppActions.showBottomNotificationModal({
        type: 'info',
        title,
        message,
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('Read more'),
            action: async () => {
              await sleep(1000);
              dispatch(openUrlWithInAppBrowser(readMoreUrl));
            },
            primary: true,
          },
          {
            text: t('GOT IT'),
            action: () => {},
          },
        ],
      }),
    );
  };
