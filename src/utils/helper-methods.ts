import {Key, KeyMethods, Token, Wallet} from '../store/wallet/wallet.models';
import {ContactRowProps} from '../components/list/ContactRow';
import {Network} from '../constants';
import {CurrencyListIcons} from '../constants/SupportedCurrencyOptions';
import {ReactElement} from 'react';
import {IsERCToken, IsEVMChain} from '../store/wallet/utils/currency';
import {Rate, Rates} from '../store/rate/rate.models';
import {PROTOCOL_NAME} from '../constants/config';
import _ from 'lodash';
import {NavigationProp, StackActions} from '@react-navigation/native';
import {AppDispatch} from './hooks';
import {createWalletAddress} from '../store/wallet/effects/address/address';
import {
  getBaseAccountCreationCoinsAndTokens,
  BitpaySupportedCoins,
  SUPPORTED_EVM_COINS,
} from '../constants/currencies';
import {LogActions} from '../store/log';
import {createMultipleWallets} from '../store/wallet/effects';
import {toFiat} from '../store/wallet/utils/wallet';
import {FormatAmount} from '../store/wallet/effects/amount/amount';
import {getERC20TokenPrice} from '../store/moralis/moralis.effects';
import {ethers} from 'ethers';
import EtherscanAPI from '../api/etherscan';
import {WALLET_CONNECT_SUPPORTED_CHAINS} from '../constants/WalletConnectV2';
import {BitpaySupportedTokenOptsByAddress} from '../constants/tokens';
import {Effect} from '../store';
import {Web3WalletTypes} from '@walletconnect/web3wallet';
import {ERC20_ABI} from '../navigation/wallet-connect/constants/abi-erc20';
import {AltCurrenciesRowProps} from '../components/list/AltCurrenciesRow';
import {Keys} from '../store/wallet/wallet.reducer';

export const suffixChainMap: {[suffix: string]: string} = {
  eth: 'e',
  matic: 'm',
  arb: 'arb',
  base: 'base',
  op: 'op',
};

export const sleep = (duration: number) =>
  new Promise<void>(resolve => setTimeout(resolve, duration));

export const titleCasing = (str: string) =>
  `${str.charAt(0).toUpperCase()}${str.slice(1)}`;

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

const getFormatter = (
  amount: number,
  currency: string = 'USD',
  opts: {
    customPrecision?: 'minimal';
    currencyAbbreviation?: string;
    currencyDisplay?: 'symbol' | 'code';
  } = {},
) => {
  const significantDigits = getSignificantDigits(opts.currencyAbbreviation);
  return new Intl.NumberFormat('en-US', {
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
  });
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
  const currencyDisplay = opts.currencyDisplay || 'symbol';
  const formatter = getFormatter(amount, currency, {...opts, currencyDisplay});

  if (currencyDisplay === 'symbol') {
    return formatter.format(amount);
  }

  let code;
  let numberString = formatter
    .formatToParts(amount)
    .map(({type, value}) => {
      switch (type) {
        case 'currency':
          code = value;
          return '';
        default:
          return value;
      }
    })
    .reduce((string, part) => string + part);
  return `${numberString} ${code}`;
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
    address.substring(0, 4) + '....' + address.substring(address.length - 4)
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
  const formatter = getFormatter(amount, currency, {...opts, currencyDisplay});

  if (currencyDisplay === 'symbol') {
    return {amount: formatter.format(amount)};
  }

  let code;
  let numberString = formatter
    .formatToParts(amount)
    .map(({type, value}) => {
      switch (type) {
        case 'currency':
          code = value;
          return '';
        default:
          return value;
      }
    })
    .reduce((string, part) => string + part);
  return {amount: numberString, code};
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
): Rate[] => {
  const currencyName = getCurrencyAbbreviation(currencyAbbreviation, chain);
  if (currencyAbbreviation === 'pol' && rates.matic.length > 0) {
    return rates.matic;
  }
  return rates[currencyName] || rates[currencyAbbreviation];
};

