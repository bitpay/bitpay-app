export const getErrorName = (err: Error) =>
  err.name
    ? err.name === 'Error'
      ? err.message
      : err.name.replace(/^bwc.Error/g, '')
    : err;

export const BWCErrorMessage = (err: any, prefix?: string): string => {
  if (!err) {
    return 'Unknown error';
  }

  const name = getErrorName(err);

  let body = '';
  prefix = prefix || '';

  switch (name) {
    case 'INPUT_NOT_FOUND':
      body =
        "We could not find one or more inputs for your transaction on the blockchain. Make sure you're not trying to use unconfirmed change";
      break;
    case 'UNCONFIRMED_INPUTS_NOT_ACCEPTED':
      body = 'This invoice does not accept unconfirmed inputs.';
      break;
    case 'INVOICE_NOT_AVAILABLE':
      body = 'The invoice is no available';
      break;
    case 'INVOICE_EXPIRED':
      body = 'This invoice is no longer accepting payments';
      break;
    case 'UNABLE_TO_PARSE_PAYMENT':
      body =
        'We were unable to parse your payment. Please try again or contact your wallet provider';
      break;
    case 'NO_TRASACTION':
      body =
        'Your request did not include a transaction. Please try again or contact your wallet provider';
      break;
    case 'INVALID_TX_FORMAT':
      body =
        'Your transaction was an in an invalid format, it must be a hexadecimal string. Contact your wallet provider';
      break;
    case 'UNABLE_TO_PARSE_TX':
      body =
        'We were unable to parse the transaction you sent. Please try again or contact your wallet provider';
      break;
    case 'WRONG_ADDRESS':
      body =
        'The transaction you sent does not have any output to the address on the invoice';
      break;
    case 'WRONG_AMOUNT':
      body =
        'The amount on the transaction does not match the amount requested. This payment will not be accepted';
      break;
    case 'NOT_ENOUGH_FEE':
      body = 'Transaction fee is below the current minimum threshold';
      break;
    case 'BTC_NOT_BCH':
      body =
        'This invoice is priced in BTC, not BCH. Please try with a BTC wallet instead';
      break;

    case 'INVALID_BACKUP':
      body = 'Wallet Recovery Phrase is invalid';
      break;
    case 'WALLET_DOES_NOT_EXIST':
      body =
        'Wallet not registered at the wallet service. Recreate it from "Create Wallet" using "Advanced Options" to set your recovery phrase';
      break;
    case 'MISSING_PRIVATE_KEY':
      body = 'Missing private keys to sign';
      break;
    case 'ENCRYPTED_PRIVATE_KEY':
      body = 'Private key is encrypted, cannot sign';
      break;
    case 'SERVER_COMPROMISED':
      body = 'Server response could not be verified';
      break;
    case 'COULD_NOT_BUILD_TRANSACTION':
      body = 'Could not build transaction';
      break;
    case 'INSUFFICIENT_FUNDS':
      body =
        'You are trying to send more funds than you have available. Make sure you do not have funds locked by pending transaction proposals.';
      break;
    case 'MAINTENANCE_ERROR':
      body =
        'Bitcore Wallet Service is under maintenance. Please check https://status.bitpay.com/.';
      break;
    case 'CONNECTION_ERROR':
      body = 'Network error';
      break;
    case 'NOT_FOUND':
      body = 'Wallet service not found';
      break;
    case 'ECONNRESET_ERROR':
      body = 'Connection reset by peer';
      break;
    case 'BAD_RESPONSE_CODE':
      body = 'The request could not be understood by the server';
      break;
    case 'WALLET_ALREADY_EXISTS':
      body = 'Wallet already exists';
      break;
    case 'COPAYER_IN_WALLET':
      body = 'Copayer already in this wallet';
      break;
    case 'WALLET_FULL':
      body = 'Wallet is full';
      break;
    case 'WALLET_NOT_FOUND':
      body = 'Wallet not found';
      break;
    case 'INSUFFICIENT_FUNDS_FOR_FEE':
      body = 'Insufficient funds for fee';
      break;
    case 'INSUFFICIENT_ETH_FEE':
      body = 'Your linked ETH wallet does not have enough ETH for fee';
      break;
    case 'LOCKED_FUNDS':
      body = 'Funds are locked by pending spend proposals';
      break;
    case 'LOCKED_ETH_FEE':
      body =
        'Your ETH linked wallet funds are locked by pending spend proposals';
      break;
    case 'COPAYER_VOTED':
      body = 'Copayer already voted on this spend proposal';
      break;
    case 'NOT_AUTHORIZED':
      body = 'Not authorized';
      break;
    case 'TX_ALREADY_BROADCASTED':
      body = 'Transaction already broadcasted';
      break;
    case 'TX_CANNOT_CREATE':
      body = 'Locktime in effect. Please wait to create a new spend proposal';
      break;
    case 'TX_CANNOT_REMOVE':
      body = 'Locktime in effect. Please wait to remove this spend proposal';
      break;
    case 'TX_NOT_ACCEPTED':
      body = 'Spend proposal is not accepted';
      break;
    case 'TX_NOT_FOUND':
      body = 'Spend proposal not found';
      break;
    case 'TX_NOT_PENDING':
      body = 'The spend proposal is not pending';
      break;
    case 'UPGRADE_NEEDED':
      body = 'Please upgrade the app to perform this action';
      break;
    case 'BAD_SIGNATURES':
      body = 'Signatures rejected by server';
      break;
    case 'COPAYER_DATA_MISMATCH':
      body = 'Copayer data mismatch';
      break;
    case 'DUST_AMOUNT':
      body = 'Amount below minimum allowed (dust threshold)';
      break;
    case 'INCORRECT_ADDRESS_NETWORK':
      body = 'Incorrect network address';
      break;
    case 'COPAYER_REGISTERED':
      body = 'Key already associated with an existing wallet';
      break;
    case 'INVALID_ADDRESS':
      body = 'Invalid address';
      break;
    case 'MAIN_ADDRESS_GAP_REACHED':
      body =
        'Empty addresses limit reached. New addresses cannot be generated.';
      break;
    case 'WALLET_LOCKED':
      body = 'Wallet is locked';
      break;
    case 'WALLET_NOT_COMPLETE':
      body = 'Wallet is not complete';
      break;
    case 'WALLET_NEEDS_BACKUP':
      body = 'Wallet needs backup';
      break;
    case 'MISSING_PARAMETER':
      body = 'Missing parameter';
      break;
    case 'NO_PASSWORD':
      body = 'No password';
      break;
    case 'WRONG_PASSWORD':
      body = 'Wrong password';
      break;
    case 'EXCEEDED_DAILY_LIMIT':
      body = 'Exceeded daily limit of $500 per user';
      break;
    case 'ERROR':
      body = err.message || err.error;
      break;

    default:
      body = err.message || name;
      break;
  }

  return prefix + (prefix ? ': ' : '') + body;
};
