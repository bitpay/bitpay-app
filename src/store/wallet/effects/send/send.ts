import AppBtc from '@ledgerhq/hw-app-btc';
import AppEth from '@ledgerhq/hw-app-eth';
import {Transaction} from '@ledgerhq/hw-app-btc/lib/types';
import {CreateTransactionArg} from '@ledgerhq/hw-app-btc/lib/createTransaction';
import {serializeTransactionOutputs} from '@ledgerhq/hw-app-btc/lib/serializeTransaction';
import {splitTransaction} from '@ledgerhq/hw-app-btc/lib/splitTransaction';
import ledgerService from '@ledgerhq/hw-app-eth/lib/services/ledger';
import {BufferReader} from '@ledgerhq/hw-app-btc/lib/buffertools';
import {encode} from 'ripple-binary-codec';
import Xrp from '@ledgerhq/hw-app-xrp';
import {Payment} from 'xrpl/src/models/transactions';
import Transport from '@ledgerhq/hw-transport';
import axios from 'axios';
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
  BitcoreUtxoTransactionLike,
  BitcoreEvmTransactionLike,
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
  formatCurrencyAbbreviation,
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
  WrongPasswordError,
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
import {RootStacks, navigationRef} from '../../../../Root';
import {WalletScreens} from '../../../../navigation/wallet/WalletGroup';
import {keyBackupRequired} from '../../../../navigation/tabs/home/components/Crypto';
import {Analytics} from '../../../analytics/analytics.effects';
import {AppActions} from '../../../app';
import {Network, URL} from '../../../../constants';
import {WCV2RequestType} from '../../../wallet-connect-v2/wallet-connect-v2.models';
import {WALLET_CONNECT_SUPPORTED_CHAINS} from '../../../../constants/WalletConnectV2';
import {TabsScreens} from '../../../../navigation/tabs/TabsStack';
import {SupportedTokenOptions} from '../../../../constants/SupportedCurrencyOptions';

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
          APP: {defaultAltCurrency},
          WALLET: {
            keys,
            feeLevel: cachedFeeLevel,
            useUnconfirmedFunds,
            queuedTransactions,
            enableReplaceByFee,
          },
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
          tx.enableRBF = tx.enableRBF ?? enableReplaceByFee;
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
              const txDetails = await dispatch(
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

export const getEstimateGas = (params: {
  wallet: Wallet;
  network: string;
  value: number;
  from: string;
  data: string;
  to: string;
  chain: string;
}): Promise<number> => {
  return new Promise((resolve, reject) => {
    params.wallet.getEstimateGas(params, (err: any, nonce: number) => {
      if (err) {
        return reject(err);
      }
      return resolve(nonce);
    });
  });
};

export const getInvoiceEffectiveRate =
  (
    invoice: Invoice,
    coin: string,
    chain: string,
    tokenAddress: string | undefined,
  ): Effect<number | undefined> =>
  dispatch => {
    const precision = dispatch(GetPrecision(coin, chain, tokenAddress));
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
  }): Effect<Promise<TxDetails>> =>
  async dispatch => {
    return new Promise(async resolve => {
      let gasPrice,
        gasLimit,
        nonce,
        destinationTag,
        coin,
        chain,
        amount,
        fee,
        tokenAddress;

      if (IsERCToken(wallet.currencyAbbreviation, wallet.chain)) {
        tokenAddress =
          wallet.tokenAddress || getTokenAddressForOffchainWallet(wallet);
      }

      if (context === 'walletConnect' && request) {
        const {params} = request.params.request;
        gasPrice = params[0].gasPrice
          ? parseInt(params[0]?.gasPrice, 16)
          : feePerKb!;
        nonce = params[0].nonce && parseInt(params[0]?.nonce, 16);
        coin = chain =
          WALLET_CONNECT_SUPPORTED_CHAINS[request.params.chainId]?.chain;
        amount = parseInt(params[0]?.value, 16) || 0;
        gasLimit =
          (params[0].gasLimit && parseInt(params[0]?.gasLimit, 16)) ||
          (params[0].gas && parseInt(params[0]?.gas, 16)) ||
          (await getEstimateGas({
            wallet: wallet as Wallet,
            network: wallet.network,
            value: amount,
            from: params[0].from,
            to: params[0].to,
            data: params[0].data,
            chain,
          }));
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

      const selectedTransactionCurrency = getCurrencyCodeFromCoinAndChain(
        wallet.currencyAbbreviation,
        wallet.chain,
      );

      const isOffChain = !proposal;
      if (invoice) {
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
      if (invoice && defaultAltCurrencyIsoCode === invoice.currency) {
        effectiveRate = dispatch(
          getInvoiceEffectiveRate(
            invoice,
            selectedTransactionCurrency,
            chain,
            tokenAddress,
          ),
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
      const tx = {
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
            cryptoAmount: dispatch(
              FormatAmountStr(chain, chain, undefined, fee),
            ),
            fiatAmount: formatFiatAmount(feeToFiat, defaultAltCurrencyIsoCode),
            percentageOfTotalAmountStr: `${percentageOfTotalAmount.toFixed(
              2,
            )}%`,
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
            : dispatch(
                FormatAmountStr(coin, chain, tokenAddress, amount + fee),
              ),
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
      return resolve(tx);
    });
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
  return `1 ${formatCurrencyAbbreviation(opts.coin)} @ ${formatFiatAmount(
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
    transport,
  }: {
    txp: Partial<TransactionProposal>;
    key: Key;
    wallet: Wallet;
    recipient: Recipient;

    /**
     * Transport for hardware wallet
     */
    transport?: Transport;
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
                  transport,
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
    transport,
    password,
    signingMultipleProposals,
  }: {
    txp: TransactionProposal;
    key: Key;
    wallet: Wallet;
    recipient?: Recipient;
    transport?: Transport;
    password?: string;
    signingMultipleProposals?: boolean; // when signing multiple proposals from a wallet we ask for decrypt password and biometric before
  }): Effect<Promise<Partial<TransactionProposal> | void>> =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      const {APP} = getState();

      if (APP.biometricLockActive && !signingMultipleProposals) {
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
        let publishedTx,
          broadcastedTx: Partial<TransactionProposal> | null = null;

        // Already published?
        if (txp.status !== 'pending') {
          publishedTx = await publishTx(wallet, txp);
          dispatch(LogActions.debug('success publish [publishAndSign]'));
        }

        if (key.isReadOnly && !key.hardwareSource) {
          // read only wallet
          return resolve(publishedTx);
        }

        let signedTx: TransactionProposal | null = null;

        if (key.hardwareSource) {
          if (!transport) {
            return reject(
              new Error('No transport provided for hardware signing.'),
            );
          }

          signedTx = await signTxWithHardwareWallet(
            transport,
            wallet,
            key,
            (publishedTx || txp) as TransactionProposal,
          );
        } else {
          signedTx = (await signTx(
            wallet,
            key,
            publishedTx || txp,
            password,
          )) as TransactionProposal;
        }

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
        let password: string | undefined;
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
        // Process transactions with a nonce sequentially
        const resultsWithNonce: (
          | Partial<TransactionProposal>
          | void
          | Error
        )[] = [];
        const evmTxsWithNonce = txps.filter(txp => txp.nonce !== undefined);
        evmTxsWithNonce.sort((a, b) => (a.nonce || 0) - (b.nonce || 0));
        for (const txp of evmTxsWithNonce) {
          try {
            const result = await dispatch(
              publishAndSign({
                txp,
                key,
                wallet,
                recipient,
                password,
                signingMultipleProposals,
              }),
            );
            resultsWithNonce.push(result);
          } catch (err) {
            const errorStr =
              err instanceof Error ? err.message : JSON.stringify(err);
            dispatch(
              LogActions.error(
                `Error signing transaction proposal: ${errorStr}`,
              ),
            );
            resultsWithNonce.push(err);
          }
        }

        // Process transactions without a nonce concurrently
        const withoutNonce = txps.filter(txp => txp.nonce === undefined);
        const promisesWithoutNonce: Promise<
          Partial<TransactionProposal> | void | Error
        >[] = withoutNonce.map(txp =>
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
        const resultsWithoutNonce = await Promise.all(promisesWithoutNonce);
        return resolve([...resultsWithNonce, ...resultsWithoutNonce]);
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

const _fetchTxMainnetCache: Record<string, string> = {};
const _fetchTxTestnetCache: Record<string, string> = {};
const _fetchTxCache = {
  [Network.mainnet]: _fetchTxMainnetCache,
  [Network.testnet]: _fetchTxTestnetCache,
};

/**
 * Fetch raw data for a BTC transaction by ID.
 *
 * @param txId
 * @param network
 * @returns transaction data as a hex string
 */
const fetchBtcTxById = async (
  txId: string,
  network: Network,
): Promise<string> => {
  if (_fetchTxCache[network][txId]) {
    return _fetchTxCache[network][txId];
  }

  let url = 'https://mempool.space';

  if (network === Network.testnet) {
    url += '/testnet';
  }

  url += `/api/tx/${txId}/hex`;

  const apiResponse = await axios.get<string>(url);
  const txDataHex = apiResponse.data;

  if (txDataHex) {
    _fetchTxCache[network][txId] = txDataHex;
  }

  return txDataHex;
};

const isString = (s: any): s is string => {
  return typeof s === 'string';
};

const createLedgerTransactionArgBtc = (
  wallet: Wallet,
  txp: TransactionProposal,
) => {
  return new Promise<CreateTransactionArg>(async (resolve, reject) => {
    const BWC = BwcProvider.getInstance();
    const utils = BWC.getUtils();

    const txpAsTx = utils.buildTx(txp) as BitcoreUtxoTransactionLike;
    const accountPath = wallet.hardwareData?.accountPath;
    const inputPaths = (txp.inputPaths || []).filter(isString);

    if (!accountPath) {
      return reject(new Error('No account path found for this wallet.'));
    }

    // BWS only returns inputPaths for addresses it knows about
    // We kick off a scan when we import the hardware wallet so it may not be complete yet
    if (!inputPaths.length) {
      return reject(
        new Error(
          'No input paths found. Start an address scan, if not already started, then try again later.',
        ),
      );
    }

    if (inputPaths.length !== txpAsTx.inputs.length) {
      return reject(
        new Error(
          'Not enough input paths found. Start an address scan, if not already started, then try again later.',
        ),
      );
    }

    // array of BIP 32 paths pointing to the path to the private key used for each UTXO
    const associatedKeysets: string[] = inputPaths.map(
      p => `${accountPath}/${p.replace('m/', '')}`,
    );

    try {
      // inputs is an array of <inputData> where <inputData> is itself an array of [inputTx, vout, redeemScript, sequence]
      // so it will end up being an array of arrays
      const inputs: CreateTransactionArg['inputs'] = await Promise.all(
        txpAsTx.inputs.map(async input => {
          // prevTxId is given in BigEndian format, no need to reverse
          const txId = input.prevTxId.toString('hex');
          const inputTxHex = await fetchBtcTxById(txId, txp.network);

          // TODO: safe to always set this to true?
          const isSegwitSupported = false;
          const hasTimestamp = false;
          const hasExtraData = false;
          const additionals: string[] | undefined = undefined;
          const inputTx = splitTransaction(
            inputTxHex,
            isSegwitSupported,
            hasTimestamp,
            hasExtraData,
            additionals,
          );

          const outputIndex = input.outputIndex;
          const redeemScript = undefined; // TODO: optional redeem script to use when consuming a segwit input
          const sequence = input.sequenceNumber;

          const inputData: CreateTransactionArg['inputs'][0] = [
            inputTx,
            outputIndex,
            redeemScript,
            sequence,
          ];

          return inputData;
        }),
      );

      const hasChange = typeof txpAsTx._changeIndex !== 'undefined';

      // optional BIP 32 path pointing to the path to the public key used to compute the change address
      const changePath = hasChange
        ? `${accountPath}/${txp.changeAddress.path.replace('m/', '')}`
        : undefined;

      // undefined will default to SIGHASH_ALL.
      // BWC currently uses undefined when signing UTXO tx so we do the same here
      const sigHashType = undefined;

      // TODO
      const segwit = false;

      const outputs = txpAsTx.outputs.map(output => {
        const amountBuf = Buffer.alloc(8);
        amountBuf.writeUInt32LE(output.satoshis);

        return {
          amount: amountBuf,
          script: output.script.toBuffer(),
        };
      });

      const outputScriptHex = serializeTransactionOutputs({
        outputs,
      } as Transaction).toString('hex');

      /**
       * TODO: add additionals
       * 'bech32' for spending native segwit outputs,
       * 'abc', for bch,
       * 'gold' for btg,
       * 'bipxxx' for using BIPxxx,
       * 'sapling' to indicate a zec transaction is supporting sapling
       */
      const additionals: string[] = [];

      const arg: CreateTransactionArg = {
        inputs,
        associatedKeysets,
        changePath,
        outputScriptHex,
        sigHashType,
        segwit,
        additionals,
      };

      return resolve(arg);
    } catch (err) {
      reject(err);
    }
  });
};

const getBtcSignaturesFromLedger = async (
  wallet: Wallet,
  txp: TransactionProposal,
  transport: Transport,
) => {
  const isTestnet = txp.network === Network.testnet;

  const btc = new AppBtc({
    transport,
    currency: isTestnet ? 'bitcoin_testnet' : 'bitcoin',
  });

  const arg = await createLedgerTransactionArgBtc(wallet, txp).catch(err => {
    const errMsg = err instanceof Error ? err.message : JSON.stringify(err);

    throw new Error(
      `Unable to create transaction argument for Ledger to sign: ${errMsg}`,
    );
  });

  // The Ledger HW BTC app returns the final signed tx
  // We just need the signatures so we patch the logic to store
  // the generated signatures in this array
  const extractedSignatures: Buffer[] = [];

  // @ts-ignore
  arg.patch_signatureArray = extractedSignatures;

  await btc.createPaymentTransaction(arg);

  // remove the sighashtype (last byte)
  const signatures = extractedSignatures.map(sigBuf => {
    const reader = new BufferReader(sigBuf);
    const signature = reader.readSlice(sigBuf.length - 1);

    return signature.toString('hex');
  });

  return signatures;
};

const getSignatureString = (signatureObject: {
  s: string;
  v: string;
  r: string;
}) => {
  // Assuming signatureObject = { s: string, v: string, r: string }
  let signature = '0x';
  // Ensure each part is a hexadecimal string. If they're not, you should convert them to hex.
  const r = signatureObject.r;
  const s = signatureObject.s;
  let v = signatureObject.v;

  // Depending on the implementation, 'v' might be a single character. If so, pad it to two characters.
  if (v.length < 2) {
    v = '0' + v;
  }

  // Concatenate r, s, and v to form the signature string
  signature += r + s + v;

  return signature;
};

const getEthSignaturesFromLedger = async (
  txp: TransactionProposal,
  transport: Transport,
) => {
  try {
    const BWC = BwcProvider.getInstance();
    const utils = BWC.getUtils();
    const txpAsTx = utils.buildTx(txp) as BitcoreEvmTransactionLike;
    const raw = txpAsTx.uncheckedSerialize()[0];
    var cleanedHexString = raw.replace(/^0x/, '');
    const resolution = await ledgerService.resolveTransaction(
      cleanedHexString,
      {},
      {},
    );
    const eth = new AppEth(transport);
    const signature = await eth.signTransaction(
      "44'/60'/0'/0/0",
      cleanedHexString,
      resolution,
    );
    const signatureHex = getSignatureString(signature);
    return [signatureHex];
  } catch (err) {
    throw new Error('Something went wrong signing the transaction: ' + err);
  }
};

const getXrpSignaturesFromLedger = async (
  wallet: Wallet,
  txp: TransactionProposal,
  transport: Transport,
) => {
  try {
    let transactionJSON: Payment = {
      TransactionType: 'Payment',
      Account: txp.from,
      Destination: txp.outputs[0].toAddress!,
      Amount: txp.amount.toString(),
      Fee: txp.fee.toString(),
      Flags: 2147483648,
      Sequence: txp.nonce,
      SigningPubKey: wallet.credentials.hardwareSourcePublicKey,
    };
    if (txp.destinationTag) {
      transactionJSON.DestinationTag = txp.destinationTag;
    }
    if (txp.invoiceID) {
      transactionJSON.InvoiceID = txp.invoiceID;
    }
    const xrp = new Xrp(transport);
    const transactionBlob = encode(transactionJSON);
    const signature = await xrp.signTransaction(
      "44'/144'/0'/0/0",
      transactionBlob,
    );
    return [signature];
  } catch (err) {
    throw new Error('Something went wrong signing the transaction: ' + err);
  }
};

const getSignaturesFromLedger = (
  transport: Transport,
  wallet: Wallet,
  txp: TransactionProposal,
) => {
  if (!transport) {
    throw new Error('Transport is required to get signatures from Ledger');
  }

  if (txp.coin === 'btc') {
    return getBtcSignaturesFromLedger(wallet, txp, transport);
  }

  if (txp.coin === 'eth' || IsERCToken(txp.coin, txp.chain)) {
    return getEthSignaturesFromLedger(txp, transport);
  }

  if (txp.coin === 'xrp') {
    return getXrpSignaturesFromLedger(wallet, txp, transport);
  }

  throw new Error('Unsupported currency: ' + txp.coin);
};

const getSignaturesFromHardwareWallet = (
  transport: Transport,
  wallet: Wallet,
  key: Key,
  txp: TransactionProposal,
) => {
  if (!wallet.isHardwareWallet) {
    return Promise.reject('Wallet is not associated with a hardware wallet');
  }

  if (key.hardwareSource === 'ledger') {
    return getSignaturesFromLedger(transport, wallet, txp);
  }

  return Promise.reject('Unsupported hardware wallet');
};

export const signTxWithHardwareWallet = async (
  transport: Transport,
  wallet: Wallet,
  key: Key,
  txp: TransactionProposal,
) => {
  let signatures: string[];

  try {
    signatures = await getSignaturesFromHardwareWallet(
      transport,
      wallet,
      key,
      txp,
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
    throw new Error(`Error getting signatures from hardware wallet: ${errMsg}`);
  }

  const signedTxp = await new Promise<TransactionProposal>(
    (resolve, reject) => {
      const debugBaseUrl = null;

      try {
        wallet.pushSignatures(
          txp,
          signatures,
          (err: any, result: TransactionProposal) => {
            if (err) {
              return reject(err);
            }

            resolve(result);
          },
          debugBaseUrl,
        );
      } catch (err) {
        reject(err);
      }
    },
  );

  return signedTxp;
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
                  index: 1,
                  routes: [
                    {
                      name: RootStacks.TABS,
                      params: {screen: TabsScreens.HOME},
                    },
                    {
                      name: WalletScreens.CREATION_OPTIONS,
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
      .then((success: any) => {
        if (success) {
          return Promise.resolve();
        } else {
          return Promise.reject('biometric check failed');
        }
      })
      .catch((error: any) => {
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
                navigationRef.navigate(WalletScreens.AMOUNT, {
                  onAmountSelected: (amount: string) => {
                    navigationRef.navigate('BuyCryptoRoot', {
                      amount: Number(amount),
                    });
                  },
                  context: 'buyCrypto',
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
      navigationRef.navigate('GlobalSelect', {context: 'send'});
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
        navigationRef.navigate('GlobalSelect', {context: 'receive'});
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

export const handleSendError =
  ({error, onDismiss}: {error: any; onDismiss?: () => {}}): Effect<boolean> =>
  dispatch => {
    switch (error) {
      case 'invalid password':
        dispatch(showBottomNotificationModal(WrongPasswordError()));
        return true;
      case 'password canceled':
      case 'biometric check failed':
        return true;
      default:
        const errorMessage = error?.message || error;
        dispatch(
          AppActions.showBottomNotificationModal(
            CustomErrorMessage({
              title: t('Error'),
              errMsg:
                typeof errorMessage === 'string'
                  ? errorMessage
                  : t('Could not send transaction'),
              action: () => onDismiss && onDismiss(),
            }),
          ),
        );
        return false;
    }
  };

function getTokenAddressForOffchainWallet(wallet: Wallet | WalletRowProps) {
  return SupportedTokenOptions.find(
    ({currencyAbbreviation}) =>
      currencyAbbreviation === wallet.currencyAbbreviation.toLowerCase(),
  )?.tokenAddress;
}
