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
import {GetName, GetPrecision, GetProtocolPrefix} from './currency';
import merge from 'lodash.merge';
import cloneDeep from 'lodash.clonedeep';
import {formatFiatAmount} from '../../../utils/helper-methods';
import {WALLET_DISPLAY_LIMIT} from '../../../navigation/tabs/home/components/Wallet';
import {Network} from '../../../constants';
import {PayProOptions} from '../effects/paypro/paypro';
import {Effect} from '../..';

const mapAbbreviationAndName =
  (
    coin: string,
  ): Effect<{currencyAbbreviation: string; currencyName: string}> =>
  dispatch => {
    switch (coin) {
      case 'pax':
        return {
          currencyAbbreviation: 'usdp',
          currencyName: dispatch(GetName(coin)),
        };
      default:
        return {
          currencyAbbreviation: coin,
          currencyName: dispatch(GetName(coin)),
        };
    }
  };

// Formatted wallet obj - this is merged with BWC client
export const buildWalletObj =
  (
    {
      walletId,
      coin,
      balance = {
        crypto: '0',
        cryptoLocked: '0',
        fiat: 0,
        fiatLastDay: 0,
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
  ): Effect<WalletObj> =>
  dispatch => {
    const {currencyName, currencyAbbreviation} = dispatch(
      mapAbbreviationAndName(coin),
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
        : tokenOpts && tokenOpts[currencyAbbreviation]?.logoURI
        ? (tokenOpts[currencyAbbreviation].logoURI as string)
        : '',
      n,
      m,
      isRefreshing: false,
      hideWallet: false,
      hideBalance: false,
      pendingTxps: [],
    };
  };

// Formatted key Obj
export const buildKeyObj = ({
  key,
  wallets,
  totalBalance = 0,
  totalBalanceLastDay = 0,
  backupComplete = false,
}: {
  key: KeyMethods;
  wallets: Wallet[];
  totalBalance?: number;
  totalBalanceLastDay?: number;
  backupComplete?: boolean;
}): Key => {
  return {
    id: key.id,
    wallets,
    properties: key.toObj(),
    methods: key,
    totalBalance,
    totalBalanceLastDay,
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

export const toFiat =
  (
    totalAmount: number,
    fiatCode: string = 'USD',
    currencyAbbreviation: string,
    rates: Rates = {},
    customRate?: number,
  ): Effect<number> =>
  dispatch => {
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

    const precision = dispatch(GetPrecision(currencyAbbreviation));

    if (!precision) {
      throw Error(`precision not found for currency ${currencyAbbreviation}`);
    } else {
    }

    return totalAmount * (1 / precision.unitToSatoshi) * fiatRate;
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

export const GetProtocolPrefixAddress =
  (coin: string, network: string, address: string): Effect<string> =>
  dispatch => {
    if (coin !== 'bch') {
      return address;
    }
    return dispatch(GetProtocolPrefix(coin, network)) + ':' + address;
  };

export const getRemainingWalletCount = (
  wallets?: Wallet[],
): undefined | number => {
  if (!wallets || wallets.length < WALLET_DISPLAY_LIMIT) {
    return;
  }
  return wallets.length - WALLET_DISPLAY_LIMIT;
};

export const BuildKeysAndWalletsList = ({
  keys,
  network,
  payProOptions,
  defaultAltCurrencyIsoCode = 'USD',
}: {
  keys: {[key in string]: Key};
  network?: Network;
  payProOptions?: PayProOptions;
  defaultAltCurrencyIsoCode?: string;
}) => {
  return Object.keys(keys)
    .map(keyId => {
      const keyObj = keys[keyId];
      const paymentOptions =
        payProOptions?.paymentOptions?.filter(option => option.selected) ||
        payProOptions?.paymentOptions;
      return {
        key: keyId,
        keyName: keyObj.keyName || 'My Key',
        wallets: keys[keyId].wallets
          .filter(wallet => {
            if (paymentOptions) {
              return paymentOptions.some(
                ({currency, network: optionNetwork}) => {
                  return (
                    wallet.currencyAbbreviation === currency.toLowerCase() &&
                    wallet.network === optionNetwork
                  );
                },
              );
            }
            if (network) {
              return network === wallet.network;
            }
            return true;
          })
          .map(walletObj => {
            const {
              balance,
              credentials: {network},
            } = walletObj;
            return merge(cloneDeep(walletObj), {
              cryptoBalance: balance.crypto,
              fiatBalance: formatFiatAmount(
                balance.fiat,
                defaultAltCurrencyIsoCode,
              ),
              cryptoLockedBalance: balance.cryptoLocked,
              fiatLockedBalance: formatFiatAmount(
                balance.fiatLocked,
                defaultAltCurrencyIsoCode,
              ),
              network,
            });
          }),
      };
    })
    .map(key => {
      key.wallets = key.wallets.filter(({balance}) => balance.sat > 0);
      return key;
    })
    .filter(key => key.wallets.length);
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
  nbInputs?: number,
): number => {
  // Note: found empirically based on all multisig P2SH inputs and within m & n allowed limits.
  nbOutputs = nbOutputs ? nbOutputs : 2; // Assume 2 outputs
  const safetyMargin = 0.02;
  const overhead = 4 + 4 + 9 + 9;
  const inputSize = getEstimatedSizeForSingleInput(wallet);
  const outputSize = 34;
  nbInputs = nbInputs ? nbInputs : 1; // Assume 1 input

  const size = overhead + inputSize * nbInputs + outputSize * nbOutputs;
  return parseInt((size * (1 + safetyMargin)).toFixed(0), 10);
};

export const isMatch = (key1: any, key2: Key) => {
  // return this.Key.match(key1, key2); TODO needs to be fixed on bwc
  if (key1.fingerPrint && key2.properties.fingerPrint) {
    return key1.fingerPrint === key2.properties.fingerPrint;
  } else {
    return key1.id === key2.id;
  }
};

export const getMatchedKey = (key: any, keys: Key[]) => {
  return keys.find(k => isMatch(key, k));
};

export const findMatchedKeyAndUpdate = (
  wallets: Wallet[],
  key: any,
  keys: Key[],
  opts: any,
): {key: KeyMethods; wallets: Wallet[]} => {
  if (!opts.keyId) {
    const matchedKey = getMatchedKey(key, keys);

    if (matchedKey) {
      key = matchedKey.methods;
      wallets.forEach(wallet => {
        wallet.credentials.keyId = wallet.keyId = matchedKey.id;
      });
    }
  }

  return {key, wallets};
};
