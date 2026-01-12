import {Key, KeyMethods, Token, Wallet} from '../store/wallet/wallet.models';
import {ContactRowProps} from '../components/list/ContactRow';
import {Network} from '../constants';
import {CurrencyListIcons} from '../constants/SupportedCurrencyOptions';
import {ReactElement} from 'react';
import {
  IsERCToken,
  IsVMChain,
  IsSVMChain,
  IsEVMChain,
} from '../store/wallet/utils/currency';
import {Rate, Rates} from '../store/rate/rate.models';
import {BASE_BITCORE_URL, PROTOCOL_NAME} from '../constants/config';
import _ from 'lodash';
import {NavigationProp, StackActions} from '@react-navigation/native';
import {AppDispatch} from './hooks';
import {createWalletAddress} from '../store/wallet/effects/address/address';
import {
  BitpaySupportedCoins,
  SUPPORTED_EVM_COINS,
  SUPPORTED_SVM_COINS,
} from '../constants/currencies';
import {createMultipleWallets} from '../store/wallet/effects';
import {checkEncryptPassword, toFiat} from '../store/wallet/utils/wallet';
import {FormatAmount} from '../store/wallet/effects/amount/amount';
import {getERC20TokenPrice} from '../store/moralis/moralis.effects';
import {ethers} from 'ethers';
import EtherscanAPI from '../api/etherscan';
import {
  EIP155_SIGNING_METHODS,
  SOLANA_SIGNING_METHODS,
  WALLET_CONNECT_SUPPORTED_CHAINS,
} from '../constants/WalletConnectV2';
import {BitpaySupportedTokenOptsByAddress} from '../constants/tokens';
import {Effect} from '../store';
import {WalletKitTypes} from '@reown/walletkit';
import {
  abiERC20,
  abiERC721,
  abiERC1155,
  abiFiatTokenV2,
  InvoiceAbi,
} from '../navigation/wallet-connect/constants/abis';
import {AltCurrenciesRowProps} from '../components/list/AltCurrenciesRow';
import {Keys} from '../store/wallet/wallet.reducer';
import {PermissionsAndroid} from 'react-native';
import axios from 'axios';
import {
  TransferCheckedTokenInstruction,
  TransferSolInstruction,
} from './sol-transaction-instruction.types';
import {successImport} from '../store/wallet/wallet.actions';
import * as SolKit from '@solana/kit';
import {BwcProvider} from '../lib/bwc';
import {findAssociatedTokenPda} from '@solana-program/token-2022';
import {tokenManager} from '../managers/TokenManager';
import {logManager} from '../managers/LogManager';

export const suffixChainMap: {[suffix: string]: string} = {
  eth: 'e',
  matic: 'm',
  arb: 'arb',
  base: 'base',
  op: 'op',
  sol: 'sol',
};

export const sleep = (duration: number) =>
  new Promise<void>(resolve => setTimeout(resolve, duration));

export const titleCasing = (str: string) =>
  `${str.charAt(0).toUpperCase()}${str.slice(1)}`;

