import {Effect} from '../../../index';
import {
  CustomTransactionData,
  InvoiceCreationParams,
  Key,
  ProposalErrorHandlerProps,
  Rates,
  Recipient,
  TransactionOptions,
  TransactionProposal,
  TxDetails,
  Wallet,
} from '../../wallet.models';
import {FormatAmountStr, ParseAmount} from '../amount/amount';
import {FeeLevels, getFeeRatePerKb} from '../fee/fee';
import {
  formatCryptoAddress,
  formatFiatAmount,
} from '../../../../utils/helper-methods';
import {toFiat} from '../../utils/wallet';
import {startGetRates} from '../rates/rates';
import {waitForTargetAmountAndUpdateWallet} from '../balance/balance';
import {
  CustomErrorMessage,
  GeneralError,
} from '../../../../navigation/wallet/components/ErrorMessages';
import {BWCErrorMessage, getErrorName} from '../../../../constants/BWCError';
import {GiftCardInvoiceParams, Invoice} from '../../../shop/shop.models';
import {GetPayProDetails, HandlePayPro} from '../paypro/paypro';
import {APP_NETWORK, BASE_BITPAY_URLS} from '../../../../constants/config';
import {ShopEffects} from '../../../shop';
import {GetPrecision, IsUtxoCoin} from '../../utils/currency';

export const createProposalAndBuildTxDetails =
  (
    tx: TransactionOptions,
  ): Effect<
    Promise<{
      txDetails: TxDetails;
      txp: Partial<TransactionProposal>;
    }>
  > =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        // base tx
        const {
          wallet,
          recipient,
          amount,
          context,
          feeLevel,
          feePerKb,
          invoice,
          payProUrl,
          dryRun = true,
        } = tx;

        const {credentials, currencyAbbreviation} = wallet;
        const formattedAmount = ParseAmount(amount, currencyAbbreviation);
        const {
          WALLET: {feeLevel: _feeLevel, useUnconfirmedFunds},
        } = getState();

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
            feeLevel:
              feeLevel || _feeLevel[currencyAbbreviation] || FeeLevels.NORMAL,
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
              });
              resolve({txDetails, txp});
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
}: {
  proposal: TransactionProposal;
  rates: Rates;
  fiatCode: string;
  wallet: Wallet;
  recipient: Recipient;
  invoice?: Invoice;
}): TxDetails => {
  const {coin, feeLevel, fee, amount} = proposal;
  const networkCost = invoice?.minerFees[coin.toUpperCase()]?.totalFee;
  const total = amount + fee;
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
  };
};

/*
 * txp options object for wallet.createTxProposal
 * */
const buildTransactionProposal = (
  tx: Partial<TransactionOptions>,
): Promise<object> => {
  return new Promise(resolve => {
    const {currency, feeLevel, feePerKb, payProUrl} = tx;
    // base tx
    const txp: Partial<TransactionProposal> = {
      coin: currency,
      chain: currency?.toUpperCase(),
      feePerKb,
      ...(!feePerKb && {feeLevel}),
    };
    txp.invoiceID = tx.invoice?.id;
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
          amount: tx.amount,
          message: tx.description,
          data: tx.data,
          gasLimit: tx.gasLimit,
        });
        break;
      case 'selectInputs':
        break;
      default:
        txp.outputs.push({
          toAddress: tx.toAddress,
          amount: tx.amount,
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
  }): Effect =>
  async dispatch => {
    return new Promise(async (resolve, reject) => {
      try {
        wallet.createTxProposal(
          {...txp, dryRun: false},
          async (err: Error, proposal: TransactionProposal) => {
            if (err) {
              return reject(err);
            }

            const publishedTx = await publishTx(wallet, proposal);
            console.log('-------- published');

            const signedTx = await signTx(wallet, key, publishedTx);
            console.log('-------- signed');

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
            resolve();
          },
          null,
        );
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

export const signTx = (wallet: Wallet, key: Key, txp: any) => {
  return new Promise(async (resolve, reject) => {
    try {
      const rootPath = wallet.getRootPath();
      const signatures = key.methods.sign(rootPath, txp, undefined);
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

export const createPayProTxProposal = async (
  wallet: Wallet,
  paymentUrl: string,
  invoice: Invoice,
  customData?: CustomTransactionData,
) => {
  const payProDetails = await GetPayProDetails({
    paymentUrl,
    coin: wallet!.currencyAbbreviation,
  });
  const confirmScreenParams = await HandlePayPro(
    payProDetails,
    undefined,
    paymentUrl,
    wallet!.currencyAbbreviation,
  );
  const {toAddress: address, requiredFeeRate, amount} = confirmScreenParams!;
  const feePerKb = requiredFeeRate
    ? IsUtxoCoin(wallet.currencyAbbreviation)
      ? parseInt((requiredFeeRate * 1.1).toFixed(0), 10) // Workaround to avoid gas price supplied is lower than requested error
      : Math.ceil(requiredFeeRate * 1000)
    : undefined;
  const {unitToSatoshi} = GetPrecision(wallet.currencyAbbreviation) || {
    unitToSatoshi: 100000000,
  };
  return createProposalAndBuildTxDetails({
    context: 'paypro',
    invoice,
    wallet,
    ...(feePerKb && {feePerKb}),
    payProUrl: paymentUrl,
    recipient: {address},
    amount: amount / unitToSatoshi,
    ...(customData && {customData}),
  });
};

export const createInvoiceAndTxProposal =
  (
    wallet: Wallet,
    invoiceCreationParams: InvoiceCreationParams,
  ): Effect<
    Promise<{
      txDetails: TxDetails;
      txp: Partial<TransactionProposal>;
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
          discounts: [],
          transactionCurrency: wallet.currencyAbbreviation.toUpperCase(),
        };
        const cardOrder = await dispatch(
          ShopEffects.startCreateGiftCardInvoice(invoiceParams),
        );
        if (!cardOrder) {
          return;
        }
        const {invoiceId, invoice} = cardOrder;
        const baseUrl = BASE_BITPAY_URLS[APP_NETWORK];
        const paymentUrl = `${baseUrl}/i/${invoiceId}`;
        resolve(
          await dispatch(
            await createPayProTxProposal(wallet, paymentUrl, invoice, {
              giftCardName: cardConfig.name,
              service: 'giftcards',
            }),
          ),
        );
      } catch (err) {
        reject({err});
      }
    });
  };
