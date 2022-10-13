import {BwcProvider} from '../../../lib/bwc';
import {ExtractBitPayUriAddress} from './decode-uri';

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
  return !!data?.includes('simplex');
};

export const isValidWyreUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!(data?.includes('wyre') || data?.includes('wyreError'));
};

export const IsValidBitcoinUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getBitcore().URI.isValid(data);
};

export const IsValidBitcoinCashUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getBitcoreCash().URI.isValid(data);
};

export const IsValidEthereumUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getCore().Validation.validateUri('ETH', data);
};

export const IsValidRippleUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getCore().Validation.validateUri('XRP', data);
};

export const IsValidDogecoinUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getBitcoreDoge().URI.isValid(data);
};

export const IsValidLitecoinUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getBitcoreLtc().URI.isValid(data);
};

export const IsValidBitcoinCashUriWithLegacyAddress = (
  data: string,
): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getBitcore().URI.isValid(
    data.replace(/^(bitcoincash:|bchtest:)/, 'bitcoin:'),
  );
};

export const IsValidBitcoinAddress = (data: string): boolean => {
  return !!(
    BWC.getBitcore().Address.isValid(data, 'livenet') ||
    BWC.getBitcore().Address.isValid(data, 'testnet')
  );
};

export const IsValidBitcoinCashAddress = (data: string): boolean => {
  return !!(
    BWC.getBitcoreCash().Address.isValid(data, 'livenet') ||
    BWC.getBitcoreCash().Address.isValid(data, 'testnet')
  );
};

export const IsValidEthereumAddress = (data: string): boolean => {
  return !!BWC.getCore().Validation.validateAddress('ETH', 'livenet', data);
};

export const IsValidRippleAddress = (data: string): boolean => {
  return !!BWC.getCore().Validation.validateAddress('XRP', 'livenet', data);
};

export const IsValidDogecoinAddress = (data: string): boolean => {
  return !!(
    BWC.getBitcoreDoge().Address.isValid(data, 'livenet') ||
    BWC.getBitcoreDoge().Address.isValid(data, 'testnet')
  );
};

export const IsValidLitecoinAddress = (data: string): boolean => {
  return !!(
    BWC.getBitcoreLtc().Address.isValid(data, 'livenet') ||
    BWC.getBitcoreLtc().Address.isValid(data, 'testnet')
  );
};

export const IsValidBitPayUri = (data: string): boolean => {
  data = SanitizeUri(data);
  if (!(data && data.indexOf('bitpay:') === 0)) {
    return false;
  }

  if (data.indexOf('bitpay://wallet?') === 0) {
    const params: URLSearchParams = new URLSearchParams(
      data.replace('bitpay://wallet?', ''),
    );
    if (params.get('walletId')) {
      return true;
    }
  }

  if (data.indexOf('bitpay:wallet?') === 0) {
    const params: URLSearchParams = new URLSearchParams(
      data.replace('bitpay:wallet?', ''),
    );
    if (params.get('walletId')) {
      return true;
    }
  }

  const address = ExtractBitPayUriAddress(data);
  if (!address) {
    return false;
  }
  const params: URLSearchParams = new URLSearchParams(
    data.replace(`bitpay:${address}`, ''),
  );
  const coin = params.get('coin');
  if (!coin) {
    return false;
  }
  return true;
};

export const IsValidBitcoinCashLegacyAddress = (data: string): boolean => {
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
    case 'matic':
      const {Validation} = BWC.getCore();
      return !!Validation.validateAddress(coin.toUpperCase(), network, str);
    default:
      return false;
  }
};

export const IsValidImportPrivateKey = (data: string): boolean => {
  return !!(
    data &&
    (data.substring(0, 2) == '1|' ||
      data.substring(0, 2) == '2|' ||
      data.substring(0, 2) == '3|')
  );
};

export const IsValidJoinCode = (data: string): boolean => {
  return !!(data && data.match(/^[0-9A-HJ-NP-Za-km-z]{70,80}$/));
};
