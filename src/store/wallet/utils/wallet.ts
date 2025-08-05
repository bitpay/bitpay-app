import {
  Key,
  KeyMethods,
  SupportedHardwareSource,
  Token,
  TransactionProposal,
  Wallet,
  WalletBalance,
  WalletObj,
} from '../wallet.models';
import {Rates} from '../../rate/rate.models';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {
  BitpaySupportedCoins,
  BitpaySupportedMaticTokens,
  BitpaySupportedUtxoCoins,
  OtherBitpaySupportedCoins,
} from '../../../constants/currencies';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import {BwcProvider} from '../../../lib/bwc';
import {
  GetName,
  GetPrecision,
  GetProtocolPrefix,
  IsERCToken,
  IsSVMChain,
  IsVMChain,
} from './currency';
import {
  addTokenChainSuffix,
  convertToFiat,
  formatCurrencyAbbreviation,
  formatFiat,
  formatFiatAmount,
  getBadgeImg,
  getCurrencyAbbreviation,
  getRateByCurrencyName,
} from '../../../utils/helper-methods';
import {WALLET_DISPLAY_LIMIT} from '../../../navigation/tabs/home/components/Wallet';
import {Network} from '../../../constants';
import {
  GetInvoiceCurrency,
  PayProOptions,
  PayProPaymentOption,
} from '../effects/paypro/paypro';
import {Effect} from '../..';
import {
  CoinbaseAccountProps,
  CoinbaseExchangeRatesProps,
  CoinbaseUserProps,
} from '../../../api/coinbase/coinbase.types';
import {coinbaseGetFiatAmount} from '../../coinbase';
import {WalletRowProps} from '../../../components/list/WalletRow';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import {KeyWalletsRowProps} from '../../../components/list/KeyWalletsRow';
import {AppDispatch} from '../../../utils/hooks';
import _, {find, isEqual} from 'lodash';
import {getCurrencyCodeFromCoinAndChain} from '../../../navigation/bitpay-id/utils/bitpay-id-utils';
import {Invoice} from '../../../store/shop/shop.models';
import {AccountRowProps} from '../../../components/list/AccountListRow';
import {
  AssetsByChainData,
  AssetsByChainListProps,
} from '../../../navigation/wallet/screens/AccountDetails';
import uniqBy from 'lodash.uniqby';
import cloneDeep from 'lodash.clonedeep';

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
      case 'matic':
        return {
          currencyAbbreviation: 'pol',
          currencyName: dispatch(GetName('pol', chain, tokenAddress)),
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
    hideWalletByAccount = false,
    hideBalance = false,
    currencyAbbreviation,
    currencyName,
    img,
    walletName,
    pendingTxps = [],
    isHardwareWallet = false,
    hardwareData = {},
    singleAddress,
    receiveAddress,
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
    hideWalletByAccount?: boolean;
    hideBalance?: boolean; // ionic migration only
    network: Network;
    currencyAbbreviation: string;
    currencyName: string;
    img: any;
    pendingTxps: TransactionProposal[];
    isHardwareWallet?: boolean;
    hardwareData?: {
      accountPath?: string;
    };
    singleAddress: boolean;
    receiveAddress?: string;
  },
  tokenOptsByAddress?: {[key in string]: Token},
): WalletObj => {
  let updatedCurrencyAbbreviation = currencyAbbreviation;
  // Only for USDC.e
  const usdcToken = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
  if (token?.address && cloneDeep(token.address)?.toLowerCase() === usdcToken) {
    const tokenAddressSuffix = addTokenChainSuffix(token.address, chain);
    updatedCurrencyAbbreviation =
      BitpaySupportedMaticTokens[tokenAddressSuffix].coin;
  }
  const _currencyAbbreviation = getCurrencyAbbreviation(
    updatedCurrencyAbbreviation,
    chain,
  );

  let foundToken;
  if (tokenOptsByAddress && token?.address) {
    foundToken = tokenOptsByAddress[addTokenChainSuffix(token.address, chain)];
  }

  const currencyImg = CurrencyListIcons[_currencyAbbreviation]
    ? CurrencyListIcons[_currencyAbbreviation]
    : foundToken && foundToken?.logoURI
    ? (foundToken?.logoURI as string)
    : img || '';

  return {
    id: walletId,
    currencyName,
    currencyAbbreviation: updatedCurrencyAbbreviation,
    tokenAddress: IsSVMChain(chain)
      ? token?.address
      : token?.address?.toLowerCase(),
    chain,
    chainName: BitpaySupportedCoins[chain].name,
    walletName,
    balance,
    tokens,
    network,
    keyId: keyId ? keyId : 'readonly',
    img: currencyImg,
    badgeImg: getBadgeImg(_currencyAbbreviation, chain),
    n,
    m,
    isRefreshing: false,
    isScanning: false,
    hideWallet,
    hideWalletByAccount,
    hideBalance,
    pendingTxps,
    isHardwareWallet,
    hardwareData,
    singleAddress,
    receiveAddress,
  };
};

