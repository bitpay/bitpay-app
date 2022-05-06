import {BwcProvider} from '../../../lib/bwc';
import {ExtractBitPayUriAddress} from './decode-uri';
import {APP_NAME} from '../../../constants/config';

const BWC = BwcProvider.getInstance();

const SanitizeUri = (data: string): string => {
  // Fixes when a region uses comma to separate decimals
  // eslint-disable-next-line no-useless-escape
  const regex = /[\?\&]amount=(\d+([\,\.]\d+)?)/i;
  const match = regex.exec(data);
  if (!match || !match.length) {
    return data;
  }
  let value = match[0].replace(',', '.');
  const newUri = data.replace(regex, value);

  // mobile devices, uris like copay://xxx
  newUri.replace('://', ':');

  return newUri;
};

export const IsValidBitPayInvoice = (data: string): boolean => {
  return !!/^https:\/\/(www\.|link\.)?(test\.|staging\.)?bitpay\.com\/i\/\w+/.exec(
    data,
  );
};

export const IsValidPayPro = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!/^(bitcoin|bitcoincash|bchtest|ethereum|ripple|dogecoin|litecoin)?:\?r=[\w+]/.exec(
    data,
  );
};

export const isValidWalletConnectUri = (data: string): boolean => {
  return !!/(wallet\/wc|wc:)/g.exec(data);
};

export const isValidSimplexUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!(data && data.indexOf(APP_NAME + '://simplex') === 0);
};

export const isValidWyreUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!(
    data &&
    (data.indexOf(APP_NAME + '://wyre') === 0 ||
      data.indexOf(APP_NAME + '://wyreError') === 0)
  );
};

const IsValidBitcoinUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getBitcore().URI.isValid(data);
};

const IsValidBitcoinCashUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getBitcoreCash().URI.isValid(data);
};

const IsValidEthereumUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getCore().Validation.validateUri('ETH', data);
};

const IsValidRippleUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getCore().Validation.validateUri('XRP', data);
};

const IsValidDogecoinUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getBitcoreDoge().URI.isValid(data);
};

const IsValidLitecoinUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getBitcoreLtc().URI.isValid(data);
};

const IsValidBitcoinCashUriWithLegacyAddress = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getBitcore().URI.isValid(
    data.replace(/^(bitcoincash:|bchtest:)/, 'bitcoin:'),
  );
};

const IsValidBitcoinAddress = (data: string): boolean => {
  return !!(
    BWC.getBitcore().Address.isValid(data, 'livenet') ||
    BWC.getBitcore().Address.isValid(data, 'testnet')
  );
};

const IsValidBitcoinCashAddress = (data: string): boolean => {
  return !!(
    BWC.getBitcoreCash().Address.isValid(data, 'livenet') ||
    BWC.getBitcoreCash().Address.isValid(data, 'testnet')
  );
};

const IsValidEthereumAddress = (data: string): boolean => {
  return !!BWC.getCore().Validation.validateAddress('ETH', 'livenet', data);
};

const IsValidRippleAddress = (data: string): boolean => {
  return !!BWC.getCore().Validation.validateAddress('XRP', 'livenet', data);
};

const IsValidDogecoinAddress = (data: string): boolean => {
  return !!(
    BWC.getBitcoreDoge().Address.isValid(data, 'livenet') ||
    BWC.getBitcoreDoge().Address.isValid(data, 'testnet')
  );
};

const IsValidLitecoinAddress = (data: string): boolean => {
  return !!(
    BWC.getBitcoreLtc().Address.isValid(data, 'livenet') ||
    BWC.getBitcoreLtc().Address.isValid(data, 'testnet')
  );
};

const IsValidBitPayUri = (data: string): boolean => {
  data = SanitizeUri(data);
  if (!(data && data.indexOf('bitpay:') === 0)) {
    return false;
  }
  const address = ExtractBitPayUriAddress(data);
  if (!address) {
    return false;
  }
  let params: URLSearchParams = new URLSearchParams(
    data.replace(`bitpay:${address}`, ''),
  );
  const coin = params.get('coin');
  if (!coin) {
    return false;
  }
  return true;
};