export const changeOpacity = (color: string, targetOpacity: number) => {
  const hex = color.replace('#', '');

  const normalizedHex =
    hex.length === 3
      ? hex
          .split('')
          .map(char => `${char}${char}`)
          .join('')
      : hex;

  if (normalizedHex.length !== 6) {
    return color;
  }

  const r = parseInt(normalizedHex.substring(0, 2), 16);
  const g = parseInt(normalizedHex.substring(2, 4), 16);
  const b = parseInt(normalizedHex.substring(4, 6), 16);

  const opacity = Math.max(0, Math.min(targetOpacity, 1));

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const parsePath = (path: string) => {
  return {
    purpose: path.split('/')[1],
    coinCode: path.split('/')[2],
    account: path.split('/')[3],
  };
};

export const getDerivationStrategy = (path: string): string => {
  const purpose = parsePath(path).purpose;
  let derivationStrategy: string = '';

  switch (purpose) {
    case "44'":
      derivationStrategy = 'BIP44';
      break;
    case "45'":
      derivationStrategy = 'BIP45';
      break;
    case "48'":
      derivationStrategy = 'BIP48';
      break;
    case "84'":
      derivationStrategy = 'BIP84';
      break;
  }
  return derivationStrategy;
};

export const getNetworkName = (path: string): string => {
  // BIP45
  const purpose = parsePath(path).purpose;
  if (purpose === "45'") {
    return 'livenet';
  }

  const coinCode = parsePath(path).coinCode;
  let networkName: string = '';

  switch (coinCode) {
    case "0'": // for BTC
      networkName = 'livenet';
      break;
    case "1'": // testnet for all coins
      networkName = 'testnet';
      break;
    case "145'": // for BCH
      networkName = 'livenet';
      break;
    case "60'": // for ETH
      networkName = 'livenet';
      break;
    case "144'": // for XRP
      networkName = 'livenet';
      break;
    case "3'": // for DOGE
      networkName = 'livenet';
      break;
    case "2'": // for LTC
      networkName = 'livenet';
      break;
    case "501'": // for SOL
      networkName = 'livenet';
      break;
  }
  return networkName;
};

export const getAccount = (path: string): number | undefined => {
  // BIP45
  const purpose = parsePath(path).purpose;
  if (purpose === "45'") {
    return 0;
  }

  const account = parsePath(path).account || '';
  const match = account.match(/(\d+)'/);
  if (!match) {
    return undefined;
  }
  return +match[1];
};

export const isValidDerivationPath = (path: string, chain: string): boolean => {
  let isValid: boolean = false;
  const coinCode = parsePath(path).coinCode;

  // BIP45
  if (path === "m/45'") {
    return true;
  }

  switch (chain) {
    case 'btc':
      isValid = ["0'", "1'"].indexOf(coinCode) > -1;
      break;
    case 'bch':
      isValid = ["145'", "0'", "1'"].indexOf(coinCode) > -1;
      break;
    case 'eth':
    case 'matic':
    case 'arb':
    case 'base':
    case 'op':
      isValid = ["60'", "0'", "1'"].indexOf(coinCode) > -1;
      break;
    case 'sol':
      isValid = ["501'", "0'", "1'"].indexOf(coinCode) > -1;
      break;
    case 'xrp':
      isValid = ["144'", "0'", "1'"].indexOf(coinCode) > -1;
      break;
    case 'doge':
      isValid = ["3'", "1'"].indexOf(coinCode) > -1;
      break;
    case 'ltc':
      isValid = ["2'", "1'"].indexOf(coinCode) > -1;
      break;
  }

  return isValid;
};

export const keyExtractor = (item: {id: string}) => item.id;

export const getSignificantDigits = (currencyAbbreviation?: string) => {
  return currencyAbbreviation &&
    ['doge', 'xrp', 'shib', 'elon', 'prt', 'rfox', 'rfuel', 'xyo'].includes(
      currencyAbbreviation.toLowerCase(),
    )
    ? 4
    : undefined;
};

const getFormatterOptions = (
  amount: number,
  currency: string = 'USD',
  opts: {
    customPrecision?: 'minimal';
    currencyAbbreviation?: string;
    currencyDisplay?: 'symbol' | 'code';
  } = {},
): Intl.NumberFormatOptions => {
  const significantDigits = getSignificantDigits(opts.currencyAbbreviation);
  const formatterOptions: Intl.NumberFormatOptions = {
    minimumSignificantDigits: amount === 0 ? undefined : significantDigits,
    maximumSignificantDigits: amount === 0 ? undefined : significantDigits,
    style: 'currency',
    currency: currency.toLowerCase(),
    ...(opts.customPrecision === 'minimal' &&
      Number.isInteger(amount) && {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }),
    currencyDisplay: opts.currencyDisplay,
  };
  return formatterOptions;
};

export const formatFiatAmount = (
  amount: number,
  currency: string = 'USD',
  opts: {
    customPrecision?: 'minimal';
    currencyAbbreviation?: string;
    currencyDisplay?: 'symbol' | 'code';
  } = {},
) => {
  const formatterOptions = getFormatterOptions(amount, currency, opts);
  const currencyDisplay = opts.currencyDisplay || 'symbol';

  if (currencyDisplay === 'symbol') {
    return amount.toLocaleString('en-US', formatterOptions);
  }

  let code: string | undefined;
  let numberString = amount
    .toLocaleString('en-US', {
      ...formatterOptions,
      currencyDisplay: 'code',
    })
    .split('')
    .map(char => {
      if (char.match(/[A-Za-z]/)) {
        code = (code || '') + char;
        return '';
      }
      return char;
    })
    .join('');

  return `${numberString.trim()} ${code || currency}`;
};

type FormatFiatOptions = {
  fiatAmount: number;
  defaultAltCurrencyIsoCode: string;
  currencyDisplay?: 'symbol' | 'code';
};

export const formatFiat = ({
  fiatAmount,
  defaultAltCurrencyIsoCode,
  currencyDisplay,
}: FormatFiatOptions) =>
  formatFiatAmount(fiatAmount, defaultAltCurrencyIsoCode, {currencyDisplay});

export const findContact = (
  contactList: ContactRowProps[],
  address: string,
) => {
  const foundContacts = contactList.filter((contact: ContactRowProps) => {
    return contact.address === address;
  });
  return !!foundContacts.length;
};

export const getContactObj = (
  contactList: ContactRowProps[],
  address: string,
  coin: string,
  network: string,
  chain: string,
) => {
  const contactObj = contactList.find((contact: ContactRowProps) => {
    return (
      contact.address === address &&
      contact.coin === coin &&
      contact.network === network &&
      contact.chain === chain
    );
  });
  return contactObj;
};

export const getMnemonic = (key: Key) =>
  key.properties!.mnemonic.trim().split(' ');

export const shouldScale = (
  value: string | number | null | undefined,
  threshold = 10,
): boolean => {
  if (!value) {
    return false;
  }
  // un-formatted fiat
  if (typeof value === 'number') {
    value = Number(value).toFixed(2);
  }
  return value.length > threshold;
};

export const formatCryptoAddress = (address: string) => {
  if (!address) {
    return '--';
  }
  return (
    address.substring(0, 6) + '....' + address.substring(address.length - 6)
  );
};

export const calculatePercentageDifference = (
  currentBalance: number,
  lastDayBalance: number,
): number => {
  return Number(
    (((currentBalance - lastDayBalance) * 100) / lastDayBalance).toFixed(2),
  );
};

export const formatFiatAmountObj = (
  amount: number,
  currency: string = 'USD',
  opts: {
    customPrecision?: 'minimal';
    currencyAbbreviation?: string;
    currencyDisplay?: 'symbol' | 'code';
  } = {},
): {amount: string; code?: string} => {
  const currencyDisplay = opts.currencyDisplay || 'symbol';
  const formatterOptions = getFormatterOptions(amount, currency, {
    ...opts,
    currencyDisplay,
  });

  if (currencyDisplay === 'symbol') {
    return {amount: amount.toLocaleString('en-US', formatterOptions)};
  }

  let code: string | undefined;
  let numberString = amount
    .toLocaleString('en-US', {
      ...formatterOptions,
      currencyDisplay: 'code',
    })
    .split('')
    .map(char => {
      if (char.match(/[A-Za-z]/)) {
        code = (code || '') + char;
        return '';
      }
      return char;
    })
    .join('');

  return {amount: numberString.trim(), code: code || currency};
};

export const convertToFiat = (
  fiat: number,
  hideWallet: boolean | undefined,
  hideWalletByAccount: boolean | undefined,
  network: Network,
) =>
  network === Network.mainnet && !hideWallet && !hideWalletByAccount ? fiat : 0;

export const getErrorString = (err: any): string => {
  return err instanceof Error ? err.message : JSON.stringify(err);
};

export const getBadgeImg = (
  currencyAbbreviation: string,
  chain: string,
): string | ((props?: any) => ReactElement) => {
  return IsERCToken(currencyAbbreviation, chain) ||
    isL2NoSideChainNetwork(chain)
    ? CurrencyListIcons[chain]
    : '';
};

export const getRateByCurrencyName = (
  rates: Rates,
  currencyAbbreviation: string,
  chain: string,
  tokenAddress?: string | null,
): Rate[] => {
  const currencyName = getCurrencyAbbreviation(
    tokenAddress ?? currencyAbbreviation,
    chain,
  );
  if (
    currencyAbbreviation?.toLowerCase() === 'pol' &&
    rates.matic &&
    rates.matic.length > 0
  ) {
    return rates.matic;
  }
  return rates[currencyName] || rates[currencyAbbreviation];
};

export const addTokenChainSuffix = (name: string, chain: string) => {
  return `${IsSVMChain(chain) ? name : name.toLowerCase()}_${
    suffixChainMap[chain]
  }`;
};

export const formatCurrencyAbbreviation = (currencyAbbreviation: string) => {
  if (currencyAbbreviation.split('.')[1]) {
    return (
      currencyAbbreviation.split('.')[0].toUpperCase() +
      '.' +
      currencyAbbreviation.split('.')[1].toLowerCase()
    );
  }
  return currencyAbbreviation.toUpperCase();
};

export const getCurrencyAbbreviation = (name: string, chain: string) => {
  return IsERCToken(name.toLowerCase(), chain.toLowerCase()) // if name is contract address this returns true
    ? addTokenChainSuffix(name, chain)
    : name.toLowerCase();
};

export const getChainFromTokenByAddressKey = (key: string) => {
  const match = key.match(/_([a-zA-Z]+)$/);
  return getChainUsingSuffix(match![1]);
};

export const getProtocolName = (
  chain: string,
  network: string,
): string | undefined => {
  const _chain = chain.toLowerCase();
  const _network = network.toLowerCase();
  return PROTOCOL_NAME[_chain]?.[_network]
    ? PROTOCOL_NAME[_chain][_network]
    : PROTOCOL_NAME.default[_network];
};

export const getProtocolsName = (chain: string): string | undefined => {
  if (IsSVMChain(chain)) {
    return SUPPORTED_SVM_COINS.map(
      chain => PROTOCOL_NAME[chain][Network.mainnet],
    ).join(', ');
  } else {
    return SUPPORTED_EVM_COINS.map(
      chain => PROTOCOL_NAME[chain][Network.mainnet],
    ).join(', ');
  }
};

export const getEVMFeeCurrency = (chain: string): string => {
  switch (chain.toLowerCase()) {
    case 'eth':
      return 'eth';
    case 'matic':
      return 'matic';
    case 'arb':
      return 'eth';
    case 'base':
      return 'eth';
    case 'op':
      return 'eth';
    case 'sol':
      return 'sol';
    default:
      return 'eth';
  }
};

export const getCWCChain = (chain: string): string => {
  switch (chain.toLowerCase()) {
    case 'eth':
      return 'ETHERC20';
    case 'matic':
      return 'MATICERC20';
    case 'arb':
      return 'ARBERC20';
    case 'base':
      return 'BASEERC20';
    case 'op':
      return 'OPERC20';
    case 'sol':
      return 'SOLSPL';
    default:
      return 'ETHERC20';
  }
};

export const getChainUsingSuffix = (symbol: string) => {
  switch (symbol) {
    case 'e':
      return 'eth';
    case 'm':
      return 'matic';
    case 'base':
      return 'base';
    case 'arb':
      return 'arb';
    case 'op':
      return 'op';
    case 'sol':
      return 'sol';
    default:
      return 'eth';
  }
};

export const isL2NoSideChainNetwork = (chain: string) => {
  return ['arb', 'base', 'op'].includes(chain.toLowerCase());
};

export const transformAmount = (
  satoshis: number,
  opts: {
    fullPrecision: string;
    decimals: {
      full: {
        maxDecimals: number;
        minDecimals: number;
      };
      short: {
        maxDecimals: number;
        minDecimals: number;
      };
    };
    toSatoshis: number;
    thousandsSeparator?: string;
    decimalSeparator?: string;
  },
) => {
  const MAX_DECIMAL_ANY_CHAIN = 18; // more that 14 gives rounding errors

  const clipDecimals = (number: number, decimals: number) => {
    let str = number.toString();
    if (str.indexOf('e') >= 0) {
      // fixes eth small balances
      str = number.toFixed(MAX_DECIMAL_ANY_CHAIN);
    }
    var x = str.split('.');

    var d = (x[1] || '0').substring(0, decimals);
    const ret = parseFloat(x[0] + '.' + d);
    return ret;
  };

  const addSeparators = (
    nStr: string,
    thousands: string,
    decimal: string,
    minDecimals: number,
  ) => {
    nStr = nStr.replace('.', decimal);
    var x = nStr.split(decimal);
    var x0 = x[0];
    var x1 = x[1];

    x1 = _.dropRightWhile(x1, (n, i) => {
      return n == '0' && i >= minDecimals;
    }).join('');
    var x2 = x.length > 1 ? decimal + x1 : '';

    x0 = x0.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    return x0 + x2;
  };

  const precision: keyof typeof opts.decimals = opts.fullPrecision
    ? 'full'
    : 'short';
  const decimals = opts.decimals[precision];
  const toSatoshis = opts.toSatoshis;
  const amount = clipDecimals(
    satoshis / toSatoshis,
    decimals.maxDecimals,
  ).toFixed(decimals.maxDecimals);
  return addSeparators(
    amount,
    opts.thousandsSeparator || ',',
    opts.decimalSeparator || '.',
    decimals.minDecimals,
  );
};

export const toggleThenUntoggle = async (
  booleanSetter: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  booleanSetter(true);
  await sleep(500);
  booleanSetter(false);
};

export const popToScreen = (
  navigation: NavigationProp<ReactNavigation.RootParamList>,
  targetScreenName: string,
) => {
  // @ts-ignore
  navigation.dispatch(state => {
    const routes = state.routes;
    const targetIndex = routes.findIndex(r => r.name === targetScreenName);
    if (targetIndex === -1) {
      // Target screen "${targetScreenName}" not found in the navigation stack.
      return;
    }
    const popCount = routes.length - 1 - targetIndex;
    if (popCount > 0) {
      return StackActions.pop(popCount);
    } else {
      // Already at the target screen "${targetScreenName}". No need to pop.
    }
  });
};

export const fixWalletAddresses = async ({
  appDispatch,
  wallets,
  skipDispatch = true, // Avoid dispatching when fixing addresses, as the store will be updated directly after fixWalletAddresses
}: {
  appDispatch: AppDispatch;
  wallets: Wallet[];
  skipDispatch?: boolean;
}) => {
  await Promise.all(
    wallets.map(async wallet => {
      try {
        if (!wallet.receiveAddress && wallet?.credentials?.isComplete()) {
          const walletAddress = (await appDispatch<any>(
            createWalletAddress({wallet, newAddress: false, skipDispatch}),
          )) as string;
          wallet.receiveAddress = walletAddress;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        logManager.error(
          `Error creating address for wallet ${wallet?.id}-${wallet?.chain}-${wallet?.walletName}: ${errMsg}`,
        );
      }
    }),
  );
};

export const createWalletsForAccounts = async (
  dispatch: any,
  accountsArray: number[],
  key: KeyMethods,
  currencies: {
    chain: string;
    currencyAbbreviation: string;
    isToken: boolean;
    tokenAddress?: string;
  }[],
  password?: string,
) => {
  return (
    await Promise.all(
      accountsArray.flatMap(async account => {
        try {
          const newWallets = (await dispatch(
            createMultipleWallets({
              key: key as KeyMethods,
              currencies,
              options: {
                password,
                account,
                customAccount: true,
              },
            }),
          )) as Wallet[];
          return newWallets;
        } catch (err) {
          const errMsg =
            err instanceof Error ? err.message : JSON.stringify(err);
          logManager.debug(
            `Error creating wallet - continue anyway: ${errMsg}`,
          );
        }
      }),
    )
  )
    .flat()
    .filter(Boolean) as Wallet[];
};

export const getVMGasWallets = (wallets: Wallet[]) => {
  return wallets.filter(
    wallet =>
      (IsVMChain(wallet.credentials.chain) ||
        IsSVMChain(wallet.credentials.chain)) &&
      !IsERCToken(wallet.credentials.coin, wallet.credentials.chain),
  );
};

export const getEvmGasWallets = (wallets: Wallet[]) => {
  return wallets.filter(
    wallet =>
      IsEVMChain(wallet.credentials.chain) &&
      !IsERCToken(wallet.credentials.coin, wallet.credentials.chain),
  );
};

export const getSvmGasWallets = (wallets: Wallet[]) => {
  return wallets.filter(
    wallet =>
      IsSVMChain(wallet.credentials.chain) &&
      !IsERCToken(wallet.credentials.coin, wallet.credentials.chain),
  );
};

export const splitInputsToChunks = (inputsArray: any[]) => {
  const chunksArray = inputsArray.map(input => {
    const hexString = input.startsWith('0x') ? input.slice(2) : input;
    return hexString.match(/.{1,64}/g);
  });
  return chunksArray;
};

export const extractAddresses = (hex: string) => {
  const senderContractAddress = '0x' + hex.slice(0, 40);
  const recipientAddress = '0x' + hex.slice(46, 86);
  return {senderContractAddress, recipientAddress};
};

export const removeTrailingZeros = (hexString: string) => {
  const trimmedHex = hexString.replace(/0+$/, '');
  return trimmedHex;
};

interface RequestUiValues {
  transactionDataName: string;
  senderAddress: string;
  swapFromChain: string;
  senderContractAddress?: string;
  swapAmount?: string;
  swapFormatAmount?: string;
  swapFiatAmount?: string;
  swapFromCurrencyAbbreviation?: string;
  receiveAmount?: string;
  recipientAddress?: string;
  senderTokenPrice?: number;
  decodedInstructions?: any;
}

export const processOtherMethodsRequest =
  (event: WalletKitTypes.SessionRequest): Effect<Promise<RequestUiValues>> =>
  async (dispatch, getState) => {
    logManager.debug('processing other method transaction');
    const {
      WALLET: {keys},
    } = getState();
    const {params} = event;
    const {chainId, request} = params;
    const {method} = params.request;
    const swapFromChain = WALLET_CONNECT_SUPPORTED_CHAINS[chainId]?.chain;
    let senderAddress = '';
    switch (method) {
      case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
      case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
      case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
      case EIP155_SIGNING_METHODS.ETH_SIGN:
        senderAddress = request.params?.[0];
        break;
      case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
        senderAddress = request.params?.[1];
        break;
      case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
        senderAddress = request.params?.[0]?.from;
        break;
      case SOLANA_SIGNING_METHODS.SIGN_MESSAGE:
        senderAddress = request.params?.pubkey;
        break;
      case SOLANA_SIGNING_METHODS.SIGN_TRANSACTION:
      case SOLANA_SIGNING_METHODS.SIGN_AND_SEND_TRANSACTION:
        senderAddress = request?.params?.feePayer || request?.params?.pubkey;
        break;
    }
    try {
      const wallet = Object.values(keys as Keys).flatMap(key =>
        key.wallets.filter(
          wallet =>
            wallet.receiveAddress?.toLowerCase() ===
              senderAddress?.toLowerCase() && wallet.chain === swapFromChain,
        ),
      )[0];

      return {
        transactionDataName: 'SIGN REQUEST',
        swapFromChain,
        senderAddress,
        swapFromCurrencyAbbreviation: wallet
          ? wallet.currencyAbbreviation
          : swapFromChain,
      };
    } catch (error) {
      logManager.error(`Error processing ${method} request: ${error}`);
      throw error;
    }
  };

const parseStandardTokenTransactionData = (data?: string) => {
  if (!data) {
    return {};
  }
  const ERC20Interface = new ethers.utils.Interface(abiERC20);
  const ERC721Interface = new ethers.utils.Interface(abiERC721);
  const ERC1155Interface = new ethers.utils.Interface(abiERC1155);
  const USDCInterface = new ethers.utils.Interface(abiFiatTokenV2);
  const InvoiceInterface = new ethers.utils.Interface(InvoiceAbi);

  try {
    return {
      transactionData: ERC20Interface.parseTransaction({data}),
      abi: abiERC20,
    };
  } catch {}

  try {
    return {
      transactionData: ERC721Interface.parseTransaction({data}),
      abi: abiERC721,
    };
  } catch {}

  try {
    return {
      transactionData: ERC1155Interface.parseTransaction({data}),
      abi: abiERC1155,
    };
  } catch {}

  try {
    return {
      transactionData: USDCInterface.parseTransaction({data}),
      abi: abiFiatTokenV2,
    };
  } catch {}

  try {
    return {
      transactionData: InvoiceInterface.parseTransaction({data}),
      abi: InvoiceAbi,
    };
  } catch {}

  return {};
};

export const processSolanaSwapRequest =
  (event: WalletKitTypes.SessionRequest): Effect<Promise<RequestUiValues>> =>
  async (dispatch, getState) => {
    logManager.debug('processing Solana transaction');
    const {
      APP: {defaultAltCurrency},
      RATE: {rates: allRates},
    } = getState();
    const {params} = event;
    const {chainId, request} = params;
    const {method} = params.request;
    const swapFromChain = WALLET_CONNECT_SUPPORTED_CHAINS[chainId]?.chain;
    const senderAddress = request?.params?.feePayer || request?.params?.pubkey;
    const instructions = await decodeSolanaTxIntructions(
      request?.params?.transaction,
    );
    let mainToAddress = null;
    let amount = 0;
    let currency = null;
    let tokenAddress: string | undefined;

    const instructionKeys = {
      TRANSFER_SOL: 'transferSol',
      TRANSFER_CHECKED_TOKEN: 'transferCheckedToken',
      TRANSFER_TOKEN: 'transferToken',
      ADVANCE_NONCE_ACCOUNT: 'advanceNonceAccount',
      MEMO: 'memo',
      SET_COMPUTE_UNIT_LIMIT: 'setComputeUnitLimit',
      SET_COMPUTE_UNIT_PRICE: 'setComputeUnitPrice',
      UNKNOWN: 'unknownInstruction',
    };

    logManager.debug(`Decoded instructions: ${JSON.stringify(instructions)}`);

    if (instructions?.[instructionKeys.TRANSFER_SOL]?.length > 0) {
      const solTransfers = instructions[
        instructionKeys.TRANSFER_SOL
      ] as TransferSolInstruction[];
      mainToAddress = solTransfers[0].destination;
      amount = solTransfers.reduce(
        (sum, transfer) => sum + Number(transfer.amount),
        0,
      );
      currency = 'sol';
    } else if (
      instructions?.[instructionKeys.TRANSFER_CHECKED_TOKEN]?.length > 0
    ) {
      const checkedTokenTransfer = instructions[
        instructionKeys.TRANSFER_CHECKED_TOKEN
      ] as TransferSolInstruction[];
      mainToAddress = checkedTokenTransfer[0].destination;
      amount = checkedTokenTransfer.reduce(
        (sum, transfer) => sum + Number(transfer.amount),
        0,
      );
      tokenAddress = checkedTokenTransfer[0].mint!;
      currency = (await getSolanaTokenInfo(tokenAddress)).symbol?.toLowerCase();
    }

    logManager.debug(
      `amount: ${amount}, mainToAddress: ${mainToAddress}, currency: ${currency}, tokenAddress: ${tokenAddress}`,
    );

    if (!mainToAddress || !currency) {
      // not supported PROGRAM ID found.
      return dispatch(processOtherMethodsRequest(event));
    }
    const swapFromCurrencyAbbreviation = currency.toLowerCase();
    const swapAmount = amount.toString();
    const swapFormatAmount = await dispatch(
      FormatAmount(
        swapFromCurrencyAbbreviation,
        swapFromChain,
        tokenAddress,
        Number(swapAmount),
      ),
    );

    const toFiatAmount = await dispatch(
      toFiat(
        Number(swapAmount),
        defaultAltCurrency.isoCode,
        swapFromCurrencyAbbreviation,
        swapFromChain,
        allRates,
        tokenAddress,
      ),
    );

    const swapFiatAmount = formatFiatAmount(
      toFiatAmount,
      defaultAltCurrency.isoCode,
    );

    try {
      return {
        transactionDataName: 'SIGN REQUEST',
        swapAmount,
        swapFiatAmount,
        swapFormatAmount,
        swapFromChain,
        senderAddress,
        swapFromCurrencyAbbreviation,
        recipientAddress: mainToAddress,
        decodedInstructions: instructions,
      };
    } catch (error) {
      logManager.error(`Error processing ${method} request: ${error}`);
      throw error;
    }
  };

export const processSwapRequest =
  (event: WalletKitTypes.SessionRequest): Effect<Promise<RequestUiValues>> =>
  async (dispatch, getState) => {
    const {
      WALLET: {customTokenOptionsByAddress, keys},
      APP: {defaultAltCurrency},
      RATE: {rates: allRates},
    } = getState();

    const {tokenOptionsByAddress} = tokenManager.getTokenOptions();

    const tokenOptions = {
      ...BitpaySupportedTokenOptsByAddress,
      ...tokenOptionsByAddress,
      ...customTokenOptionsByAddress,
    };

    const {params} = event;
    const {chainId} = params;
    const {method} = params.request;

    const {to, data, from} = params.request.params[0];
    const swapFromChain = WALLET_CONNECT_SUPPORTED_CHAINS[chainId]?.chain;

    if (data === '0x') {
      return handleDefaultTransaction(
        keys,
        swapFromChain,
        from,
        method,
        dispatch,
      );
    }

    try {
      let {transactionData, abi} = parseStandardTokenTransactionData(data);
      if (!transactionData && !abi) {
        logManager.debug('Continue anyway building a default transaction');
        return handleDefaultTransaction(
          keys,
          swapFromChain,
          from,
          method,
          dispatch,
        );
        // logManager.debug(
        //     'No standard token data - fetching contract ABI from Etherscan',
        //   );
        // const _chainId = WC_SUPPORTED_CHAINS[chainId]?.chainId?.toString();
        // abi = await fetchContractAbi(dispatch, _chainId, to);
        // logManager.debug(`ABI: ${JSON.stringify(abi)}`);
        // const contractInterface = new ethers.utils.Interface(abi!);
        // transactionData = contractInterface.parseTransaction({data});
      }
      logManager.debug(
        'Decoded transaction data: ' + JSON.stringify(transactionData),
      );
      const transactionDataName = transactionData!.name;
      if (transactionDataName === 'execute') {
        const transaction = await handleExecuteTransaction(
          dispatch,
          keys,
          transactionData!,
          tokenOptions,
          swapFromChain,
          defaultAltCurrency,
          allRates,
          from,
        );
        return transaction;
      } else if (transactionDataName === 'pay') {
        const transaction = await handlePayTransaction(
          dispatch,
          keys,
          transactionData!,
          tokenOptions,
          swapFromChain,
          defaultAltCurrency,
          allRates,
          from,
        );
        return transaction;
      }
      return handleDefaultTransaction(
        keys,
        swapFromChain,
        from,
        transactionDataName,
        dispatch,
      );
    } catch (error) {
      logManager.error(`Error processing swap request: ${error}`);
      logManager.debug('Continue anyway building a default transaction');
      return handleDefaultTransaction(
        keys,
        swapFromChain,
        from,
        method,
        dispatch,
      );
    }
  };

const fetchContractAbi = async (
  dispatch: any,
  chainId: string,
  address: string,
) => {
  const getAbiFromAddress = async (address: string): Promise<any> => {
    const abi = await dispatch(EtherscanAPI.getContractAbi(chainId, address));
    if (!abi || abi === 'Contract source code not verified') {
      throw new Error('No ABI found');
    }
    try {
      return JSON.parse(abi);
    } catch {
      throw new Error('Failed to parse ABI');
    }
  };

  let parsedAbi = await getAbiFromAddress(address);

  const isProxyContract = parsedAbi.some(
    (item: any) => item.name === 'implementation',
  );

  if (isProxyContract) {
    logManager.debug('Detected EIP-1967 proxy contract');

    // EIP-1967 implementation slot
    const implementationSlot =
      '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

    // Retrieve the address at the implementation slot
    const paddedImplementationAddress = await EtherscanAPI.getStorageAt(
      chainId,
      address,
      implementationSlot,
    );
    const implementationAddress = `0x${paddedImplementationAddress.slice(-40)}`;

    // Fetch and parse the ABI from the implementation contract
    parsedAbi = await getAbiFromAddress(implementationAddress);
  }

  return parsedAbi;
};

const handleDefaultTransaction = async (
  keys: Keys,
  chain: string,
  senderAddress: string,
  transactionDataName: string,
  dispatch: any,
) => {
  logManager.debug(`processing ${transactionDataName} transaction`);
  const wallet = Object.values(keys).flatMap(key =>
    key.wallets.filter(
      wallet =>
        wallet.receiveAddress?.toLowerCase() === senderAddress.toLowerCase() &&
        wallet.chain === chain,
    ),
  )[0];
  const {currencyAbbreviation} = wallet; // this is the "gas" wallet
  return {
    transactionDataName: camelCaseToUpperWords(transactionDataName),
    swapFromChain: chain,
    senderAddress,
    swapFromCurrencyAbbreviation: currencyAbbreviation,
  };
};

const handlePayTransaction = async (
  dispatch: any,
  keys: Keys,
  transactionData: ethers.utils.TransactionDescription,
  tokenOptions: {
    [x: string]: Token;
  },
  chain: string,
  defaultAltCurrency: AltCurrenciesRowProps,
  allRates: Rates,
  senderAddress: string,
) => {
  logManager.debug('processing pay transaction');

  const [
    valueBN,
    gasPriceBN,
    expirationBN,
    payload,
    hash,
    v,
    r,
    s,
    tokenContract,
  ] = transactionData.args;

  const swapAmount = valueBN.toString();
  const senderContractAddress = tokenContract;
  const recipientAddress = senderAddress;
  const isMainChainAddress =
    senderContractAddress === ethers.constants.AddressZero;
  let senderTokenPrice;

  if (isMainChainAddress) {
    // Special case for native transfer
    senderTokenPrice = getRateByCurrencyName(allRates, 'eth', chain)[0].rate;
  } else {
    senderTokenPrice = (
      await dispatch(
        getERC20TokenPrice({address: senderContractAddress, chain}),
      )
    ).usdPrice;
  }

  const formattedTokenAddress = addTokenChainSuffix(
    senderContractAddress.toLowerCase(),
    chain,
  );

  const swapFromCurrencyAbbreviation =
    tokenOptions[formattedTokenAddress]?.symbol.toLowerCase() ||
    BitpaySupportedCoins[chain].coin.toLowerCase();

  const swapFormatAmount = await dispatch(
    FormatAmount(
      swapFromCurrencyAbbreviation,
      chain,
      isMainChainAddress ? undefined : senderContractAddress,
      Number(swapAmount),
    ),
  );

  const toFiatAmount = await dispatch(
    toFiat(
      Number(swapAmount),
      defaultAltCurrency.isoCode,
      swapFromCurrencyAbbreviation,
      chain,
      allRates,
      isMainChainAddress ? undefined : senderContractAddress,
      senderTokenPrice,
    ),
  );

  const swapFiatAmount = formatFiatAmount(
    toFiatAmount,
    defaultAltCurrency.isoCode,
  );

  return {
    transactionDataName: camelCaseToUpperWords(transactionData.name),
    swapAmount,
    swapFormatAmount,
    swapFiatAmount,
    swapFromChain: chain,
    swapFromCurrencyAbbreviation,
    senderAddress,
    senderContractAddress,
    recipientAddress,
    senderTokenPrice,
  };
};

const handleExecuteTransaction = async (
  dispatch: any,
  keys: Keys,
  transactionData: ethers.utils.TransactionDescription,
  tokenOptions: {
    [x: string]: Token;
  },
  chain: string,
  defaultAltCurrency: AltCurrenciesRowProps,
  allRates: Rates,
  senderAddress: string,
) => {
  logManager.debug('processing execute transaction');
  const inputArgs = transactionData.args[1];
  const inputChunks = splitInputsToChunks(inputArgs);
  const relevantChunk = inputChunks.find(chunk => chunk.length === 8);

  const swapAmount = ethers.BigNumber.from('0x' + relevantChunk[1]).toString();
  const receiveAmount = ethers.BigNumber.from(
    '0x' + relevantChunk[2],
  ).toString();
  const combinedHex = relevantChunk[6] + relevantChunk[7];
  const {senderContractAddress, recipientAddress} =
    extractAddresses(combinedHex);

  const senderTokenPrice = (
    await dispatch(getERC20TokenPrice({address: senderContractAddress, chain}))
  ).usdPrice;
  const formattedTokenAddress = addTokenChainSuffix(
    senderContractAddress.toLowerCase(),
    chain,
  );
  const swapFromCurrencyAbbreviation =
    tokenOptions[formattedTokenAddress]?.symbol.toLowerCase() ||
    BitpaySupportedCoins[chain].coin.toLowerCase();

  const swapFormatAmount = await dispatch(
    FormatAmount(
      swapFromCurrencyAbbreviation,
      chain,
      senderContractAddress,
      Number(swapAmount),
    ),
  );

  const toFiatAmount = await dispatch(
    toFiat(
      Number(swapAmount),
      defaultAltCurrency.isoCode,
      swapFromCurrencyAbbreviation,
      chain,
      allRates,
      senderContractAddress,
      senderTokenPrice,
    ),
  );

  const swapFiatAmount = formatFiatAmount(
    toFiatAmount,
    defaultAltCurrency.isoCode,
  );

  return {
    transactionDataName: camelCaseToUpperWords(transactionData.name),
    swapAmount,
    swapFormatAmount,
    swapFiatAmount,
    swapFromChain: chain,
    swapFromCurrencyAbbreviation,
    receiveAmount,
    senderAddress,
    senderContractAddress,
    recipientAddress,
    senderTokenPrice,
  };
};

export const camelCaseToUpperWords = (input: string) => {
  return input
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toUpperCase();
};

export const getFullLinkedWallet = (key: Key, wallet: Wallet) => {
  const {
    credentials: {token, walletId},
  } = wallet;
  if (token) {
    const linkedWallet = key.wallets.find(({tokens}) =>
      tokens?.includes(walletId),
    );
    return linkedWallet;
  }

  return;
};

export const isAndroidStoragePermissionGranted = (
  dispatch: AppDispatch,
): Promise<boolean> => {
  return new Promise(async (resolve, reject) => {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]);
      if (
        granted['android.permission.READ_EXTERNAL_STORAGE'] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.WRITE_EXTERNAL_STORAGE'] ===
          PermissionsAndroid.RESULTS.GRANTED
      ) {
        logManager.info(
          '[isAndroidStoragePermissionGranted]: Storage permission granted',
        );
        resolve(true);
      } else {
        logManager.warn(
          '[isAndroidStoragePermissionGranted]: Storage permission denied',
        );
        throw new Error('Storage permission denied');
      }
    } catch (e) {
      reject(e);
    }
  });
};

