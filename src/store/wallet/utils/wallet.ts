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
import {SUPPORTED_CURRENCIES} from '../../../constants/currencies';
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
import {
  CoinbaseAccountProps,
  CoinbaseExchangeRatesProps,
  CoinbaseUserProps,
} from '../../../api/coinbase/coinbase.types';
import {coinbaseGetFiatAmount} from '../../coinbase';
import {WalletRowProps} from '../../../components/list/WalletRow';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import {
  KeyWallet,
  KeyWalletsRowProps,
} from '../../../components/list/KeyWalletsRow';

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
        crypto: '0.00',
        cryptoLocked: '0.00',
        cryptoConfirmedLocked: '0.00',
        cryptoSpendable: '0.00',
        cryptoPending: '0.00',
        fiat: 0,
        fiatLastDay: 0,
        fiatLocked: 0,
        fiatConfirmedLocked: 0,
        fiatSpendable: 0,
        fiatPending: 0,
        sat: 0,
        satAvailable: 0,
        satLocked: 0,
        satConfirmedLocked: 0,
        satConfirmed: 0,
        satConfirmedAvailable: 0,
        satSpendable: 0,
        satPending: 0,
      },
      tokens,
      keyId,
      network,
      n,
      m,
      hideWallet = false,
      hideBalance = false,
    }: Credentials & {
      balance?: WalletBalance;
      tokens?: any;
      hideWallet?: boolean; // ionic migration only
      hideBalance?: boolean; // ionic migration only
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
      hideWallet,
      hideBalance,
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
  hideKeyBalance = false,
}: {
  key: KeyMethods;
  wallets: Wallet[];
  totalBalance?: number;
  totalBalanceLastDay?: number;
  backupComplete?: boolean;
  hideKeyBalance: boolean;
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
    hideKeyBalance,
  };
};

