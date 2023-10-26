import {
  Key,
  KeyMethods,
  Token,
  TransactionProposal,
  Wallet,
  WalletBalance,
  WalletObj,
} from '../wallet.models';
import {Rates} from '../../rate/rate.models';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {
  BitpaySupportedUtxoCoins,
  OtherBitpaySupportedCoins,
  SUPPORTED_CURRENCIES,
} from '../../../constants/currencies';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import {BwcProvider} from '../../../lib/bwc';
import {GetName, GetPrecision, GetProtocolPrefix} from './currency';
import merge from 'lodash.merge';
import cloneDeep from 'lodash.clonedeep';
import {
  addTokenChainSuffix,
  convertToFiat,
  formatFiatAmount,
  getBadgeImg,
  getCurrencyAbbreviation,
  getRateByCurrencyName,
} from '../../../utils/helper-methods';
import {WALLET_DISPLAY_LIMIT} from '../../../navigation/tabs/home/components/Wallet';
import {Network} from '../../../constants';
import {GetInvoiceCurrency, PayProOptions} from '../effects/paypro/paypro';
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
import {AppDispatch} from '../../../utils/hooks';
import {find, isEqual} from 'lodash';
import {getCurrencyCodeFromCoinAndChain} from '../../../navigation/bitpay-id/utils/bitpay-id-utils';
import {Invoice} from '../../../store/shop/shop.models';

export const mapAbbreviationAndName =
  (
    coin: string,
    chain: string,
    tokenAddress: string | undefined,
  ): Effect<{currencyAbbreviation: string; currencyName: string}> =>
  dispatch => {
    switch (coin) {
      case 'pax':
        return {
          currencyAbbreviation: 'usdp',
          currencyName: dispatch(GetName('usdp', chain, tokenAddress)),
        };
      default:
        return {
          currencyAbbreviation: coin,
          currencyName: dispatch(GetName(coin, chain, tokenAddress)),
        };
    }
  };

