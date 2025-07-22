import {t} from 'i18next';

export enum BWCErrorName {
  BAD_RESPONSE_CODE = 'BAD_RESPONSE_CODE',
  BAD_SIGNATURES = 'BAD_SIGNATURES',
  BTC_NOT_BCH = 'BTC_NOT_BCH',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  COPAYER_DATA_MISMATCH = 'COPAYER_DATA_MISMATCH',
  COPAYER_IN_WALLET = 'COPAYER_IN_WALLET',
  COPAYER_REGISTERED = 'COPAYER_REGISTERED',
  COPAYER_VOTED = 'COPAYER_VOTED',
  COULD_NOT_BUILD_TRANSACTION = 'COULD_NOT_BUILD_TRANSACTION',
  DUST_AMOUNT = 'DUST_AMOUNT',
  ECONNRESET_ERROR = 'ECONNRESET_ERROR',
  ENCRYPTED_PRIVATE_KEY = 'ENCRYPTED_PRIVATE_KEY',
  ERROR = 'ERROR',
  EXCEEDED_DAILY_LIMIT = 'EXCEEDED_DAILY_LIMIT',
  INCORRECT_ADDRESS_NETWORK = 'INCORRECT_ADDRESS_NETWORK',
  INSUFFICIENT_ARB_FEE = 'INSUFFICIENT_ARB_FEE',
  INSUFFICIENT_BASE_FEE = 'INSUFFICIENT_BASE_FEE',
  INSUFFICIENT_ETH_FEE = 'INSUFFICIENT_ETH_FEE',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INSUFFICIENT_FUNDS_FOR_FEE = 'INSUFFICIENT_FUNDS_FOR_FEE',
  INSUFFICIENT_SOL_FEE = 'INSUFFICIENT_SOL_FEE',
  INSUFFICIENT_MATIC_FEE = 'INSUFFICIENT_MATIC_FEE',
  INSUFFICIENT_OP_FEE = 'INSUFFICIENT_OP_FEE',
  INPUT_NOT_FOUND = 'INPUT_NOT_FOUND',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_ADDRESS_GENERATED = 'INVALID_ADDRESS_GENERATED',
  INVALID_BACKUP = 'INVALID_BACKUP',
  INVALID_TX_FORMAT = 'INVALID_TX_FORMAT',
  INVOICE_EXPIRED = 'INVOICE_EXPIRED',
  INVOICE_NOT_AVAILABLE = 'INVOICE_NOT_AVAILABLE',
  LOCKED_SOL_FEE = 'LOCKED_SOL_FEE',
  LOCKED_ARB_FEE = 'LOCKED_ARB_FEE',
  LOCKED_BASE_FEE = 'LOCKED_BASE_FEE',
  LOCKED_ETH_FEE = 'LOCKED_ETH_FEE',
  LOCKED_FUNDS = 'LOCKED_FUNDS',
  LOCKED_MATIC_FEE = 'LOCKED_MATIC_FEE',
  LOCKED_OP_FEE = 'LOCKED_OP_FEE',
  MAIN_ADDRESS_GAP_REACHED = 'MAIN_ADDRESS_GAP_REACHED',
  MAINTENANCE_ERROR = 'MAINTENANCE_ERROR',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  MISSING_PRIVATE_KEY = 'MISSING_PRIVATE_KEY',
  NO_PASSWORD = 'NO_PASSWORD',
  NO_TRASACTION = 'NO_TRASACTION',
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  NOT_ENOUGH_FEE = 'NOT_ENOUGH_FEE',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_COMPROMISED = 'SERVER_COMPROMISED',
  TX_ALREADY_BROADCASTED = 'TX_ALREADY_BROADCASTED',
  TX_CANNOT_CREATE = 'TX_CANNOT_CREATE',
  TX_CANNOT_REMOVE = 'TX_CANNOT_REMOVE',
  TX_NOT_ACCEPTED = 'TX_NOT_ACCEPTED',
  TX_NOT_FOUND = 'TX_NOT_FOUND',
  TX_NOT_PENDING = 'TX_NOT_PENDING',
  UPGRADE_NEEDED = 'UPGRADE_NEEDED',
  UNABLE_TO_PARSE_PAYMENT = 'UNABLE_TO_PARSE_PAYMENT',
  UNABLE_TO_PARSE_TX = 'UNABLE_TO_PARSE_TX',
  UNCONFIRMED_INPUTS_NOT_ACCEPTED = 'UNCONFIRMED_INPUTS_NOT_ACCEPTED',
  WALLET_ALREADY_EXISTS = 'WALLET_ALREADY_EXISTS',
  WALLET_DOES_NOT_EXIST = 'WALLET_DOES_NOT_EXIST',
  WALLET_FULL = 'WALLET_FULL',
  WALLET_LOCKED = 'WALLET_LOCKED',
  WALLET_NEEDS_BACKUP = 'WALLET_NEEDS_BACKUP',
  WALLET_NOT_COMPLETE = 'WALLET_NOT_COMPLETE',
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  WRONG_ADDRESS = 'WRONG_ADDRESS',
  WRONG_AMOUNT = 'WRONG_AMOUNT',
  WRONG_PASSWORD = 'WRONG_PASSWORD',
  TX_NONCE_CONFLICT = 'TX_NONCE_CONFLICT',
}