export const getSolanaTokens = async (
  address: string,
  network: string = 'livenet',
): Promise<
  {
    mintAddress: string;
    ataAddress: string;
    decimals: number;
  }[]
> => {
  const _network = network === Network.mainnet ? 'mainnet' : 'devnet';
  const url = `${
    // @ts-ignore
    BASE_BITCORE_URL.sol
  }/SOL/${_network}/ata/${address}`;
  try {
    const apiResponse = await axios.get<any>(url);
    if (!apiResponse?.data || !Array.isArray(apiResponse.data)) {
      throw new Error(`No solana tokens found for address: ${address}`);
    }
    return apiResponse.data;
  } catch (err) {
    throw err;
  }
};

export const getSolanaTokenInfo = async (
  splTokenAddress: string,
  network: string = 'livenet',
): Promise<{
  name: string;
  symbol: string;
  decimals: number;
}> => {
  const _network = network === Network.mainnet ? 'mainnet' : 'devnet';
  const url = `${BASE_BITCORE_URL.sol}/SOL/${_network}/token/${splTokenAddress}`;
  try {
    const apiResponse = await axios.get(url);
    if (!apiResponse?.data) {
      throw new Error(
        `No solana tokens found for splTokenAddress: ${splTokenAddress}`,
      );
    }
    return apiResponse.data;
  } catch (err) {
    throw err;
  }
};

