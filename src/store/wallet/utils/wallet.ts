import {
  Key,
  KeyMethods,
  Rates,
  Token,
  Wallet,
  WalletBalance,
  WalletObj,
} from '../wallet.models';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {Currencies, SUPPORTED_CURRENCIES} from '../../../constants/currencies';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import {BwcProvider} from '../../../lib/bwc';
import {GetProtocolPrefix} from './currency';
import merge from 'lodash.merge';
import cloneDeep from 'lodash.clonedeep';
import {formatFiatAmount} from '../../../utils/helper-methods';
import {WALLET_DISPLAY_LIMIT} from '../../../navigation/tabs/home/components/Wallet';
import {Network} from '../../../constants';

const mapAbbreviationAndName = (
  walletName: string,
  coin: string,
): {currencyAbbreviation: string; currencyName: string} => {
  switch (coin) {
    case 'pax':
      return {
        currencyAbbreviation: 'usdp',
        currencyName: 'Pax Dollar',
      };
    default:
      return {
        currencyAbbreviation: coin,
        currencyName: walletName,
      };
  }
};

// Formatted wallet obj - this is merged with BWC client
export const buildWalletObj = (
  {
    walletId,
    walletName,
    coin,
    balance = {
      crypto: '0',
      cryptoLocked: '0',
      fiat: 0,
      fiatLocked: 0,
      sat: 0,
      satAvailable: 0,
      satLocked: 0,
      satConfirmedLocked: 0,
      satConfirmed: 0,
      satConfirmedAvailable: 0,
    },
    tokens,
    keyId,
    network,
    n,
    m,
  }: Credentials & {
    balance?: WalletBalance;
    tokens?: any;
    network: Network;
  },
  tokenOpts?: {[key in string]: Token},
  otherOpts?: {
    walletName?: string;
  },
): WalletObj => {
  const {currencyName, currencyAbbreviation} = mapAbbreviationAndName(
    walletName,
    coin,
  );
  return {
    id: walletId,
    currencyName,
    currencyAbbreviation,
    walletName: otherOpts?.walletName,
    balance,
    tokens,
    network,
    keyId,
    img: SUPPORTED_CURRENCIES.includes(currencyAbbreviation)
      ? CurrencyListIcons[currencyAbbreviation]
      : tokenOpts
      ? tokenOpts[currencyAbbreviation]?.logoURI
      : '',
    n,
    m,
    isRefreshing: false,
    hideWallet: false,
    hideBalance: false,
  };
};

// Formatted key Obj
export const buildKeyObj = ({
  key,
  wallets,
  totalBalance = 0,
  backupComplete = false,
}: {
  key: KeyMethods;
  wallets: Wallet[];
  totalBalance?: number;
  backupComplete?: boolean;
}): Key => {
  return {
    id: key.id,
    wallets,
    properties: key.toObj(),
    methods: key,
    totalBalance,
    isPrivKeyEncrypted: key.isPrivKeyEncrypted(),
    backupComplete,
    keyName: 'My Key',
  };
};

export const formatCryptoAmount = (
  totalAmount: number,
  currencyAbbreviation: string,
): string => {
  return totalAmount
    ? BwcProvider.getInstance()
        .getUtils()
        .formatAmount(totalAmount, currencyAbbreviation)
    : '0';
};

export const toFiat = (
  totalAmount: number,
  fiatCode: string,
  currencyAbbreviation: string,
  rates: Rates = {},
  customRate?: number,
): number => {
  // TODO - remove when we add coin gecko for token rates
  if (!SUPPORTED_CURRENCIES.includes(currencyAbbreviation)) {
    return 0;
  }

  const ratesPerCurrency = rates[currencyAbbreviation];

  if (!ratesPerCurrency) {
    throw Error(`Rate not found for currency: ${currencyAbbreviation}`);
  }

  const fiatRate =
    customRate ||
    ratesPerCurrency.find(_currency => _currency.code === fiatCode)?.rate;

  if (!fiatRate) {
    throw Error(
      `Rate not found for fiat/currency pair: ${fiatCode} -> ${currencyAbbreviation}`,
    );
  }

  const currencyOpt = Currencies[currencyAbbreviation];

  if (!currencyOpt?.unitInfo) {
    throw Error(`unitInfo not found for currency ${currencyAbbreviation}`);
  }

  return totalAmount * (1 / currencyOpt.unitInfo.unitToSatoshi) * fiatRate;
};

export const findWalletById = (
  wallets: Wallet[],
  id: string,
): Wallet | undefined => wallets.find(wallet => wallet.id === id);

export const isCacheKeyStale = (
  timestamp: number | undefined,
  duration: number,
) => {
  if (!timestamp) {
    return true;
  }

  const TTL = duration * 1000;
  return Date.now() - timestamp > TTL;
};

export const checkEncryptPassword = (key: Key, password: string) =>
  key.methods.checkPassword(password);

export const generateKeyExportCode = (
  key: Key,
  getKeyMnemonic?: string | undefined,
): string => {
  return `1|${getKeyMnemonic}|null|null|${key.properties.mnemonic}|null`;
};

export const isSegwit = (addressType: string): boolean => {
  if (!addressType) {
    return false;
  }

  return addressType === 'P2WPKH' || addressType === 'P2WSH';
};

export const GetProtocolPrefixAddress = (
  coin: string,
  network: string,
  address: string,
): string => {
  if (coin !== 'bch') {
    return address;
  }
  return GetProtocolPrefix(coin, network) + ':' + address;
};

export const getRemainingWalletCount = (
  wallets?: Wallet[],
): undefined | number => {
  if (!wallets || wallets.length < WALLET_DISPLAY_LIMIT) {
    return;
  }
  return wallets.length - WALLET_DISPLAY_LIMIT;
};

export const BuildKeysAndWalletsList = (
  allKeys: {[key in string]: Key},
  appNetwork?: Network,
) => {
  return Object.keys(allKeys).map(keyId => {
    const keyObj = allKeys[keyId];
    return {
      key: keyId,
      keyName: keyObj.keyName || 'My Key',
      wallets: allKeys[keyId].wallets
        .filter(wallet => (appNetwork ? wallet.network === appNetwork : true))
        .map(walletObj => {
          const {
            balance,
            currencyAbbreviation,
            credentials: {network},
          } = walletObj;
          return merge(cloneDeep(walletObj), {
            cryptoBalance: balance.crypto,
            fiatBalance: formatFiatAmount(balance.fiat, 'USD'),
            currencyAbbreviation,
            network,
          });
        }),
    };
  });
};

// These 2 functions were taken from
// https://github.com/bitpay/bitcore-wallet-service/blob/master/lib/model/txproposal.js#L235
const getEstimatedSizeForSingleInput = (wallet: Wallet): number => {
  switch (wallet.credentials.addressType) {
    case 'P2PKH':
      return 147;
    default:
    case 'P2SH':
      return wallet.m * 72 + wallet.n * 36 + 44;
  }
};

export const GetEstimatedTxSize = (
  wallet: Wallet,
  nbOutputs?: number,
): number => {
  // Note: found empirically based on all multisig P2SH inputs and within m & n allowed limits.
  nbOutputs = nbOutputs ? nbOutputs : 2; // Assume 2 outputs
  const safetyMargin = 0.02;
  const overhead = 4 + 4 + 9 + 9;
  const inputSize = getEstimatedSizeForSingleInput(wallet);
  const outputSize = 34;
  const nbInputs = 1; // Assume 1 input

  const size = overhead + inputSize * nbInputs + outputSize * nbOutputs;
  return parseInt((size * (1 + safetyMargin)).toFixed(0), 10);
};