export const getErrorName = (err: Error) =>
  err?.name
    ? err.name === 'Error'
      ? err.message
      : err.name.replace(/^bwc.Error/g, '')
    : err;

const _getErrorMessage = (err: Error) => {
  const errorName = getErrorName(err);
  switch (errorName) {
    case BWCErrorName.BAD_RESPONSE_CODE:
      return t('The request could not be understood by the server');
    case BWCErrorName.BAD_SIGNATURES:
      return t('Signatures rejected by server');
    case BWCErrorName.BTC_NOT_BCH:
      return t(
        'This invoice is priced in BTC, not BCH. Please try with a BTC wallet instead',
      );
    case BWCErrorName.CONNECTION_ERROR:
      return t('Network error');
    case BWCErrorName.COPAYER_DATA_MISMATCH:
      return t('Copayer data mismatch');
    case BWCErrorName.COPAYER_IN_WALLET:
      return t('Copayer already in this wallet');
    case BWCErrorName.COPAYER_REGISTERED:
      return t('Key already associated with an existing wallet');
    case BWCErrorName.COPAYER_VOTED:
      return t('Copayer already voted on this spend proposal');
    case BWCErrorName.COULD_NOT_BUILD_TRANSACTION:
      return t('Could not build transaction');
    case BWCErrorName.DUST_AMOUNT:
      return t('Amount below minimum allowed (dust threshold)');
    case BWCErrorName.ECONNRESET_ERROR:
      return t('Connection reset by peer');
    case BWCErrorName.ENCRYPTED_PRIVATE_KEY:
      return t('Private key is encrypted, cannot sign');
    case BWCErrorName.EXCEEDED_DAILY_LIMIT:
      return t('Exceeded daily limit of $500 per user');
    case BWCErrorName.INCORRECT_ADDRESS_NETWORK:
      return t('Incorrect network address');
    case BWCErrorName.INPUT_NOT_FOUND:
      return t(
        "We could not find one or more inputs for your transaction on the blockchain. Make sure you're not trying to use unconfirmed change",
      );
    case BWCErrorName.INSUFFICIENT_ARB_FEE:
      return t(
        'Insufficient funds in your linked ARB wallet to cover the transaction fee.',
      );
    case BWCErrorName.INSUFFICIENT_BASE_FEE:
      return t(
        'Insufficient funds in your linked BASE wallet to cover the transaction fee.',
      );
    case BWCErrorName.INSUFFICIENT_ETH_FEE:
      return t(
        'Insufficient funds in your linked ETH wallet to cover the transaction fee.',
      );
    case BWCErrorName.INSUFFICIENT_FUNDS:
      return t(
        'You are trying to send more funds than you have available. Make sure you do not have funds locked by pending transaction proposals.',
      );
    case BWCErrorName.INSUFFICIENT_FUNDS_FOR_FEE:
      return t('Insufficient funds for fee');
    case BWCErrorName.INSUFFICIENT_MATIC_FEE:
      return t(
        'Insufficient funds in your linked MATIC wallet to cover the transaction fee.',
      );
    case BWCErrorName.INSUFFICIENT_SOL_FEE:
      return t(
        'Insufficient funds in your linked SOL wallet to cover the transaction fee.',
      );
    case BWCErrorName.INSUFFICIENT_OP_FEE:
      return t(
        'Insufficient funds in your linked OP wallet to cover the transaction fee.',
      );
    case BWCErrorName.INVALID_ADDRESS:
      return t('Invalid address');
    case BWCErrorName.INVALID_BACKUP:
      return t('Wallet Recovery Phrase is invalid');
    case BWCErrorName.INVALID_TX_FORMAT:
      return t(
        'Your transaction was in an invalid format, it must be a hexadecimal string. Contact your wallet provider',
      );
    case BWCErrorName.INVOICE_EXPIRED:
      return t('This invoice is no longer accepting payments');
    case BWCErrorName.INVOICE_NOT_AVAILABLE:
      return t('The invoice is not available');
    case BWCErrorName.LOCKED_ARB_FEE:
      return t(
        'Your ARB linked wallet funds are locked by pending spend proposals',
      );
    case BWCErrorName.LOCKED_BASE_FEE:
      return t(
        'Your BASE linked wallet funds are locked by pending spend proposals',
      );
    case BWCErrorName.LOCKED_ETH_FEE:
      return t(
        'Your ETH linked wallet funds are locked by pending spend proposals',
      );
    case BWCErrorName.LOCKED_SOL_FEE:
      return t(
        'Your SOL linked wallet funds are locked by pending spend proposals',
      );
    case BWCErrorName.LOCKED_FUNDS:
      return t('Funds are locked by pending spend proposals');
    case BWCErrorName.LOCKED_MATIC_FEE:
      return t(
        'Your POLYGON linked wallet funds are locked by pending spend proposals',
      );
    case BWCErrorName.LOCKED_OP_FEE:
      return t(
        'Your OP linked wallet funds are locked by pending spend proposals',
      );
    case BWCErrorName.MAIN_ADDRESS_GAP_REACHED:
      return t(
        'Empty addresses limit reached. New addresses cannot be generated.',
      );
    case BWCErrorName.MAINTENANCE_ERROR:
      return t(
        'Bitcore Wallet Service is under maintenance. Please check https://status.bitpay.com/.',
      );
    case BWCErrorName.MISSING_PARAMETER:
      return t('Missing parameter');
    case BWCErrorName.MISSING_PRIVATE_KEY:
      return t('Missing private keys to sign');
    case BWCErrorName.NO_PASSWORD:
      return t('No password');
    case BWCErrorName.NO_TRASACTION:
      return t(
        'Your request did not include a transaction. Please try again or contact your wallet provider',
      );
    case BWCErrorName.NOT_AUTHORIZED:
      return t('Not authorized');
    case BWCErrorName.NOT_ENOUGH_FEE:
      return t('Transaction fee is below the current minimum threshold');
    case BWCErrorName.NOT_FOUND:
      return t('Wallet service not found');
    case BWCErrorName.SERVER_COMPROMISED:
      return t('Server response could not be verified');
    case BWCErrorName.TX_ALREADY_BROADCASTED:
      return t('Transaction already broadcasted');
    case BWCErrorName.TX_CANNOT_CREATE:
      return t(
        'Locktime in effect. Please wait to create a new spend proposal',
      );
    case BWCErrorName.TX_CANNOT_REMOVE:
      return t('Locktime in effect. Please wait to remove this spend proposal');
    case BWCErrorName.TX_NOT_ACCEPTED:
      return t('Spend proposal is not accepted');
    case BWCErrorName.TX_NOT_FOUND:
      return t('Spend proposal not found');
    case BWCErrorName.TX_NOT_PENDING:
      return t('The spend proposal is not pending');
    case BWCErrorName.UNABLE_TO_PARSE_PAYMENT:
      return t(
        'We were unable to parse your payment. Please try again or contact your wallet provider',
      );
    case BWCErrorName.UNABLE_TO_PARSE_TX:
      return t(
        'We were unable to parse the transaction you sent. Please try again or contact your wallet provider',
      );
    case BWCErrorName.UNCONFIRMED_INPUTS_NOT_ACCEPTED:
      return t('This invoice does not accept unconfirmed inputs.');
    case BWCErrorName.UPGRADE_NEEDED:
      return t('Please upgrade the app to perform this action');
    case BWCErrorName.WALLET_ALREADY_EXISTS:
      return t('Wallet already exists');
    case BWCErrorName.WALLET_DOES_NOT_EXIST:
      return t(
        'Wallet not registered at the wallet service. Recreate it from "Create Wallet" using "Advanced Options" to set your recovery phrase',
      );
    case BWCErrorName.WALLET_FULL:
      return t('Wallet is full. All copayers already join the wallet.');
    case BWCErrorName.WALLET_LOCKED:
      return t('Wallet is locked');
    case BWCErrorName.WALLET_NEEDS_BACKUP:
      return t('Wallet needs backup');
    case BWCErrorName.WALLET_NOT_COMPLETE:
      return t('Wallet is not complete');
    case BWCErrorName.WALLET_NOT_FOUND:
      return t('Wallet not found');
    case BWCErrorName.WRONG_ADDRESS:
      return t(
        'The transaction you sent does not have any output to the address on the invoice',
      );
    case BWCErrorName.WRONG_AMOUNT:
      return t(
        'The amount on the transaction does not match the amount requested. This payment will not be accepted',
      );
    case BWCErrorName.WRONG_PASSWORD:
      return t('Wrong password');
    case BWCErrorName.TX_NONCE_CONFLICT:
      return t(
        'Unsigned TX proposal(s) with lower or conflicting nonces exist. Please sign or reject them first.',
      );
    case BWCErrorName.ERROR:
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
