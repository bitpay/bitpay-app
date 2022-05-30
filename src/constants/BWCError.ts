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
      return "We could not find one or more inputs for your transaction on the blockchain. Make sure you're not trying to use unconfirmed change";
    case 'UNCONFIRMED_INPUTS_NOT_ACCEPTED':
      return 'This invoice does not accept unconfirmed inputs.';
    case 'INVOICE_NOT_AVAILABLE':
      return 'The invoice is not available';
    case 'INVOICE_EXPIRED':
      return 'This invoice is no longer accepting payments';
    case 'UNABLE_TO_PARSE_PAYMENT':
      return 'We were unable to parse your payment. Please try again or contact your wallet provider';
    case 'NO_TRASACTION':
      return 'Your request did not include a transaction. Please try again or contact your wallet provider';
    case 'INVALID_TX_FORMAT':
      return 'Your transaction was an in an invalid format, it must be a hexadecimal string. Contact your wallet provider';
    case 'UNABLE_TO_PARSE_TX':
      return 'We were unable to parse the transaction you sent. Please try again or contact your wallet provider';
    case 'WRONG_ADDRESS':
      return 'The transaction you sent does not have any output to the address on the invoice';
    case 'WRONG_AMOUNT':
      return 'The amount on the transaction does not match the amount requested. This payment will not be accepted';
    case 'NOT_ENOUGH_FEE':
      return 'Transaction fee is below the current minimum threshold';
    case 'BTC_NOT_BCH':
      return 'This invoice is priced in BTC, not BCH. Please try with a BTC wallet instead';
    case 'INVALID_BACKUP':
      return 'Wallet Recovery Phrase is invalid';
    case 'WALLET_DOES_NOT_EXIST':
      return 'Wallet not registered at the wallet service. Recreate it from "Create Wallet" using "Advanced Options" to set your recovery phrase';
    case 'MISSING_PRIVATE_KEY':
      return 'Missing private keys to sign';
    case 'ENCRYPTED_PRIVATE_KEY':
      return 'Private key is encrypted, cannot sign';
    case 'SERVER_COMPROMISED':
      return 'Server response could not be verified';
    case 'COULD_NOT_BUILD_TRANSACTION':
      return 'Could not build transaction';
    case 'INSUFFICIENT_FUNDS':
      return 'You are trying to send more funds than you have available. Make sure you do not have funds locked by pending transaction proposals.';
    case 'MAINTENANCE_ERROR':
      return 'Bitcore Wallet Service is under maintenance. Please check https://status.bitpay.com/.';
    case 'CONNECTION_ERROR':
      return 'Network error';
    case 'NOT_FOUND':
      return 'Wallet service not found';
    case 'ECONNRESET_ERROR':
      return 'Connection reset by peer';
    case 'BAD_RESPONSE_CODE':
      return 'The request could not be understood by the server';
    case 'WALLET_ALREADY_EXISTS':
      return 'Wallet already exists';
    case 'COPAYER_IN_WALLET':
      return 'Copayer already in this wallet';
    case 'WALLET_FULL':
      return 'Wallet is full. All copayers already join the wallet.';
    case 'WALLET_NOT_FOUND':
      return 'Wallet not found';
    case 'INSUFFICIENT_FUNDS_FOR_FEE':
      return 'Insufficient funds for fee';
    case 'INSUFFICIENT_ETH_FEE':
      return 'Your linked ETH wallet does not have enough ETH for fee';
    case 'LOCKED_FUNDS':
      return 'Funds are locked by pending spend proposals';
    case 'LOCKED_ETH_FEE':
      return 'Your ETH linked wallet funds are locked by pending spend proposals';
    case 'COPAYER_VOTED':
      return 'Copayer already voted on this spend proposal';
    case 'NOT_AUTHORIZED':
      return 'Not authorized';
    case 'TX_ALREADY_BROADCASTED':
      return 'Transaction already broadcasted';
    case 'TX_CANNOT_CREATE':
      return 'Locktime in effect. Please wait to create a new spend proposal';
    case 'TX_CANNOT_REMOVE':
      return 'Locktime in effect. Please wait to remove this spend proposal';
    case 'TX_NOT_ACCEPTED':
      return 'Spend proposal is not accepted';
    case 'TX_NOT_FOUND':
      return 'Spend proposal not found';
    case 'TX_NOT_PENDING':
      return 'The spend proposal is not pending';
    case 'UPGRADE_NEEDED':
      return 'Please upgrade the app to perform this action';
    case 'BAD_SIGNATURES':
      return 'Signatures rejected by server';
    case 'COPAYER_DATA_MISMATCH':
      return 'Copayer data mismatch';
    case 'DUST_AMOUNT':
      return 'Amount below minimum allowed (dust threshold)';
    case 'INCORRECT_ADDRESS_NETWORK':
      return 'Incorrect network address';
    case 'COPAYER_REGISTERED':
      return 'Key already associated with an existing wallet';
    case 'INVALID_ADDRESS':
      return 'Invalid address';
    case 'MAIN_ADDRESS_GAP_REACHED':
      return 'Empty addresses limit reached. New addresses cannot be generated.';
    case 'WALLET_LOCKED':
      return 'Wallet is locked';
    case 'WALLET_NOT_COMPLETE':
      return 'Wallet is not complete';
    case 'WALLET_NEEDS_BACKUP':
      return 'Wallet needs backup';
    case 'MISSING_PARAMETER':
      return 'Missing parameter';
    case 'NO_PASSWORD':
      return 'No password';
    case 'WRONG_PASSWORD':
      return 'Wrong password';
    case 'EXCEEDED_DAILY_LIMIT':
      return 'Exceeded daily limit of $500 per user';
    case 'ERROR':
      return err.message;
    default:
      return err.message || errorName;
  }
};
export const BWCErrorMessage = (err: any, prefix?: string): string => {
  if (!err) {
    return 'Unknown error';
  }
  prefix = prefix || '';
  return prefix + (prefix ? ': ' : '') + _getErrorMessage(err);
};