const IsValidBitcoinCashLegacyAddress = (data: string): boolean => {
  return !!(
    BWC.getBitcore().Address.isValid(data, 'livenet') ||
    BWC.getBitcore().Address.isValid(data, 'testnet')
  );
};

export const CheckIfLegacyBCH = (address: string): boolean => {
  return (
    IsValidBitcoinCashLegacyAddress(address) ||
    IsValidBitcoinCashUriWithLegacyAddress(address)
  );
};

export const ValidateURI = (data: string): any => {
  if (!data) {
    return;
  }

  if (IsValidBitPayInvoice(data)) {
    return {
      data,
      type: 'InvoiceUri',
      title: 'Invoice URL',
    };
  }

  if (IsValidPayPro(data)) {
    return {
      data,
      type: 'PayPro',
      title: 'Payment URL',
    };
  }

  if (IsValidBitcoinUri(data)) {
    return {
      data,
      type: 'BitcoinUri',
      title: 'Bitcoin URI',
    };
  }

  if (IsValidBitcoinCashUri(data)) {
    return {
      data,
      type: 'BitcoinCashUri',
      title: 'Bitcoin Cash URI',
    };
  }

  if (IsValidEthereumUri(data)) {
    return {
      data,
      type: 'EthereumUri',
      title: 'Ethereum URI',
    };
  }

  if (IsValidRippleUri(data)) {
    return {
      data,
      type: 'RippleUri',
      title: 'Ripple URI',
    };
  }

  if (IsValidDogecoinUri(data)) {
    return {
      data,
      type: 'DogecoinUri',
      title: 'Dogecoin URI',
    };
  }

  if (IsValidLitecoinUri(data)) {
    return {
      data,
      type: 'LitecoinUri',
      title: 'Litecoin URI',
    };
  }

  if (IsValidBitcoinCashUriWithLegacyAddress(data)) {
    return {
      data,
      type: 'BitcoinCashUri',
      title: 'Bitcoin Cash URI',
    };
  }

  if (IsValidBitcoinAddress(data)) {
    return {
      data,
      type: 'BitcoinAddress',
      title: 'Bitcoin Address',
    };
  }

  if (IsValidBitcoinCashAddress(data)) {
    return {
      data,
      type: 'BitcoinCashAddress',
      title: 'Bitcoin Cash Address',
    };
  }

  if (IsValidEthereumAddress(data)) {
    return {
      data,
      type: 'EthereumAddress',
      title: 'Ethereum Address',
    };
  }

  if (IsValidRippleAddress(data)) {
    return {
      data,
      type: 'RippleAddress',
      title: 'XRP Address',
    };
  }

  if (IsValidDogecoinAddress(data)) {
    return {
      data,
      type: 'DogecoinAddress',
      title: 'Doge Address',
    };
  }

  if (IsValidLitecoinAddress(data)) {
    return {
      data,
      type: 'LitecoinAddress',
      title: 'Litecoin Address',
    };
  }

  if (IsValidBitPayUri(data)) {
    return {
      data,
      type: 'BitPayUri',
      title: 'BitPay URI',
    };
  }

  return;
};

export const ValidateCoinAddress = (
  str: string,
  coin: string,
  network: string,
) => {
  switch (coin) {
    case 'btc':
      const address = BWC.getBitcore().Address;
      return !!address.isValid(str, network);
    case 'bch':
      const addressCash = BWC.getBitcoreCash().Address;
      return !!addressCash.isValid(str, network);
    case 'doge':
      const addressDoge = BWC.getBitcoreDoge().Address;
      return !!addressDoge.isValid(str, network);
    case 'ltc':
      const addressLtc = BWC.getBitcoreLtc().Address;
      return !!addressLtc.isValid(str, network);
    case 'eth':
    case 'xrp':
      const {Validation} = BWC.getCore();
      return !!Validation.validateAddress(coin.toUpperCase(), network, str);
    default:
      return false;
  }
};