// Formatted wallet obj - this is merged with BWC client
export const buildWalletObj = (
  {
    walletId,
    chain,
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
    token,
    keyId,
    network,
    n,
    m,
    hideWallet = false,
    hideBalance = false,
    currencyAbbreviation,
    currencyName,
    img,
    walletName,
    pendingTxps = [],
  }: Credentials & {
    balance?: WalletBalance;
    tokens?: any;
    token?: {
      address: string;
      decimals: number;
      name: string;
      symbol: string;
    };
    hideWallet?: boolean; // ionic migration only
    hideBalance?: boolean; // ionic migration only
    network: Network;
    currencyAbbreviation: string;
    currencyName: string;
    img: any;
    pendingTxps: TransactionProposal[];
  },
  tokenOptsByAddress?: {[key in string]: Token},
): WalletObj => {
  const _currencyAbbreviation = getCurrencyAbbreviation(
    currencyAbbreviation,
    chain,
  );
  const foundToken =
    tokenOptsByAddress &&
    token?.address &&
    tokenOptsByAddress[addTokenChainSuffix(token.address.toLowerCase(), chain)];
  return {
    id: walletId,
    currencyName,
    currencyAbbreviation,
    tokenAddress: token?.address?.toLowerCase(),
    chain,
    walletName,
    balance,
    tokens,
    network,
    keyId: keyId ? keyId : 'readonly',
    img: SUPPORTED_CURRENCIES.includes(_currencyAbbreviation)
      ? CurrencyListIcons[_currencyAbbreviation]
      : foundToken && foundToken?.logoURI
      ? (foundToken?.logoURI as string)
      : img || '',
    badgeImg: getBadgeImg(_currencyAbbreviation, chain),
    n,
    m,
    isRefreshing: false,
    hideWallet,
    hideBalance,
    pendingTxps,
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
  key: KeyMethods | undefined;
  wallets: Wallet[];
  totalBalance?: number;
  totalBalanceLastDay?: number;
  backupComplete?: boolean;
  hideKeyBalance?: boolean;
}): Key => {
  return {
    id: key?.id ? key.id : 'readonly',
    wallets,
    properties: key?.toObj(),
    methods: key,
    totalBalance,
    totalBalanceLastDay,
    isPrivKeyEncrypted: key?.isPrivKeyEncrypted(),
    backupComplete,
    keyName: key?.id ? 'My Key' : 'Read Only',
    hideKeyBalance,
    isReadOnly: !key,
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
    isReadOnly: !key,
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
    chain: string,
    rates: Rates = {},
    tokenAddress: string | undefined,
    customRate?: number,
  ): Effect<number> =>
  dispatch => {
    const ratesPerCurrency = getRateByCurrencyName(
      rates,
      currencyAbbreviation,
      chain,
    );

    if (!ratesPerCurrency) {
      // Rate not found return 0
      console.log(
        `[toFiat] Rate not found for currency: ${currencyAbbreviation}`,
      );
      return 0;
    }

    const rateObj = ratesPerCurrency.find(
      _currency => _currency.code === fiatCode,
    );
    const rate = rateObj && !rateObj.rate ? 1 : rateObj?.rate;
    const fiatRate = customRate || rate;

    if (!fiatRate) {
      // Rate not found for fiat/currency pair
      console.log(
        `[toFiat] Rate not found for fiat/currency pair: ${fiatCode} -> ${currencyAbbreviation}`,
      );
      return 0;
    }

    const precision = dispatch(
      GetPrecision(currencyAbbreviation, chain, tokenAddress),
    );

    if (!precision) {
      // precision not found return 0
      console.log(
        `[toFiat] precision not found for currency ${currencyAbbreviation}`,
      );
      return 0;
    } else {
    }

    return totalAmount * (1 / precision.unitToSatoshi) * fiatRate;
  };

export const findWalletById = (
  wallets: Wallet[],
  id: string,
): Wallet | undefined => wallets.find(wallet => wallet.id === id);

export const findWalletByAddress = (
  address: string,
  chain: string,
  network: string,
  keys: {[key in string]: Key},
): Wallet | undefined => {
  let wallet: Wallet | undefined;
  for (let key of Object.values(keys)) {
    wallet = key.wallets.find(
      w =>
        w.receiveAddress?.toLowerCase() === address.toLowerCase() &&
        w.chain === chain &&
        w.network === network,
    );
    if (wallet) {
      return wallet;
    }
  }
};

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
  key.methods!.checkPassword(password);

export const generateKeyExportCode = (
  key: Key,
  getKeyMnemonic?: string | undefined,
): string => {
  return `1|${getKeyMnemonic}|null|null|${
    key.properties!.mnemonicHasPassphrase
  }|null`;
};

export const isSegwit = (addressType: string): boolean => {
  if (!addressType) {
    return false;
  }

  return addressType === 'P2WPKH' || addressType === 'P2WSH';
};

export const GetProtocolPrefixAddress =
  (
    currencyAbbreviation: string,
    network: string,
    address: string,
    chain: string,
  ): Effect<string> =>
  dispatch => {
    if (currencyAbbreviation !== 'bch') {
      return address;
    }
    return GetProtocolPrefix(network, chain) + ':' + address;
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

  const _chain =
    BitpaySupportedUtxoCoins[account.currency.code.toLowerCase()] ||
    OtherBitpaySupportedCoins[account.currency.code.toLowerCase()]
      ? account.currency.code.toLowerCase()
      : 'eth';
  const _currencyAbbreviation = getCurrencyAbbreviation(
    account.currency.code.toLowerCase(),
    _chain,
  );
  const badgeImg = getBadgeImg(_currencyAbbreviation.toLowerCase(), _chain);
  const currencyImg = CurrencyListIcons[_currencyAbbreviation.toLowerCase()];

  const walletItem = {
    id: account.id,
    currencyName: account.currency.name,
    currencyAbbreviation: account.currency.code,
    coinbaseAccount: account,
    walletName: account.currency.name,
    img: currencyImg,
    cryptoBalance: cryptoAmount,
    cryptoLockedBalance: '',
    fiatBalance: formatFiatAmount(fiatAmount, defaultAltCurrencyIsoCode),
    fiatLockedBalance: '',
    isToken: false,
    network: Network.mainnet,
    pendingTxps: [],
    chain: _chain,
    badgeImg,
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
  invoice,
  skipThreshold = false,
}: {
  coinbaseAccounts: CoinbaseAccountProps[] | null;
  coinbaseExchangeRates: CoinbaseExchangeRatesProps | null;
  coinbaseUser: CoinbaseUserProps | null;
  defaultAltCurrencyIsoCode?: string;
  network?: Network;
  payProOptions?: PayProOptions;
  invoice?: Invoice;
  skipThreshold?: boolean;
}) => {
  const price = invoice?.price || 0;
  const threshold = invoice?.oauth?.coinbase?.threshold || 0;
  const enabled = invoice?.oauth?.coinbase?.enabled || !!skipThreshold;
  if (
    !enabled ||
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
    .filter(
      account =>
        account.balance.amount > 0 &&
        (skipThreshold || (threshold > 0 && threshold >= price)),
    )
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
  rates,
  dispatch,
}: {
  keys: {[key in string]: Key};
  network?: Network;
  payProOptions?: PayProOptions;
  defaultAltCurrencyIsoCode?: string;
  rates: Rates;
  dispatch: AppDispatch;
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
                    getCurrencyCodeFromCoinAndChain(
                      GetInvoiceCurrency(
                        wallet.currencyAbbreviation,
                      ).toLowerCase(),
                      wallet.chain,
                    ) === currency && wallet.network === optionNetwork
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
              currencyAbbreviation,
              hideWallet,
              balance,
              network,
              chain,
              credentials: {walletName: fallbackName},
              walletName,
              tokenAddress,
            } = walletObj;
            return merge(cloneDeep(walletObj), {
              cryptoBalance: balance.crypto,
              fiatBalance: formatFiatAmount(
                convertToFiat(
                  dispatch(
                    toFiat(
                      balance.sat,
                      defaultAltCurrencyIsoCode,
                      currencyAbbreviation,
                      chain,
                      rates,
                      tokenAddress,
                    ),
                  ),
                  hideWallet,
                  network,
                ),
                defaultAltCurrencyIsoCode,
              ),
              cryptoLockedBalance: balance.cryptoLocked,
              fiatLockedBalance: formatFiatAmount(
                convertToFiat(
                  dispatch(
                    toFiat(
                      balance.satLocked,
                      defaultAltCurrencyIsoCode,
                      currencyAbbreviation,
                      chain,
                      rates,
                      tokenAddress,
                    ),
                  ),
                  hideWallet,
                  network,
                ),
                defaultAltCurrencyIsoCode,
              ),
              network,
              walletName: walletName || fallbackName,
            });
          }),
      };
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
    invoice,
    skipThreshold = false,
  }: {
    keys: {[key in string]: Key};
    network?: Network;
    payProOptions?: PayProOptions;
    defaultAltCurrencyIsoCode?: string;
    invoice?: Invoice;
    skipThreshold?: boolean;
  }): Effect<WalletsAndAccounts> =>
  (dispatch, getState) => {
    const {COINBASE} = getState();
    const {
      RATE: {rates},
    } = getState();
    const keyWallets = BuildKeysAndWalletsList({
      keys,
      network,
      payProOptions,
      defaultAltCurrencyIsoCode,
      rates,
      dispatch,
    }).map(key => {
      key.wallets = key.wallets.filter(({balance}) => balance.sat > 0);
      return key;
    });
    // Coinbase
    const coinbaseAccounts = COINBASE.accounts[COINBASE_ENV];
    const coinbaseUser = COINBASE.user[COINBASE_ENV];
    const coinbaseExchangeRates = COINBASE.exchangeRates;
    const coinbaseWallets = BuildCoinbaseWalletsList({
      coinbaseAccounts,
      coinbaseUser,
      coinbaseExchangeRates,
      network,
      payProOptions,
      defaultAltCurrencyIsoCode,
      invoice,
      skipThreshold,
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
  if (key1.fingerPrint && key2.properties!.fingerPrint) {
    return key1.fingerPrint === key2.properties!.fingerPrint;
  } else {
    return key1.id === key2.id;
  }
};

export const getMatchedKey = (key: any, keys: Key[]) => {
  return keys.find(k => isMatch(key, k));
};

export const getReadOnlyKey = (keys: Key[]) => {
  return keys.find(k => k.id === 'readonly');
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

export const findKeyByKeyId = (
  keyId: string,
  keys: {[key in string]: Key},
): Promise<Key> => {
  return new Promise(async (resolve, reject) => {
    try {
      await Promise.all(
        Object.values(keys).map(key => {
          if (key.id === keyId) {
            return resolve(key);
          }
        }),
      );
    } catch (err) {
      reject(err);
    }
  });
};

export const getAllWalletClients = (keys: {
  [key in string]: Key;
}): Promise<Wallet[]> => {
  return new Promise(async (resolve, reject) => {
    const walletClients: any[] = [];
    try {
      await Promise.all(
        Object.values(keys).map(key => {
          key.wallets
            .filter(
              wallet =>
                !wallet.credentials.token && wallet.credentials.isComplete(),
            )
            .forEach(walletClient => {
              walletClients.push(walletClient);
            });
        }),
      );
      resolve(walletClients);
    } catch (err) {
      reject(err);
    }
  });
};

export const findWalletByIdHashed = (
  keys: {[key in string]: Key},
  walletIdHashed: string,
  tokenAddress: string | null | undefined,
  multisigContractAddress?: string,
): Promise<{wallet: Wallet | undefined; keyId: string | undefined}> => {
  let walletIdHash;
  const sjcl = BwcProvider.getInstance().getSJCL();
  return new Promise(resolve => {
    getAllWalletClients(keys).then(wallets => {
      const wallet = find(wallets, w => {
        if (
          (tokenAddress && tokenAddress !== 'null') ||
          (multisigContractAddress && multisigContractAddress !== 'null')
        ) {
          const walletId = w.credentials.walletId;
          const lastHyphenPosition = walletId.lastIndexOf('-');
          const walletIdWithoutTokenAddress = walletId.substring(
            0,
            lastHyphenPosition,
          );
          walletIdHash = sjcl.hash.sha256.hash(walletIdWithoutTokenAddress);
        } else {
          walletIdHash = sjcl.hash.sha256.hash(w.credentials.walletId);
        }
        return isEqual(walletIdHashed, sjcl.codec.hex.fromBits(walletIdHash));
      });

      return resolve({wallet, keyId: wallet?.keyId});
    });
  });
};