export async function sendSolanaTx(
  rawTx: string | Uint8Array,
  network: string = 'livenet',
): Promise<{data: any}> {
  const _network = network === Network.mainnet ? 'mainnet' : 'devnet';
  const url = `${BASE_BITCORE_URL.sol}/SOL/${_network}/tx/send`;
  const payload = {
    rawTx,
    network: 'mainnet',
    chain: 'SOL',
  };

  try {
    const resp = await axios.post(url, payload, {
      headers: {'Content-Type': 'application/json'},
    });
    return {data: resp.data};
  } catch (err: any) {
    const msg = err?.response?.data ?? err?.message ?? String(err);
    throw new Error(`Failed to send transaction: ${msg}`);
  }
}

export const getSolanaBlockTip = async (
  network: string = 'livenet',
): Promise<{
  hash: string;
  height: number;
  time: string;
}> => {
  const _network = network === Network.mainnet ? 'mainnet' : 'devnet';
  const url = `${BASE_BITCORE_URL.sol}/SOL/${_network}/block/tip`;

  try {
    const apiResponse = await axios.get(url);
    if (!apiResponse?.data) {
      throw new Error(`No block tip data returned for network: ${_network}`);
    }

    return apiResponse.data;
  } catch (err) {
    throw err;
  }
};

