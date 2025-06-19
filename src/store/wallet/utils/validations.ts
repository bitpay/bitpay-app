import {PublicKey} from '@solana/web3.js';
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

export const ValidDataTypes: string[] = [
  'BitcoinAddress',
  'BitcoinCashAddress',
  'EVMAddress',
  'SVMAddress',
  'RippleAddress',
  'DogecoinAddress',
  'LitecoinAddress',
  'RippleUri',
  'BitcoinUri',
  'BitcoinCashUri',
  'EthereumUri',
  'MaticUri',
  'ArbUri',
  'BaseUri',
  'OpUri',
  'SolUri',
  'DogecoinUri',
  'LitecoinUri',
  'BitPayUri',
];

export const IsBitPayInvoiceWebUrl = (data: string): boolean => {
  return !!/^https:\/\/(www\.|link\.)?(test\.|staging\.)?bitpay\.com\/(invoice\?)\w+/.exec(
    data,
  );
};

export const IsValidBitPayInvoice = (data: string): boolean => {
  return !!/^https:\/\/(www\.|link\.)?(test\.|staging\.)?bitpay\.com\/i\/\w+/.exec(
    data,
  );
};

export const IsValidPayPro = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!/^(bitpay|bitcoin|bitcoincash|bchtest|bchreg|ethereum|ripple|matic|arb|base|op|solana|dogecoin|litecoin)?:\?r=[\w+]/.exec(
    data,
  );
};

export const IsValidSolanaPay = (data: string): boolean => {
  // solana:<recipient>?amount=<amount>&spl-token=<spl-token>&reference=<reference>&label=<label>&message=<message>&memo=<memo>
  try {
    if (!data.startsWith('solana:')) {
      return false;
    }

    const withoutPrefix = data.replace('solana:', '');
    const [recipientPart] = withoutPrefix.split('?');
    if (!recipientPart) {
      return false;
    }

    // Try creating a PublicKey with recipientPart to make sure it's a valid Solana address.
    new PublicKey(recipientPart); // throws if it is not valid

    return true;
  } catch (e) {
    return false;
  }
};

export const isValidWalletConnectUri = (data: string): boolean => {
  const pattern = /(wallet\/wc|wc:)/g;
  try {
    const decoded = decodeURIComponent(data);
    return pattern.test(decoded);
  } catch {
    return pattern.test(data);
  }
};

export const isValidBuyCryptoUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!(
    data?.includes('buyCrypto') ||
    data?.includes('buy-crypto') ||
    data?.includes('bitpay://buy')
  );
};

export const isValidSellCryptoUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!(
    data?.includes('sellCrypto') ||
    data?.includes('sell-crypto') ||
    data?.includes('bitpay://sell')
  );
};

export const isValidSwapCryptoUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!(
    data?.includes('swapCrypto') ||
    data?.includes('swap-crypto') ||
    data?.includes('bitpay://swap')
  );
};

export const isValidBanxaUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!(
    data?.includes('banxa') ||
    data?.includes('banxaCancelled') ||
    data?.includes('banxaFailed')
  );
};

export const isValidMoonpayUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!data?.includes('moonpay');
};

export const isValidRampUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!data?.includes('ramp');
};

export const isValidSardineUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!data?.includes('sardine');
};

export const isValidSimplexUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!data?.includes('simplex');
};

export const isValidTransakUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!data?.includes('transak');
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

export const IsValidMaticUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getCore().Validation.validateUri('MATIC', data);
};

export const IsValidArbUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getCore().Validation.validateUri('ARB', data);
};

export const IsValidBaseUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getCore().Validation.validateUri('BASE', data);
};

export const IsValidOpUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getCore().Validation.validateUri('OP', data);
};

export const IsValidSolUri = (data: string): boolean => {
  data = SanitizeUri(data);
  return !!BWC.getCore().Validation.validateUri('SOL', data);
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
    data.replace(/^(bitcoincash:|bchtest:|bchreg:)/, 'bitcoin:'),
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
    BWC.getBitcoreCash().Address.isValid(data, 'testnet') ||
    BWC.getBitcoreCash().Address.isValid(data, 'regtest')
  );
};

