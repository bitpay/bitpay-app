import {Effect} from '../../../index';
import {
  CustomTransactionData,
  InvoiceCreationParams,
  Key,
  ProposalErrorHandlerProps,
  Rates,
  Recipient,
  TransactionOptions,
  SendMaxInfo,
  TransactionProposal,
  TxDetails,
  Wallet,
  TransactionOptionsContext,
} from '../../wallet.models';
import {FormatAmount, FormatAmountStr, ParseAmount} from '../amount/amount';
import {FeeLevels, GetBitcoinSpeedUpTxFee, getFeeRatePerKb} from '../fee/fee';
import {GetInput} from '../transactions/transactions';
import {
  formatCryptoAddress,
  formatFiatAmount,
  sleep,
} from '../../../../utils/helper-methods';
import {toFiat, checkEncryptPassword} from '../../utils/wallet';
import {startGetRates} from '../rates/rates';
import {waitForTargetAmountAndUpdateWallet} from '../status/status';
import {
  CustomErrorMessage,
  GeneralError,
} from '../../../../navigation/wallet/components/ErrorMessages';
import {BWCErrorMessage, getErrorName} from '../../../../constants/BWCError';
import {GiftCardInvoiceParams, Invoice} from '../../../shop/shop.models';
import {GetPayProDetails, HandlePayPro, PayProOptions} from '../paypro/paypro';
import {APP_NETWORK, BASE_BITPAY_URLS} from '../../../../constants/config';
import {ShopEffects} from '../../../shop';
import {
  dismissDecryptPasswordModal,
  showDecryptPasswordModal,
} from '../../../app/app.actions';
import {GetPrecision, GetChain} from '../../utils/currency';

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
        } = tx;

        const {credentials, currencyAbbreviation} = wallet;
        const formattedAmount = ParseAmount(amount, currencyAbbreviation);
        const {
          WALLET: {feeLevel: cachedFeeLevel, useUnconfirmedFunds},
        } = getState();
        const feeLevel =
          customFeeLevel ||
          cachedFeeLevel[currencyAbbreviation] ||
          FeeLevels.NORMAL;

        if (!feePerKb && tx.sendMax) {
          feePerKb = await getFeeRatePerKb({
            wallet,
            feeLevel: feeLevel,
          });
        }

        // build transaction proposal options then create full proposal
        const txp = {
          ...(await buildTransactionProposal({
            ...tx,
            context,
            currency: currencyAbbreviation,
            toAddress: recipient.address,
            amount: formattedAmount.amountSat,
            network: credentials.network,
            payProUrl,
            feePerKb,
            feeLevel,
            useUnconfirmedFunds,
          })),
          dryRun,
        } as Partial<TransactionProposal>;

        wallet.createTxProposal(
          txp,
          async (err: Error, proposal: TransactionProposal) => {
            if (err) {
              return reject({err, tx, txp, getState});
            }
            try {
              const rates = await dispatch(startGetRates());
              // building UI object for details
              const txDetails = buildTxDetails({
                proposal,
                rates,
                fiatCode: 'USD',
                wallet,
                recipient,
                invoice,
                context,
              });
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

/*
 * UI formatted details for confirm view
 * */
const buildTxDetails = ({
  proposal,
  rates,
  fiatCode,
  wallet,
  recipient,
  invoice,
  context,
}: {
  proposal: TransactionProposal;
  rates: Rates;
  fiatCode: string;
  wallet: Wallet;
  recipient: Recipient;
  invoice?: Invoice;
  context?: TransactionOptionsContext;
}): TxDetails => {
  const {coin, fee, gasPrice, gasLimit, nonce, feeLevel = 'custom'} = proposal;
  let {amount} = proposal;
  const networkCost = invoice?.minerFees[coin.toUpperCase()]?.totalFee;
  const total = amount + fee;

  if (context === 'fromReplaceByFee') {
    amount = amount - fee;
  }

  const {type, name, address} = recipient;
  return {
    currency: coin,
    sendingTo: {
      recipientType: type,
      recipientName: name,
      recipientAddress: formatCryptoAddress(address),
      img: wallet.img,
    },
    fee: {
      feeLevel,
      cryptoAmount: FormatAmountStr(coin, fee),
      fiatAmount: formatFiatAmount(
        toFiat(fee, fiatCode, coin, rates),
        fiatCode,
      ),
      percentageOfTotalAmount: ((fee / (amount + fee)) * 100).toFixed(2) + '%',
    },
    ...(networkCost && {
      networkCost: {
        cryptoAmount: FormatAmountStr(coin, networkCost),
        fiatAmount: formatFiatAmount(
          toFiat(networkCost, fiatCode, coin, rates),
          fiatCode,
        ),
      },
    }),
    sendingFrom: {
      walletName: wallet.walletName || wallet.credentials.walletName,
      img: wallet.img,
    },
    subTotal: {
      cryptoAmount: FormatAmountStr(coin, amount),
      fiatAmount: formatFiatAmount(
        toFiat(amount, fiatCode, coin, rates),
        fiatCode,
      ),
    },
    total: {
      cryptoAmount: FormatAmountStr(coin, total),
      fiatAmount: formatFiatAmount(
        toFiat(total, fiatCode, coin, rates),
        fiatCode,
      ),
    },
    gasPrice: gasPrice ? Number((gasPrice * 1e-9).toFixed(2)) : undefined,
    gasLimit,
    nonce,
  };
};

/*
 * txp options object for wallet.createTxProposal
 * */
const buildTransactionProposal = (
  tx: Partial<TransactionOptions>,
): Promise<object> => {
  return new Promise(async resolve => {
    const {
      currency,
      customData,
      feeLevel,
      feePerKb,
      invoiceID,
      message,
      payProUrl,
      sendMax,
      wallet,
    } = tx;
    // base tx
    const txp: Partial<TransactionProposal> = {
      coin: currency,
      chain: GetChain(currency!).toLowerCase(),
      customData,
      feePerKb,
      ...(!feePerKb && {feeLevel}),
      invoiceID,
      message,
    };
    // currency specific
    switch (currency) {
      case 'btc':
        txp.enableRBF = tx.enableRBF;
        txp.replaceTxByFee = tx.replaceTxByFee;
        break;
      case 'eth':
        txp.from = tx.from;
        txp.nonce = tx.nonce;
        txp.tokenAddress = tx.tokenAddress;
        txp.multisigContractAddress = tx.multisigContractAddress;
        break;
      case 'xrp':
        txp.destinationTag = tx.destinationTag;
        break;
    }

    // send max
    if (sendMax && wallet) {
      const {amount, inputs, fee} = await getSendMaxInfo({
        wallet,
        opts: {feePerKb, excludeUnconfirmedUtxos: true, returnInputs: true},
      });

      txp.amount = tx.amount = amount;
      txp.inputs = inputs;
      // Either fee or feePerKb can be available
      txp.fee = fee;
      txp.feePerKb = undefined;
    }

    // unconfirmed funds
    txp.excludeUnconfirmedUtxos = !tx.useUnconfirmedFunds;

    const {context} = tx;
    // outputs
    txp.outputs = [];
    switch (context) {
      case 'multisend':
        break;
      case 'paypro':
        txp.payProUrl = payProUrl;
        txp.outputs.push({
          toAddress: tx.toAddress,
          amount: tx.amount!,
          message: tx.message,
          data: tx.data,
          gasLimit: tx.gasLimit,
        });
        break;
      case 'selectInputs':
        break;
      case 'fromReplaceByFee':
        txp.inputs = tx.inputs;
        txp.replaceTxByFee = true;

        txp.outputs.push({
          toAddress: tx.toAddress,
          amount: tx.amount,
          message: tx.description,
          data: tx.data,
        });
        break;
      case 'speedupBtcReceive':
        txp.inputs = tx.inputs;
        txp.excludeUnconfirmedUtxos = true;
        txp.fee = tx.fee;
        txp.feeLevel = undefined;

        txp.outputs.push({
          toAddress: tx.toAddress,
          amount: tx.amount,
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

    resolve(txp);
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
              try {
                await removeTxp(wallet, proposal);
              } catch (removeTxpErr) {
                console.log('Could not delete payment proposal');
              }
              return reject(e);
            }
          },
          null,
        );
      } catch (err) {
        console.log(err);
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
  }: {
    txp: Partial<TransactionProposal>;
    key: Key;
    wallet: Wallet;
    recipient?: Recipient;
  }): Effect =>
  async dispatch => {
    return new Promise(async (resolve, reject) => {
      let password;
      if (key.isPrivKeyEncrypted) {
        try {
          password = await new Promise<string>((_resolve, _reject) => {
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

      let broadcastedTx;
      try {
        let publishedTx;

        // Already published?
        if (txp.status !== 'pending') {
          publishedTx = await publishTx(wallet, txp);
          console.log('-------- published');
        }

        const signedTx: any = await signTx(
          wallet,
          key,
          publishedTx || txp,
          password,
        );
        console.log('-------- signed');

        if (signedTx.status === 'accepted') {
          const broadcastedTx = await broadcastTx(wallet, signedTx);
          console.log('-------- broadcastedTx');

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
        }
        resolve(broadcastedTx);
      } catch (err) {
        console.log(err);
        reject(err);
      }
    });
  };

export const publishTx = (wallet: Wallet, txp: any) => {
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
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const rootPath = wallet.getRootPath();
      const signatures = key.methods.sign(rootPath, txp, password);
      wallet.pushSignatures(
        txp,
        signatures,
        (err: Error, signedTxp: any) => {
          if (err) {
            throw err;
          }
          resolve(signedTxp);
        },
        null,
      );
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
};

export const broadcastTx = (wallet: Wallet, txp: any) => {
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

export const handleCreateTxProposalError = async (
  proposalErrorProps: ProposalErrorHandlerProps,
) => {
  try {
    const {err} = proposalErrorProps;

    switch (getErrorName(err)) {
      case 'INSUFFICIENT_FUNDS':
        const {tx, txp, getState} = proposalErrorProps;

        if (!tx || !txp || !getState) {
          return GeneralError;
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
            ParseAmount(amount, wallet.currencyAbbreviation).amountSat +
              feeRatePerKb
        ) {
          return CustomErrorMessage({
            title: 'Insufficient confirmed funds',
            errMsg:
              'You do not have enough confirmed funds to make this payment. Wait for your pending transactions to confirm or enable "Use unconfirmed funds" in Advanced Settings.',
          });
        } else {
          return CustomErrorMessage({
            title: 'Insufficient funds',
            errMsg: BWCErrorMessage(err),
          });
        }

      default:
        return CustomErrorMessage({
          title: 'Error',
          errMsg: BWCErrorMessage(err),
        });
    }
  } catch (err2) {
    return GeneralError;
  }
};

export const createPayProTxProposal = async ({
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
}) => {
  const payProDetails = await GetPayProDetails({
    paymentUrl,
    coin: wallet!.currencyAbbreviation,
  });
  const confirmScreenParams = await HandlePayPro({
    payProDetails,
    payProOptions,
    url: paymentUrl,
    coin: wallet!.currencyAbbreviation,
  });
  const {
    toAddress: address,
    requiredFeeRate: feePerKb,
    data,
    gasLimit,
    description,
    amount,
  } = confirmScreenParams!;
  const {unitToSatoshi} = GetPrecision(wallet.currencyAbbreviation) || {
    unitToSatoshi: 100000000,
  };
  return createProposalAndBuildTxDetails({
    context: 'paypro',
    invoice,
    invoiceID,
    wallet,
    ...(feePerKb && {feePerKb}),
    payProUrl: paymentUrl,
    recipient: {address},
    gasLimit,
    data,
    amount: amount / unitToSatoshi,
    ...(customData && {customData}),
    message: message || description,
  });
};

export const createInvoiceAndTxProposal =
  (
    wallet: Wallet,
    invoiceCreationParams: InvoiceCreationParams,
  ): Effect<
    Promise<{
      txDetails: TxDetails;
      txp: TransactionProposal;
    }>
  > =>
  async dispatch => {
    return new Promise(async (resolve, reject) => {
      try {
        const {cardConfig, amount} = invoiceCreationParams!;
        if (!cardConfig) {
          return;
        }
        const invoiceParams: GiftCardInvoiceParams = {
          amount: amount,
          brand: cardConfig.name,
          currency: cardConfig.currency,
          clientId: wallet!.id,
          discounts: invoiceCreationParams.discounts?.map(d => d.code) || [],
          transactionCurrency: wallet.currencyAbbreviation.toUpperCase(),
        };
        const cardOrder = await dispatch(
          ShopEffects.startCreateGiftCardInvoice(cardConfig, invoiceParams),
        );
        const {invoiceId, invoice} = cardOrder;
        const baseUrl = BASE_BITPAY_URLS[APP_NETWORK];
        const paymentUrl = `${baseUrl}/i/${invoiceId}`;
        resolve(
          await dispatch(
            await createPayProTxProposal({
              wallet,
              paymentUrl,
              invoice,
              invoiceID: invoiceId,
              message: `${formatFiatAmount(
                invoiceParams.amount,
                cardConfig.currency,
              )} Gift Card`,
              customData: {
                giftCardName: cardConfig.name,
                service: 'giftcards',
              },
            }),
          ),
        );
      } catch (err) {
        reject(err);
      }
    });
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

export const buildEthERCTokenSpeedupTx = (
  wallet: Wallet,
  transaction: any,
): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const {
        credentials: {coin, walletName, walletId, network},
        keyId,
      } = wallet;

      const {customData, addressTo, nonce, data, gasLimit} = transaction;
      const amount = Number(FormatAmount(coin, transaction.amount));
      const recipient = {
        type: 'wallet',
        name: customData ? customData.toWalletName : walletName,
        walletId,
        keyId,
        address: addressTo,
      };

      return resolve({
        wallet,
        amount,
        recipient,
        network,
        currency: coin,
        toAddress: addressTo,
        nonce,
        data,
        gasLimit,
        customData,
        feeLevel: 'urgent',
      });
    } catch (e) {
      return reject(e);
    }
  });
};

export const buildBtcSpeedupTx = (wallet: Wallet, tx: any, address: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      const {data, customData, txid, size} = tx;

      const {
        credentials: {coin, walletName, walletId, network},
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

      const {unitToSatoshi} = GetPrecision('btc') || {
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
        currency: coin,
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