export const buildMigrationKeyObj = ({
  key,
  wallets,
  totalBalance = 0,
  totalBalanceLastDay = 0,
  backupComplete,
  keyName = 'My Key',
}: {
  key: any;
  wallets: Wallet[];
  backupComplete: boolean;
  keyName: string | undefined;
  totalBalance?: number;
  totalBalanceLastDay?: number;
}): Key => {
  return {
    id: key.id,
    wallets,
    properties: key.methods.toObj(),
    methods: key.methods,
    totalBalance,
    totalBalanceLastDay,
    isPrivKeyEncrypted: key.methods.isPrivKeyEncrypted(),
    backupComplete,
    keyName,
    hideKeyBalance: false,
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

    const rateObj = ratesPerCurrency.find(
      _currency => _currency.code === fiatCode,
    );
    const rate = rateObj && !rateObj.rate ? 1 : rateObj?.rate;
    const fiatRate = customRate || rate;

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
  return `1|${getKeyMnemonic}|null|null|${key.properties.mnemonicHasPassphrase}|null`;
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

export const coinbaseAccountToWalletRow = (
  account: CoinbaseAccountProps,
  exchangeRates: CoinbaseExchangeRatesProps | null,
  defaultAltCurrencyIsoCode = 'USD',
) => {
  const fiatAmount = coinbaseGetFiatAmount(
    account.balance.amount,
    account.balance.currency,
    exchangeRates,
  );
  const cryptoAmount = Number(account.balance.amount)
    ? account.balance.amount
    : '0';

  const walletItem = {
    id: account.id,
    currencyName: account.currency.name,
    currencyAbbreviation: account.currency.code,
    coinbaseAccount: account,
    walletName: account.currency.name,
    img: CurrencyListIcons[account.currency.code.toLowerCase()],
    cryptoBalance: cryptoAmount,
    cryptoLockedBalance: '',
    fiatBalance: formatFiatAmount(fiatAmount, defaultAltCurrencyIsoCode),
    fiatLockedBalance: '',
    isToken: false,
    network: Network.mainnet,
    pendingTxps: [],
  };
  return walletItem as WalletRowProps;
};

export const BuildCoinbaseWalletsList = ({
  coinbaseAccounts,
  coinbaseExchangeRates,
  coinbaseUser,
  defaultAltCurrencyIsoCode = 'USD',
  network,
  payProOptions,
}: {
  coinbaseAccounts: CoinbaseAccountProps[] | null;
  coinbaseExchangeRates: CoinbaseExchangeRatesProps | null;
  coinbaseUser: CoinbaseUserProps | null;
  defaultAltCurrencyIsoCode?: string;
  network?: Network;
  payProOptions?: PayProOptions;
}) => {
  if (
    !coinbaseAccounts ||
    !coinbaseUser ||
    !coinbaseExchangeRates ||
    network === Network.testnet
  ) {
    return [];
  }
  const selectedPaymentOptions = payProOptions?.paymentOptions?.filter(
    option => option.selected,
  );
  const paymentOptions = selectedPaymentOptions?.length
    ? selectedPaymentOptions
    : payProOptions?.paymentOptions;
  const wallets = coinbaseAccounts
    .filter(account => account.balance.amount > 0)
    .filter(
      account =>
        !paymentOptions?.length ||
        paymentOptions.some(
          ({currency, network}) =>
            account.currency.code.toLowerCase() === currency.toLowerCase() &&
            network === Network.mainnet,
        ),
    )
    .map(account =>
      coinbaseAccountToWalletRow(
        account,
        coinbaseExchangeRates,
        defaultAltCurrencyIsoCode,
      ),
    );
  return [
    {
      key: coinbaseUser.data.id,
      keyName: `${coinbaseUser.data.name}'s Coinbase Account`,
      wallets,
    },
  ].filter(key => key.wallets.length);
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
  const selectedPaymentOptions = payProOptions?.paymentOptions?.filter(
    option => option.selected,
  );
  const paymentOptions = selectedPaymentOptions?.length
    ? selectedPaymentOptions
    : payProOptions?.paymentOptions;
  return Object.keys(keys)
    .map(keyId => {
      const keyObj = keys[keyId];
      return {
        key: keyId,
        keyName: keyObj.keyName || 'My Key',
        wallets: keys[keyId].wallets
          .filter(wallet => !wallet.hideWallet)
          .filter(wallet => {
            if (paymentOptions?.length) {
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
              credentials: {network, walletName: fallbackName},
              walletName,
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
              walletName: walletName || fallbackName,
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

export interface WalletsAndAccounts {
  keyWallets: KeyWalletsRowProps<KeyWallet>[];
  coinbaseWallets: KeyWalletsRowProps<WalletRowProps>[];
}

export const BuildPayProWalletSelectorList =
  ({
    keys,
    network,
    payProOptions,
    defaultAltCurrencyIsoCode = 'USD',
  }: {
    keys: {[key in string]: Key};
    network?: Network;
    payProOptions?: PayProOptions;
    defaultAltCurrencyIsoCode?: string;
  }): Effect<WalletsAndAccounts> =>
  (_, getState) => {
    const {COINBASE} = getState();
    const coinbaseAccounts = COINBASE.accounts[COINBASE_ENV];
    const coinbaseUser = COINBASE.user[COINBASE_ENV];
    const coinbaseExchangeRates = COINBASE.exchangeRates;
    const keyWallets = BuildKeysAndWalletsList({
      keys,
      network,
      payProOptions,
      defaultAltCurrencyIsoCode,
    });
    const coinbaseWallets = BuildCoinbaseWalletsList({
      coinbaseAccounts,
      coinbaseUser,
      coinbaseExchangeRates,
      network,
      payProOptions,
      defaultAltCurrencyIsoCode,
    });
    return {keyWallets, coinbaseWallets};
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

export const isMatchedWallet = (newWallet: Wallet, wallets: Wallet[]) => {
  return wallets.find(
    wallet => wallet.credentials.walletId === newWallet.credentials.walletId,
  );
};