// Formatted key Obj
export const buildKeyObj = ({
  key,
  wallets,
  keyName,
  totalBalance = 0,
  totalBalanceLastDay = 0,
  backupComplete = false,
  hideKeyBalance = false,
  hardwareSource,
}: {
  key: KeyMethods | undefined;
  wallets: Wallet[];
  keyName?: string | undefined;
  totalBalance?: number;
  totalBalanceLastDay?: number;
  backupComplete?: boolean;
  hideKeyBalance?: boolean;
  hardwareSource?: SupportedHardwareSource;
}): Key => {
  return {
    id: key?.id
      ? key.id
      : hardwareSource
      ? `readonly/${hardwareSource}`
      : 'readonly',
    wallets,
    properties: key?.toObj(),
    methods: key,
    totalBalance,
    totalBalanceLastDay,
    isPrivKeyEncrypted: key?.isPrivKeyEncrypted(),
    backupComplete,
    keyName: keyName
      ? keyName
      : key?.id
      ? 'My Key'
      : hardwareSource
      ? `My ${hardwareSource.charAt(0).toUpperCase()}${hardwareSource.slice(1)}`
      : 'Read Only',
    hideKeyBalance,
    isReadOnly: !key,
    hardwareSource,
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
    isPrivKeyEncrypted: checkPrivateKeyEncrypted(key),
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
    const precision = dispatch(
      GetPrecision(currencyAbbreviation, chain, tokenAddress),
    );

    if (customRate && precision) {
      return totalAmount * (1 / precision.unitToSatoshi) * customRate;
    }
    const ratesPerCurrency = getRateByCurrencyName(
      rates,
      currencyAbbreviation,
      chain,
      tokenAddress,
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
    const fiatRate = rateObj && !rateObj.rate ? 0 : rateObj?.rate;

    if (!fiatRate) {
      // Rate not found for fiat/currency pair
      console.log(
        `[toFiat] Rate not found or zero for fiat/currency pair: ${fiatCode} -> ${currencyAbbreviation}`,
      );
      return 0;
    }

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
  wallets: Wallet[] | WalletRowProps[],
  id: string,
  copayerId?: string,
): Wallet | WalletRowProps | undefined =>
  wallets.find(
    wallet =>
      wallet.id === id &&
      (!copayerId ||
        (wallet as WalletRowProps).copayerId === copayerId ||
        (wallet as Wallet).credentials?.copayerId === copayerId),
  );

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

// Checking only one algorithm should be enough
export const checkEncryptPassword = (key: Key, password: string) =>
  key?.methods?.checkPassword(password);

// Checking only one algorithm should be enough
export const checkPrivateKeyEncrypted = (key: Key): boolean =>
  key?.methods?.isPrivKeyEncrypted();

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

export const isTaproot = (addressType: string): boolean => {
  if (!addressType) {
    return false;
  }

  return addressType === 'P2TR';
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
  wallets?: Wallet[] | WalletRowProps[],
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
  const currencyImg = CurrencyListIcons[_currencyAbbreviation.toLowerCase()];

  const walletItem = {
    id: account.id,
    currencyName: account.currency.name,
    currencyAbbreviation: account.currency.code,
    coinbaseAccount: account,
    walletName: account.currency.name,
    img: currencyImg,
    cryptoBalance: cryptoAmount,
    cryptoConfirmedLockedBalance: '',
    cryptoLockedBalance: '',
    cryptoPendingBalance: '',
    cryptoSpendableBalance: cryptoAmount,
    fiatBalance: fiatAmount,
    fiatBalanceFormat: formatFiatAmount(fiatAmount, defaultAltCurrencyIsoCode),
    fiatLockedBalance: 0,
    isToken: false,
    network: Network.mainnet,
    pendingTxps: [],
    chain: _chain,
    isComplete: true,
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
      coinbaseAccounts: wallets,
    },
  ].filter(key => key.coinbaseAccounts.length);
};

export const BuildKeysAndWalletsList = ({
  keys,
  network,
  payProOptions,
  defaultAltCurrencyIsoCode = 'USD',
  filterWalletsByBalance = true,
  rates,
  dispatch,
}: {
  keys: {[key in string]: Key};
  network?: Network;
  payProOptions?: PayProOptions;
  defaultAltCurrencyIsoCode?: string;
  filterWalletsByBalance?: boolean;
  rates: Rates;
  dispatch: AppDispatch;
}) => {
  const paymentOptions = payProOptions?.paymentOptions;
  const keysWallets = Object.keys(keys).map((keyId: string) => {
    const key = keys[keyId];
    const updatedKey = {
      ...key,
      wallets: keys[keyId].wallets,
    };
    const accountList = buildAccountList(
      updatedKey,
      defaultAltCurrencyIsoCode,
      rates,
      dispatch,
      {
        paymentOptions,
        filterWalletsByPaymentOptions: true,
        filterByHideWallet: true,
        filterWalletsByBalance,
        network,
      },
    );
    const mergedAccounts = accountList
      .map(account => {
        if (IsVMChain(account.chains[0])) {
          const assetsByChain = buildAssetsByChain(
            account,
            defaultAltCurrencyIsoCode,
          );
          return {...account, assetsByChain};
        }
        return account.wallets;
      })
      .filter(Boolean) as (
      | WalletRowProps[]
      | (AccountRowProps & {
          assetsByChain?: AssetsByChainData[];
        })
    )[];

    const getMaxFiatBalanceWallet = (
      wallets: WalletRowProps[],
      defaultWallet: any,
    ) => {
      return wallets.reduce(
        (max, w) =>
          w?.fiatBalance && w.fiatBalance > max.fiatBalance ? w : max,
        defaultWallet,
      );
    };

    const flatMergedAccounts = Object.values(mergedAccounts).flat();
    const accounts = flatMergedAccounts.filter(a => {
      !a.chain;
    });

    const mergedUtxoAndEvmAccounts = flatMergedAccounts.sort((a, b) => {
      const chainA = a.chains?.[0] ?? a.chain ?? '';
      const chainB = b.chains?.[0] ?? b.chain ?? '';
      const isEVMA = IsVMChain(chainA);
      const isEVMB = IsVMChain(chainB);

      const walletA = isEVMA
        ? getMaxFiatBalanceWallet(
            (a as AccountRowProps).wallets,
            (a as AccountRowProps).wallets[0],
          )
        : getMaxFiatBalanceWallet(
            flatMergedAccounts.filter(
              wallet => wallet?.chain === a.chain,
            ) as WalletRowProps[],
            a,
          );

      const walletB = isEVMB
        ? getMaxFiatBalanceWallet(
            (b as AccountRowProps).wallets,
            (b as AccountRowProps).wallets[0],
          )
        : getMaxFiatBalanceWallet(
            flatMergedAccounts.filter(
              wallet => wallet?.chain === b.chain,
            ) as WalletRowProps[],
            b,
          );

      const balanceA = walletA.fiatBalance || 0;
      const balanceB = walletB.fiatBalance || 0;

      return balanceB - balanceA;
    }) as
      | WalletRowProps[]
      | (AccountRowProps & {assetsByChain?: AssetsByChainData[]});

    return {
      key: keyId,
      keyName: key.keyName || 'My Key',
      backupComplete: key.backupComplete,
      accounts,
      mergedUtxoAndEvmAccounts,
    };
  });
  return keysWallets;
};

export interface WalletsAndAccounts {
  keyWallets: KeyWalletsRowProps[];
  coinbaseWallets: KeyWalletsRowProps[];
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
  return keys.find(k => k.id.includes('readonly'));
};

export const findMatchedKeyAndUpdate = (
  wallets: Wallet[],
  key: any,
  keys: Key[],
  opts: any,
): {key: KeyMethods; wallets: Wallet[]; keyName?: string | undefined} => {
  let _keyName: string | undefined;
  if (!opts.keyId) {
    const matchedKey = getMatchedKey(key, keys);

    if (matchedKey) {
      key = matchedKey.methods;
      _keyName = matchedKey.keyName;
      wallets.forEach(wallet => {
        wallet.credentials.keyId = wallet.keyId = matchedKey.id;

        const walletToKeepName = matchedKey.wallets.find(
          w => w.id === wallet.credentials.walletId,
        );
        wallet.credentials.walletName = walletToKeepName?.walletName
          ? walletToKeepName.walletName
          : wallet.credentials.walletName;
      });
    }
  }

  return {key, wallets, keyName: _keyName};
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

type getFiatOptions = {
  dispatch: AppDispatch;
  satAmount: number;
  defaultAltCurrencyIsoCode: string;
  currencyAbbreviation: string;
  chain: string;
  rates: Rates;
  tokenAddress: string | undefined;
  hideWallet: boolean | undefined;
  hideWalletByAccount: boolean | undefined;
  network: Network;
  currencyDisplay?: 'symbol' | 'code';
};

const getFiat = ({
  dispatch,
  satAmount,
  defaultAltCurrencyIsoCode,
  currencyAbbreviation,
  chain,
  rates,
  tokenAddress,
  hideWallet,
  hideWalletByAccount,
  network,
}: getFiatOptions) =>
  convertToFiat(
    dispatch(
      toFiat(
        satAmount,
        defaultAltCurrencyIsoCode,
        currencyAbbreviation,
        chain,
        rates,
        tokenAddress,
      ),
    ),
    hideWallet,
    hideWalletByAccount,
    network,
  );

export const buildUIFormattedWallet: (
  wallet: Wallet,
  defaultAltCurrencyIsoCode: string,
  rates: Rates,
  dispatch: AppDispatch,
  currencyDisplay?: 'symbol',
  skipFiatCalculations?: boolean,
) => WalletRowProps = (
  wallet,
  defaultAltCurrencyIsoCode,
  rates,
  dispatch,
  currencyDisplay,
  skipFiatCalculations,
) => {
  const {
    id,
    img,
    badgeImg,
    currencyName,
    chainName,
    currencyAbbreviation,
    chain,
    tokenAddress,
    network,
    walletName,
    balance,
    credentials,
    keyId,
    isRefreshing,
    isScanning,
    hideWallet,
    hideWalletByAccount,
    hideBalance,
    pendingTxps,
    receiveAddress,
  } = wallet;

  const opts: Omit<getFiatOptions, 'satAmount'> = {
    dispatch,
    defaultAltCurrencyIsoCode,
    currencyAbbreviation,
    chain,
    rates,
    tokenAddress,
    hideWallet,
    hideWalletByAccount,
    network,
    currencyDisplay,
  };

  const buildUIFormattedWallet = {
    id,
    keyId,
    img,
    badgeImg,
    currencyName,
    chainName,
    currencyAbbreviation: formatCurrencyAbbreviation(currencyAbbreviation),
    chain,
    walletName: walletName || credentials.walletName,
    cryptoBalance: balance.crypto,
    cryptoLockedBalance: balance.cryptoLocked,
    cryptoConfirmedLockedBalance: balance.cryptoConfirmedLocked,
    cryptoSpendableBalance: balance.cryptoSpendable,
    cryptoPendingBalance: balance.cryptoPending,
    network,
    isRefreshing,
    isScanning,
    hideWallet,
    hideWalletByAccount,
    hideBalance,
    pendingTxps,
    multisig:
      credentials.n > 1
        ? `- Multisig ${credentials.m}/${credentials.n}`
        : undefined,
    isComplete: credentials.isComplete(),
    receiveAddress,
    account: credentials.account,
  } as WalletRowProps;

  if (!skipFiatCalculations) {
    const computeAndFormatFiatBalance = (satAmount: number) => {
      const fiatAmount = getFiat({...opts, satAmount});
      return {
        fiatAmount,
        formatted: formatFiat({
          fiatAmount,
          defaultAltCurrencyIsoCode,
          currencyDisplay,
        }),
      };
    };

    const fiatBalanceData = computeAndFormatFiatBalance(balance.sat);
    const fiatLockedBalanceData = computeAndFormatFiatBalance(
      balance.satLocked,
    );
    const fiatConfirmedLockedBalanceData = computeAndFormatFiatBalance(
      balance.satConfirmedLocked,
    );
    const fiatSpendableBalanceData = computeAndFormatFiatBalance(
      balance.satSpendable,
    );
    const fiatPendingBalanceData = computeAndFormatFiatBalance(
      balance.satPending,
    );
    buildUIFormattedWallet.fiatBalance = fiatBalanceData.fiatAmount;
    buildUIFormattedWallet.fiatLockedBalance = fiatLockedBalanceData.fiatAmount;
    buildUIFormattedWallet.fiatConfirmedLockedBalance =
      fiatConfirmedLockedBalanceData.fiatAmount;
    buildUIFormattedWallet.fiatSpendableBalance =
      fiatSpendableBalanceData.fiatAmount;
    buildUIFormattedWallet.fiatPendingBalance =
      fiatPendingBalanceData.fiatAmount;

    buildUIFormattedWallet.fiatBalanceFormat = fiatBalanceData.formatted;
    buildUIFormattedWallet.fiatLockedBalanceFormat =
      fiatLockedBalanceData.formatted;
    buildUIFormattedWallet.fiatConfirmedLockedBalanceFormat =
      fiatConfirmedLockedBalanceData.formatted;
    buildUIFormattedWallet.fiatSpendableBalanceFormat =
      fiatSpendableBalanceData.formatted;
    buildUIFormattedWallet.fiatPendingBalanceFormat =
      fiatPendingBalanceData.formatted;
  }

  return buildUIFormattedWallet;
};

export const buildAccountList = (
  key: Key,
  defaultAltCurrencyIsoCode: string,
  rates: Rates,
  dispatch: AppDispatch,
  opts?: {
    skipFiatCalculations?: boolean;
    filterByHideWallet?: boolean; // used for hidden wallets and also accounts
    filterWalletsByBalance?: boolean;
    filterWalletsByChain?: boolean;
    filterWalletsByPaymentOptions?: boolean;
    filterByWalletOptions?: boolean;
    filterByComplete?: boolean;
    filterByCurrencyAbbreviation?: boolean;
    paymentOptions?: PayProPaymentOption[] | undefined;
    network?: Network | undefined;
    chain?: string | undefined;
    currencyAbbreviation?: string | undefined;
    walletId?: string | undefined;
    searchInput?: string | undefined;
    filterByCustomWallets?: Wallet[] | undefined;
  },
) => {
  const accountMap: {[key: string]: Partial<AccountRowProps>} = {};

  const formatBalance = (fiatAmount: number) =>
    formatFiat({
      fiatAmount,
      defaultAltCurrencyIsoCode,
      currencyDisplay: 'symbol',
    });

  const wallets = uniqBy(
    opts?.filterByCustomWallets || key?.wallets,
    wallet => wallet.id,
  );

  wallets.forEach(wallet => {
    if (opts?.filterByHideWallet && wallet.hideWallet) {
      return;
    }

    if (opts?.filterWalletsByBalance && wallet.balance.sat <= 0) {
      return;
    }

    if (opts?.filterWalletsByChain && opts?.chain !== wallet.chain) {
      return;
    }

    if (opts?.filterWalletsByPaymentOptions) {
      if (opts?.paymentOptions?.length) {
        const matchesPaymentOption = opts.paymentOptions.some(
          ({network: optionNetwork}) => {
            return wallet.network === optionNetwork;
          },
        );
        if (!matchesPaymentOption) {
          return;
        }
      } else if (opts?.network && opts?.network !== wallet.network) {
        return;
      }
    }

    if (opts?.filterByWalletOptions) {
      const {currencyAbbreviation, chain, walletId, network, searchInput} =
        opts;

      const matches = {
        currency:
          wallet.currencyAbbreviation.toLowerCase() ===
          currencyAbbreviation?.toLowerCase(),
        chain: wallet.chain.toLowerCase() === chain?.toLowerCase(),
        id: wallet.id !== walletId,
        network: wallet.network === network,
        name: searchInput
          ? wallet.credentials?.walletName
              ?.toLowerCase()
              ?.includes(searchInput.toLowerCase())
          : true,
        isComplete: wallet.credentials.isComplete(),
      };

      const allMatch = Object.values(matches).every(Boolean);

      if (!allMatch) {
        return;
      }
    }

    if (opts?.filterByComplete) {
      if (!wallet.credentials.isComplete()) {
        return;
      }
    }

    if (opts?.filterByCurrencyAbbreviation) {
      if (
        wallet.currencyAbbreviation.toLowerCase() !==
        opts?.currencyAbbreviation?.toLowerCase()
      ) {
        return;
      }
    }
    const uiFormattedWallet = buildUIFormattedWallet(
      wallet,
      defaultAltCurrencyIsoCode,
      rates,
      dispatch,
      'symbol',
      opts?.skipFiatCalculations,
    ) as WalletRowProps;

    const {
      keyId,
      chain,
      credentials: {account, walletId, n},
      receiveAddress,
    } = wallet;

    let accountKey = receiveAddress;

    if (!accountKey && !wallet?.credentials?.isComplete()) {
      // Workaround for incomplete multisig wallets
      accountKey = walletId;
    }

    const isSVMChain = IsSVMChain(chain);
    const isTokensSupportedChain = IsVMChain(chain);
    const name = key.evmAccountsInfo?.[accountKey!]?.name;
    const existingAccount = accountMap[accountKey!];
    const hideAccount = key.evmAccountsInfo?.[accountKey!]?.hideAccount;

    if (opts?.filterByHideWallet && hideAccount) {
      return;
    }

    if (!existingAccount) {
      accountMap[accountKey!] = {
        id: _.uniqueId('account_'),
        keyId,
        chains: [chain],
        accountName: isTokensSupportedChain
          ? name ||
            `${isSVMChain ? 'Solana Account' : 'EVM Account'}${
              Number(account) === 0 ? '' : ` (${account})`
            }`
          : uiFormattedWallet.walletName,
        wallets: [uiFormattedWallet],
        accountNumber: account,
        receiveAddress,
        isMultiNetworkSupported: IsVMChain(chain),
        fiatBalance: uiFormattedWallet.fiatBalance ?? 0,
        fiatLockedBalance: uiFormattedWallet.fiatLockedBalance ?? 0,
        fiatConfirmedLockedBalance:
          uiFormattedWallet.fiatConfirmedLockedBalance ?? 0,
        fiatSpendableBalance: uiFormattedWallet.fiatSpendableBalance ?? 0,
        fiatPendingBalance: uiFormattedWallet.fiatPendingBalance ?? 0,
      };
    } else {
      existingAccount.chains!.push(chain);
      existingAccount.chains = [...new Set(existingAccount.chains)];
      existingAccount.wallets!.push(uiFormattedWallet);
      existingAccount.fiatBalance! += uiFormattedWallet.fiatBalance ?? 0;
      existingAccount.fiatLockedBalance! +=
        uiFormattedWallet.fiatLockedBalance ?? 0;
      existingAccount.fiatConfirmedLockedBalance! +=
        uiFormattedWallet.fiatConfirmedLockedBalance ?? 0;
      existingAccount.fiatSpendableBalance! +=
        uiFormattedWallet.fiatSpendableBalance ?? 0;
      existingAccount.fiatPendingBalance! +=
        uiFormattedWallet.fiatPendingBalance ?? 0;
    }
  });

  if (!opts?.skipFiatCalculations) {
    Object.values(accountMap).forEach(account => {
      account.fiatBalanceFormat = formatBalance(account.fiatBalance!);
      account.fiatLockedBalanceFormat = formatBalance(
        account.fiatLockedBalance!,
      );
      account.fiatConfirmedLockedBalanceFormat = formatBalance(
        account.fiatConfirmedLockedBalance!,
      );
      account.fiatSpendableBalanceFormat = formatBalance(
        account.fiatSpendableBalance!,
      );
      account.fiatPendingBalanceFormat = formatBalance(
        account.fiatPendingBalance!,
      );
    });
  }

  const sortedAccountMap = Object.keys(accountMap).reduce((acc, key) => {
    const account = {...accountMap[key]};
    if (!account.wallets) {
      return acc;
    }
    account.wallets = account.wallets.sort((a, b) => {
      const isANonGasToken =
        !IsERCToken(a.currencyAbbreviation, a.chain) && IsVMChain(a.chain);
      const isBNonGasToken =
        !IsERCToken(b.currencyAbbreviation, b.chain) && IsVMChain(b.chain);

      if (isANonGasToken && !isBNonGasToken) {
        return -1;
      } else if (!isANonGasToken && isBNonGasToken) {
        return 1;
      } else {
        if (a.fiatBalance && b.fiatBalance) {
          return b.fiatBalance - a.fiatBalance;
        } else if (a.fiatBalance) {
          return -1;
        } else if (b.fiatBalance) {
          return 1;
        } else {
          return 0;
        }
      }
    });
    // @ts-ignore
    acc[key] = account;
    return acc;
  }, {}) as {
    [key: string]: Partial<AccountRowProps>;
  };

  return Object.values(sortedAccountMap).sort(
    (a, b) => (b.fiatBalance ?? -Infinity) - (a.fiatBalance ?? -Infinity),
  ) as AccountRowProps[];
};

// needed for building SectionList format
const buildUIFormattedAssetsList = (
  assetsByChainMap: {[key: string]: Partial<AssetsByChainListProps>},
  wallet: WalletRowProps,
  defaultAltCurrencyIsoCode: string,
  currencyDisplay?: 'symbol',
) => {
  let assetsByChain = assetsByChainMap[wallet.chain];
  if (assetsByChain) {
    let chainData = assetsByChain.data?.find(
      ({chain}) => chain === wallet.chain,
    );

    if (chainData) {
      chainData.fiatBalance += wallet.fiatBalance ?? 0;
      chainData.fiatLockedBalance += wallet.fiatLockedBalance ?? 0;
      chainData.fiatConfirmedLockedBalance +=
        wallet.fiatConfirmedLockedBalance ?? 0;
      chainData.fiatSpendableBalance += wallet.fiatSpendableBalance ?? 0;
      chainData.fiatPendingBalance += wallet.fiatPendingBalance ?? 0;
      chainData.chainAssetsList.push(wallet);

      chainData.fiatBalanceFormat = formatFiat({
        fiatAmount: chainData.fiatBalance ?? 0,
        defaultAltCurrencyIsoCode,
        currencyDisplay,
      });
      chainData.fiatLockedBalanceFormat = formatFiat({
        fiatAmount: chainData.fiatLockedBalance ?? 0,
        defaultAltCurrencyIsoCode,
        currencyDisplay,
      });
      chainData.fiatConfirmedLockedBalanceFormat = formatFiat({
        fiatAmount: chainData.fiatConfirmedLockedBalance ?? 0,
        defaultAltCurrencyIsoCode,
        currencyDisplay,
      });
      chainData.fiatSpendableBalanceFormat = formatFiat({
        fiatAmount: chainData.fiatSpendableBalance ?? 0,
        defaultAltCurrencyIsoCode,
        currencyDisplay,
      });
      chainData.fiatPendingBalanceFormat = formatFiat({
        fiatAmount: chainData.fiatPendingBalance ?? 0,
        defaultAltCurrencyIsoCode,
        currencyDisplay,
      });
    }
  } else {
    assetsByChainMap[wallet.chain] = {
      title: wallet.chain,
      chains: [wallet.chain], // useful only for chain selector
      data: [
        {
          id: _.uniqueId('chain_'),
          chain: wallet.chain,
          chainImg: wallet.badgeImg || wallet.img,
          chainName: wallet.chainName,
          accountAddress: wallet.receiveAddress!,
          fiatBalance: wallet.fiatBalance ?? 0,
          fiatLockedBalance: wallet.fiatLockedBalance ?? 0,
          fiatConfirmedLockedBalance: wallet.fiatConfirmedLockedBalance ?? 0,
          fiatSpendableBalance: wallet.fiatSpendableBalance ?? 0,
          fiatPendingBalance: wallet.fiatPendingBalance ?? 0,
          fiatBalanceFormat: formatFiat({
            fiatAmount: wallet.fiatBalance ?? 0,
            defaultAltCurrencyIsoCode,
            currencyDisplay,
          }),
          fiatLockedBalanceFormat: formatFiat({
            fiatAmount: wallet.fiatLockedBalance ?? 0,
            defaultAltCurrencyIsoCode,
            currencyDisplay,
          }),
          fiatConfirmedLockedBalanceFormat: formatFiat({
            fiatAmount: wallet.fiatConfirmedLockedBalance ?? 0,
            defaultAltCurrencyIsoCode,
            currencyDisplay,
          }),
          fiatSpendableBalanceFormat: formatFiat({
            fiatAmount: wallet.fiatSpendableBalance ?? 0,
            defaultAltCurrencyIsoCode,
            currencyDisplay,
          }),
          fiatPendingBalanceFormat: formatFiat({
            fiatAmount: wallet.fiatPendingBalance ?? 0,
            defaultAltCurrencyIsoCode,
            currencyDisplay,
          }),
          chainAssetsList: [wallet],
        },
      ],
    };
  }
};

export const buildAssetsByChainList = (
  accountItem: AccountRowProps,
  defaultAltCurrencyIso: string,
) => {
  const assetsByChainMap: {[key: string]: Partial<AssetsByChainListProps>} = {};

  accountItem?.wallets?.forEach(coin => {
    buildUIFormattedAssetsList(
      assetsByChainMap,
      coin,
      defaultAltCurrencyIso,
      'symbol',
    );
  });

  return Object.values(assetsByChainMap).sort((a, b) => {
    if (a.data?.[0].fiatBalance && b.data?.[0].fiatBalance) {
      return b.data?.[0].fiatBalance - a.data?.[0].fiatBalance;
    } else if (a.data?.[0].fiatBalance) {
      return -1;
    } else if (b.data?.[0].fiatBalance) {
      return 1;
    } else {
      return 0;
    }
  });
};

const buildUIFormattedAssets = (
  assetsByChainList: {[key: string]: AssetsByChainData},
  wallet: WalletRowProps,
  defaultAltCurrencyIsoCode: string,
  currencyDisplay?: 'symbol',
) => {
  let assetsByChain = assetsByChainList[wallet.chain];

  if (assetsByChain) {
    assetsByChain.fiatBalance += wallet.fiatBalance ?? 0;
    assetsByChain.fiatLockedBalance += wallet.fiatLockedBalance ?? 0;
    assetsByChain.fiatConfirmedLockedBalance +=
      wallet.fiatConfirmedLockedBalance ?? 0;
    assetsByChain.fiatSpendableBalance += wallet.fiatSpendableBalance ?? 0;
    assetsByChain.fiatPendingBalance += wallet.fiatPendingBalance ?? 0;
    assetsByChain.chainAssetsList.push(wallet);

    assetsByChain.fiatBalanceFormat = formatFiat({
      fiatAmount: assetsByChain.fiatBalance ?? 0,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    });
    assetsByChain.fiatLockedBalanceFormat = formatFiat({
      fiatAmount: assetsByChain.fiatLockedBalance ?? 0,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    });
    assetsByChain.fiatConfirmedLockedBalanceFormat = formatFiat({
      fiatAmount: assetsByChain.fiatConfirmedLockedBalance ?? 0,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    });
    assetsByChain.fiatSpendableBalanceFormat = formatFiat({
      fiatAmount: assetsByChain.fiatSpendableBalance ?? 0,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    });
    assetsByChain.fiatPendingBalanceFormat = formatFiat({
      fiatAmount: assetsByChain.fiatPendingBalance ?? 0,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    });
  } else {
    const newChainData: AssetsByChainData = {
      id: _.uniqueId('chain_'),
      chain: wallet.chain,
      chainImg: wallet.badgeImg || wallet.img,
      chainName: wallet.chainName,
      accountAddress: wallet.receiveAddress!,
      fiatBalance: wallet.fiatBalance ?? 0,
      fiatLockedBalance: wallet.fiatLockedBalance ?? 0,
      fiatConfirmedLockedBalance: wallet.fiatConfirmedLockedBalance ?? 0,
      fiatSpendableBalance: wallet.fiatSpendableBalance ?? 0,
      fiatPendingBalance: wallet.fiatPendingBalance ?? 0,
      fiatBalanceFormat: formatFiat({
        fiatAmount: wallet.fiatBalance ?? 0,
        defaultAltCurrencyIsoCode,
        currencyDisplay,
      }),
      fiatLockedBalanceFormat: formatFiat({
        fiatAmount: wallet.fiatLockedBalance ?? 0,
        defaultAltCurrencyIsoCode,
        currencyDisplay,
      }),
      fiatConfirmedLockedBalanceFormat: formatFiat({
        fiatAmount: wallet.fiatConfirmedLockedBalance ?? 0,
        defaultAltCurrencyIsoCode,
        currencyDisplay,
      }),
      fiatSpendableBalanceFormat: formatFiat({
        fiatAmount: wallet.fiatSpendableBalance ?? 0,
        defaultAltCurrencyIsoCode,
        currencyDisplay,
      }),
      fiatPendingBalanceFormat: formatFiat({
        fiatAmount: wallet.fiatPendingBalance ?? 0,
        defaultAltCurrencyIsoCode,
        currencyDisplay,
      }),
      chainAssetsList: [wallet],
    };

    assetsByChainList[wallet.chain] = newChainData;
  }
};

export const buildAssetsByChain = (
  accountItem: AccountRowProps,
  defaultAltCurrencyIso: string,
) => {
  const assetsByChainList: {[key: string]: AssetsByChainData} = {};

  accountItem?.wallets?.forEach(coin => {
    buildUIFormattedAssets(
      assetsByChainList,
      coin,
      defaultAltCurrencyIso,
      'symbol',
    );
  });

  return Object.values(assetsByChainList);
};
