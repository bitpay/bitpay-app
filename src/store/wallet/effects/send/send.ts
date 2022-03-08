import {Effect} from '../../../index';
import {
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
import {formatCryptoAddress, formatFiatAmount} from '../../../../utils/helper-methods';
import {toFiat} from '../../utils/wallet';
import {startGetRates} from '../rates/rates';
import {waitForTargetAmountAndUpdateWallet} from '../balance/balance';
import {
  CustomErrorMessage,
  GeneralError,
} from '../../../../navigation/wallet/components/ErrorMessages';
import {BWCErrorMessage, getErrorName} from '../../../../constants/BWCError';

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
              });
              resolve({txDetails, txp});
            } catch (err) {
              reject({err});
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
}: {
  proposal: TransactionProposal;
  rates: Rates;
  fiatCode: string;
  wallet: Wallet;
  recipient: Recipient;
}): TxDetails => {
  const {coin, feeLevel, fee, amount} = proposal;
  const total = amount + fee;
  const {type, name, address} = recipient;
  return {
    currency: coin,
    sendingTo: {
      recipientType: type,
      recipientName: name,
      recipientAddress: formatCryptoAddress(address),
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
    sendingFrom: {
      walletName: wallet.walletName || wallet.credentials.walletName,
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
  return new Promise((resolve, reject) => {
    const {currency, feeLevel} = tx;
    // base tx
    const txp: Partial<TransactionProposal> = {
      coin: currency,
      chain: currency?.toUpperCase(),
      feeLevel,
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
        txp.invoiceID = tx.invoiceID;
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