export const addTokenChainSuffix = (name: string, chain: string) => {
  return `${name.toLowerCase()}_${suffixChainMap[chain]}`;
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
  return IsERCToken(name.toLowerCase(), chain.toLowerCase())
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

export const getProtocolsName = (): string | undefined => {
  return SUPPORTED_EVM_COINS.map(
    chain => PROTOCOL_NAME[chain][Network.mainnet],
  ).join(', ');
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
}: {
  appDispatch: AppDispatch;
  wallets: Wallet[];
}) => {
  await Promise.all(
    wallets.map(async wallet => {
      try {
        if (!wallet.receiveAddress && wallet?.credentials?.isComplete()) {
          const walletAddress = (await appDispatch<any>(
            createWalletAddress({wallet, newAddress: false}),
          )) as string;
          wallet.receiveAddress = walletAddress;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        appDispatch(
          LogActions.error(
            `Error creating address for wallet ${wallet?.id}-${wallet?.chain}-${wallet?.walletName}: ${errMsg}`,
          ),
        );
      }
    }),
  );
};

export const createWalletsForAccounts = async (
  dispatch: any,
  accountsArray: number[],
  key: KeyMethods,
  password?: string,
) => {
  return (
    await Promise.all(
      accountsArray.flatMap(async account => {
        try {
          const newWallets = (await dispatch(
            createMultipleWallets({
              key: key as KeyMethods,
              currencies: getBaseAccountCreationCoinsAndTokens(),
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
          dispatch(
            LogActions.debug(
              `Error creating wallet - continue anyway: ${errMsg}`,
            ),
          );
        }
      }),
    )
  )
    .flat()
    .filter(Boolean) as Wallet[];
};

export const getEvmGasWallets = (wallets: Wallet[]) => {
  return wallets.filter(
    wallet =>
      IsEVMChain(wallet.credentials.chain) &&
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
}

export const processOtherMethodsRequest =
  (event: Web3WalletTypes.SessionRequest): Effect<Promise<RequestUiValues>> =>
  async (dispatch, getState) => {
    console.log('processing other method transaction');
    const {
      WALLET: {keys},
    } = getState();
    const {params} = event;
    const {chainId, request} = params;
    const {method} = params.request;
    const swapFromChain = WALLET_CONNECT_SUPPORTED_CHAINS[chainId]?.chain;
    let senderAddress = '';
    switch (method) {
      case 'eth_signTypedData':
      case 'eth_signTypedData_v1':
      case 'eth_signTypedData_v3':
      case 'eth_signTypedData_v4':
      case 'eth_sign':
        senderAddress = request.params[0];
        break;
      case 'personal_sign':
        senderAddress = request.params[1];
        break;
      case 'eth_signTransaction':
        senderAddress = request.params[0].from;
        break;
    }
    try {
      const wallet = Object.values(keys).flatMap(key =>
        key.wallets.filter(
          wallet =>
            wallet.receiveAddress?.toLowerCase() ===
              senderAddress.toLowerCase() && wallet.chain === swapFromChain,
        ),
      )[0];
      const {currencyAbbreviation} = wallet; // this is the "gas" wallet
      return {
        transactionDataName: 'Sign Request',
        swapFromChain,
        senderAddress,
        swapFromCurrencyAbbreviation: currencyAbbreviation,
      };
    } catch (error) {
      console.error(`Error processing ${method} request:`, error);
      throw error;
    }
  };

export const processSwapRequest =
  (event: Web3WalletTypes.SessionRequest): Effect<Promise<RequestUiValues>> =>
  async (dispatch, getState) => {
    try {
      const {
        WALLET: {tokenOptionsByAddress, customTokenOptionsByAddress, keys},
        APP: {defaultAltCurrency},
        RATE: {rates: allRates},
      } = getState();

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
        return handleDefaultTransaction(keys, swapFromChain, from, method);
      }

      const abi = await fetchContractAbi(dispatch, swapFromChain, to);
      const contractInterface = new ethers.utils.Interface(abi);
      const transactionData = contractInterface.parseTransaction({data});
      const transactionDataName = transactionData.name;
      const transactionTypes = ['approve', 'withdraw', 'deposit'];

      if (
        transactionTypes.includes(transactionDataName) ||
        !transactionData.args[1]
      ) {
        return handleDefaultTransaction(
          keys,
          swapFromChain,
          from,
          transactionDataName,
        ); // approve  / withdraw / deposit
      }
      return handleSwapTransaction(
        dispatch,
        keys,
        transactionData,
        tokenOptions,
        swapFromChain,
        defaultAltCurrency,
        allRates,
        from,
      );
    } catch (error) {
      console.error('Error processing swap request:', error);
      throw error;
    }
  };

const fetchContractAbi = async (
  dispatch: any,
  chain: string,
  address: string,
) => {
  let abi = await dispatch(EtherscanAPI.getContractAbi(chain, address));
  if (!abi) {
    throw new Error('No abi found');
  }
  if (abi === 'Contract source code not verified') {
    abi = JSON.stringify(ERC20_ABI); // Fallback to ERC20 ABI
    return abi;
  }
  let parsedAbi;
  try {
    parsedAbi = JSON.parse(abi);
  } catch (error) {
    throw new Error('No abi found');
  }
  if (
    parsedAbi &&
    parsedAbi.some((item: any) => item.name === 'implementation')
  ) {
    console.log('Detected EIP-1967 proxy contract');
    const implementationSlot =
      '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
    const paddedImplementationAddress = await EtherscanAPI.getStorageAt(
      chain,
      address,
      implementationSlot,
    );
    const implementationAddress = `0x${paddedImplementationAddress.slice(-40)}`;
    abi = await dispatch(
      EtherscanAPI.getContractAbi(chain, implementationAddress),
    );
  }
  return abi;
};

const handleDefaultTransaction = async (
  keys: Keys,
  chain: string,
  senderAddress: string,
  transactionDataName: string,
) => {
  console.log(`processing ${transactionDataName} transaction`);
  const wallet = Object.values(keys).flatMap(key =>
    key.wallets.filter(
      wallet =>
        wallet.receiveAddress?.toLowerCase() === senderAddress.toLowerCase() &&
        wallet.chain === chain,
    ),
  )[0];
  const {currencyAbbreviation} = wallet; // this is the "gas" wallet
  return {
    transactionDataName,
    swapFromChain: chain,
    senderAddress,
    swapFromCurrencyAbbreviation: currencyAbbreviation,
  };
};

const handleSwapTransaction = async (
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
  console.log('processing swap transaction');
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
    transactionDataName: transactionData.name,
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