interface CreateAtaTxParams {
  fromKeyPair: SolKit.KeyPairSigner<string>;
  owner: string;
  ata: string;
  mint: string;
  blockHash: string;
  blockHeight: number;
}

export const createAtaIfNeededTx = ({
  fromKeyPair,
  owner,
  mint,
  ata,
  blockHash,
  blockHeight,
}: CreateAtaTxParams) => {
  if (!SolKit.isKeyPairSigner(fromKeyPair)) {
    throw new Error('fromKeyPair required to implement KeyPairSigner');
  }
  if (!(blockHash && blockHeight)) {
    throw new Error('blockHash and blockHeight required');
  }
  const recentBlockhash = {
    blockhash: blockHash as SolKit.Blockhash,
    lastValidBlockHeight: BigInt(blockHeight),
  };
  const SPLTxProvider = BwcProvider.getInstance()
    .getCore()
    .Transactions.get({chain: getCWCChain('sol')});
  const createAtaIx = SPLTxProvider.constructor.createAtokenInstructions(
    'createAssociatedTokenIdempotent',
    {
      payer: fromKeyPair.address,
      owner,
      ata,
      mint,
    },
  );
  const txMsg = SolKit.pipe(
    SolKit.createTransactionMessage({version: 'legacy'}),
    tx => SolKit.setTransactionMessageFeePayerSigner(fromKeyPair, tx),
    tx =>
      SolKit.setTransactionMessageLifetimeUsingBlockhash(recentBlockhash, tx),
    tx => SolKit.appendTransactionMessageInstructions([createAtaIx], tx),
  );
  const compiled = SolKit.compileTransaction(txMsg);
  return SolKit.getBase64EncodedWireTransaction(compiled);
};