export const IsValidEVMAddress = (data: string): boolean => {
  return !!BWC.getCore().Validation.validateAddress('ETH', 'livenet', data); // using ETH for simplicity
};

export const IsValidSVMAddress = (data: string): boolean => {
  return !!BWC.getCore().Validation.validateAddress('SOL', 'livenet', data); // using SOL for simplicity
};

export const IsValidEthereumAddress = (data: string): boolean => {
  return !!BWC.getCore().Validation.validateAddress('ETH', 'livenet', data);
};

export const IsValidMaticAddress = (data: string): boolean => {
  return !!BWC.getCore().Validation.validateAddress('MATIC', 'livenet', data);
};

export const IsValidArbAddress = (data: string): boolean => {
  return !!BWC.getCore().Validation.validateAddress('ARB', 'livenet', data);
};

export const IsValidBaseAddress = (data: string): boolean => {
  return !!BWC.getCore().Validation.validateAddress('BASE', 'livenet', data);
};

export const IsValidOpAddress = (data: string): boolean => {
  return !!BWC.getCore().Validation.validateAddress('OP', 'livenet', data);
};

export const IsValidSolAddress = (data: string): boolean => {
  return !!BWC.getCore().Validation.validateAddress('SOL', 'livenet', data);
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
    BWC.getBitcore().Address.isValid(data, 'testnet') ||
    BWC.getBitcore().Address.isValid(data, 'regtest')
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

  if (IsValidMaticUri(data)) {
    return {
      data,
      type: 'MaticUri',
      title: 'Matic URI',
    };
  }

  if (IsValidArbUri(data)) {
    return {
      data,
      type: 'ArbUri',
      title: 'Arb URI',
    };
  }

  if (IsValidBaseUri(data)) {
    return {
      data,
      type: 'BaseUri',
      title: 'Base URI',
    };
  }

  if (IsValidOpUri(data)) {
    return {
      data,
      type: 'OpUri',
      title: 'Op URI',
    };
  }

  if (IsValidSolUri(data)) {
    return {
      data,
      type: 'SolUri',
      title: 'Sol URI',
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

  if (IsValidEVMAddress(data)) {
    return {
      data,
      type: 'EVMAddress',
      title: 'EVM Address',
    };
  }

  if (IsValidSVMAddress(data)) {
    return {
      data,
      type: 'SVMAddress',
      title: 'SVM Address',
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
  const extractAddress = (data: string) => {
    const prefix = /^[a-z]+:/i;
    const params = /([\?\&](value|gas|gasPrice|gasLimit)=(\d+([\,\.]\d+)?))+/i;
    return data.replace(prefix, '').replace(params, '');
  };
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
    case 'arb':
    case 'base':
    case 'op':
    case 'sol':
      const {Validation} = BWC.getCore();
      const addr = extractAddress(str);
      return !!Validation.validateAddress(coin.toUpperCase(), network, addr);
    default:
      return false;
  }
};

export const IsValidPrivateKey = (data: string): boolean => {
  const checkPrivateKey = (
    privateKey: string,
    network: 'livenet' | 'testnet',
  ): boolean => {
    const providers = [
      BwcProvider.getInstance().getBitcore(),
      BwcProvider.getInstance().getBitcoreCash(),
      BwcProvider.getInstance().getBitcoreLtc(),
      BwcProvider.getInstance().getBitcoreDoge(),
    ];

    for (const provider of providers) {
      try {
        provider.PrivateKey(privateKey, network);
        return true;
      } catch (err) {}
    }

    return false;
  };

  if (data && data.substring(0, 2) === '6P') {
    return true;
  }

  try {
    const PKregex = /^[c5KL6][1-9A-HJ-NP-Za-km-z]{50,51}$/;
    const isPK = PKregex.test(data);
    if (!isPK) {
      return false;
    }
    if (checkPrivateKey(data, 'livenet')) {
      return true;
    }
    if (checkPrivateKey(data, 'testnet')) {
      return true;
    }
  } catch (err) {}
  return false;
};

export const IsValidAddKeyPath = (data: string) => {
  return !!data?.includes('bitpay://addKey');
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
