import {t} from 'i18next';

export const getErrorName = (err: Error) =>
  err.name
    ? err.name === 'Error'
      ? err.message
      : err.name.replace(/^bwc.Error/g, '')
    : err;

const _getErrorMessage = (err: Error) => {
  const errorName = getErrorName(err);
  switch (errorName) {
    case 'INPUT_NOT_FOUND':
      return t(
        "We could not find one or more inputs for your transaction on the blockchain. Make sure you're not trying to use unconfirmed change",
      );
    case 'UNCONFIRMED_INPUTS_NOT_ACCEPTED':
      return t('This invoice does not accept unconfirmed inputs.');
    case 'INVOICE_NOT_AVAILABLE':
      return t('The invoice is not available');
    case 'INVOICE_EXPIRED':
      return t('This invoice is no longer accepting payments');
    case 'UNABLE_TO_PARSE_PAYMENT':
      return t(
        'We were unable to parse your payment. Please try again or contact your wallet provider',
      );
    case 'NO_TRASACTION':
      return t(
        'Your request did not include a transaction. Please try again or contact your wallet provider',
      );
    case 'INVALID_TX_FORMAT':
      return t(
        'Your transaction was in an invalid format, it must be a hexadecimal string. Contact your wallet provider',
      );
    case 'UNABLE_TO_PARSE_TX':
      return t(
        'We were unable to parse the transaction you sent. Please try again or contact your wallet provider',
      );
    case 'WRONG_ADDRESS':
      return t(
        'The transaction you sent does not have any output to the address on the invoice',
      );
    case 'WRONG_AMOUNT':
      return t(
        'The amount on the transaction does not match the amount requested. This payment will not be accepted',
      );
    case 'NOT_ENOUGH_FEE':
      return t('Transaction fee is below the current minimum threshold');
    case 'BTC_NOT_BCH':
      return t(
        'This invoice is priced in BTC, not BCH. Please try with a BTC wallet instead',
      );
    case 'INVALID_BACKUP':
      return t('Wallet Recovery Phrase is invalid');
    case 'WALLET_DOES_NOT_EXIST':
      return t(
        'Wallet not registered at the wallet service. Recreate it from "Create Wallet" using "Advanced Options" to set your recovery phrase',
      );
    case 'MISSING_PRIVATE_KEY':
      return t('Missing private keys to sign');
    case 'ENCRYPTED_PRIVATE_KEY':
      return t('Private key is encrypted, cannot sign');
    case 'SERVER_COMPROMISED':
      return t('Server response could not be verified');
    case 'COULD_NOT_BUILD_TRANSACTION':
      return t('Could not build transaction');
    case 'INSUFFICIENT_FUNDS':
      return t(
        'You are trying to send more funds than you have available. Make sure you do not have funds locked by pending transaction proposals.',
      );
    case 'MAINTENANCE_ERROR':
      return t(
        'Bitcore Wallet Service is under maintenance. Please check https://status.bitpay.com/.',
      );
    case 'CONNECTION_ERROR':
      return t('Network error');
    case 'NOT_FOUND':
      return t('Wallet service not found');
    case 'ECONNRESET_ERROR':
      return t('Connection reset by peer');
    case 'BAD_RESPONSE_CODE':
      return t('The request could not be understood by the server');
    case 'WALLET_ALREADY_EXISTS':
      return t('Wallet already exists');
    case 'COPAYER_IN_WALLET':
      return t('Copayer already in this wallet');
    case 'WALLET_FULL':
      return t('Wallet is full. All copayers already join the wallet.');
    case 'WALLET_NOT_FOUND':
      return t('Wallet not found');
    case 'INSUFFICIENT_FUNDS_FOR_FEE':
      return t('Insufficient funds for fee');
    case 'INSUFFICIENT_ETH_FEE':
      return t('Your linked ETH wallet does not have enough ETH for fee');
    case 'INSUFFICIENT_MATIC_FEE':
      return t('Your linked POLYGON wallet does not have enough ETH for fee');
    case 'LOCKED_FUNDS':
      return t('Funds are locked by pending spend proposals');
    case 'LOCKED_ETH_FEE':
      return t(
        'Your ETH linked wallet funds are locked by pending spend proposals',
      );
    case 'LOCKED_MATIC_FEE':
      return t(
        'Your POLYGON linked wallet funds are locked by pending spend proposals',
      );
    case 'COPAYER_VOTED':
      return t('Copayer already voted on this spend proposal');
    case 'NOT_AUTHORIZED':
      return t('Not authorized');
    case 'TX_ALREADY_BROADCASTED':
      return t('Transaction already broadcasted');
    case 'TX_CANNOT_CREATE':
      return t(
        'Locktime in effect. Please wait to create a new spend proposal',
      );
    case 'TX_CANNOT_REMOVE':
      return t('Locktime in effect. Please wait to remove this spend proposal');
    case 'TX_NOT_ACCEPTED':
      return t('Spend proposal is not accepted');
    case 'TX_NOT_FOUND':
      return t('Spend proposal not found');
    case 'TX_NOT_PENDING':
      return t('The spend proposal is not pending');
    case 'UPGRADE_NEEDED':
      return t('Please upgrade the app to perform this action');
    case 'BAD_SIGNATURES':
      return t('Signatures rejected by server');
    case 'COPAYER_DATA_MISMATCH':
      return t('Copayer data mismatch');
    case 'DUST_AMOUNT':
      return t('Amount below minimum allowed (dust threshold)');
    case 'INCORRECT_ADDRESS_NETWORK':
      return t('Incorrect network address');
    case 'COPAYER_REGISTERED':
      return t('Key already associated with an existing wallet');
    case 'INVALID_ADDRESS':
      return t('Invalid address');
    case 'MAIN_ADDRESS_GAP_REACHED':
      return t(
        'Empty addresses limit reached. New addresses cannot be generated.',
      );
    case 'WALLET_LOCKED':
      return t('Wallet is locked');
    case 'WALLET_NOT_COMPLETE':
      return t('Wallet is not complete');
    case 'WALLET_NEEDS_BACKUP':
      return t('Wallet needs backup');
    case 'MISSING_PARAMETER':
      return t('Missing parameter');
    case 'NO_PASSWORD':
      return t('No password');
    case 'WRONG_PASSWORD':
      return t('Wrong password');
    case 'EXCEEDED_DAILY_LIMIT':
      return t('Exceeded daily limit of $500 per user');
    case 'ERROR':
      return err.message;
    default:
      return err.message || errorName;
  }
};
export const BWCErrorMessage = (err: any, prefix?: string): string => {
  if (!err) {
    return t('Unknown error');
  }
  prefix = prefix || '';
  return prefix + (prefix ? ': ' : '') + _getErrorMessage(err);
};