export const getOrCreateAssociatedTokenAddress = async (params: {
  mint: string;
  feePayer: string; // owner is the ATA owner
}): Promise<string> => {
  const [associatedTokenAddress] = await findAssociatedTokenPda({
    mint: SolKit.address(params.mint),
    owner: SolKit.address(params.feePayer),
    tokenProgram: SolKit.address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), // TODO resolve token program - check for TOKEN_2022_PROGRAM_ADDRESS
  });
  return associatedTokenAddress.toString();
};

async function deriveSolKeyPairSigner(derivation: DerivationInput) {
  const {xPrivKeyEDDSA, rootPath, network} = derivation;
  const keyPair = BwcProvider.getInstance()
    .getCore()
    .Deriver.derivePrivateKeyWithPath(
      'sol',
      network,
      xPrivKeyEDDSA,
      rootPath,
      '',
    );
  const privKeyBytes = SolKit.getBase58Encoder().encode(keyPair.privKey!);
  const signer = await SolKit.createKeyPairSignerFromPrivateKeyBytes(
    privKeyBytes,
  );
  return {signer, rawKeyPair: keyPair};
}

export interface DerivationInput {
  xPrivKeyEDDSA: string;
  rootPath: string;
  network: string;
}
export interface CreateAtaAndSendParams {
  ataAddress: string;
  /** address owner that will hold the token account (ATA owner/recipient) */
  ownerAddress: string;
  mintAddress: string;
  derivation: DerivationInput;
  network?: string;
}

export interface CreateAtaAndSendResult {
  ataAddress: string;
  signature?: string;
  rawResponse?: any;
}

export async function createAtaAndSend({
  ataAddress,
  ownerAddress,
  mintAddress,
  derivation,
  network = 'livenet',
}: CreateAtaAndSendParams): Promise<CreateAtaAndSendResult> {
  const {signer, rawKeyPair} = await deriveSolKeyPairSigner(derivation);

  const {hash, height} = await getSolanaBlockTip(network);

  const base64Tx = createAtaIfNeededTx({
    fromKeyPair: signer,
    owner: ownerAddress,
    mint: mintAddress,
    ata: ataAddress,
    blockHash: hash,
    blockHeight: height,
  });

  const SPLTxProvider = BwcProvider.getInstance()
    .getCore()
    .Transactions.get({chain: getCWCChain('sol')});

  const signedTxBase64 = await SPLTxProvider.sign({
    tx: base64Tx,
    key: {privKey: rawKeyPair.privKey!},
  });

  const {data} = await sendSolanaTx(signedTxBase64, network);

  return {
    ataAddress,
    signature: data?.txid,
    rawResponse: data,
  };
}

export const checkEncryptedKeysForEddsaMigration =
  (key: Key, password: string) =>
  async (dispatch: any): Promise<void> => {
    if (
      checkEncryptPassword(key, password) &&
      !key?.properties?.xPrivKeyEDDSAEncrypted &&
      !key?.properties?.xPrivKeyEDDSA
    ) {
      key.methods!.addKeyByAlgorithm('EDDSA', {password});
      key.properties = key.methods!.toObj();
      dispatch(successImport({key}));
    }
  };

export const decodeSolanaTxIntructions = async (
  rawTx: string,
  network: string = 'livenet',
): Promise<any> => {
  const _network = network === Network.mainnet ? 'mainnet' : 'devnet';
  const url = `${BASE_BITCORE_URL.sol}/SOL/${_network}/decode`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  try {
    const apiResponse = await axios.post(url, {rawTx}, config);
    if (!apiResponse?.data?.instructions) {
      throw new Error(
        `Could not decode solana instruction for rawTx: ${rawTx}`,
      );
    }
    return apiResponse.data.instructions;
  } catch (err) {
    throw err;
  }
};
