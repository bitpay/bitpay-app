import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
  ReactElement,
} from 'react';
import styled from 'styled-components/native';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import {
  BitpaySupportedCoins,
  BitpaySupportedEvmCoins,
  BitpaySupportedTokens,
  SUPPORTED_COINS,
  SUPPORTED_EVM_COINS,
  SUPPORTED_TOKENS,
  SupportedChains,
} from '../../../constants/currencies';
import {Wallet, Key} from '../../../store/wallet/wallet.models';
import {
  convertToFiat,
  formatFiatAmount,
  getBadgeImg,
  getChainFromTokenByAddressKey,
  getCurrencyAbbreviation,
  keyExtractor,
  sleep,
} from '../../../utils/helper-methods';
import {
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  View,
} from 'react-native';
import GlobalSelectRow from '../../../components/list/GlobalSelectRow';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {
  RowContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import _ from 'lodash';
import KeyWalletsRow, {
  KeyWallet,
  KeyWalletsRowProps,
} from '../../../components/list/KeyWalletsRow';
import merge from 'lodash.merge';
import cloneDeep from 'lodash.clonedeep';
import {LightBlack, SlateDark, White} from '../../../styles/colors';
import {H4, TextAlign, BaseText, H5} from '../../../components/styled/Text';
import {WalletScreens, WalletGroupParamList} from '../WalletGroup';
import {RouteProp, useRoute} from '@react-navigation/core';
import {useNavigation, useTheme} from '@react-navigation/native';
import ReceiveAddress from '../components/ReceiveAddress';
import CloseModal from '../../../../assets/img/close-modal-icon.svg';
import InfoSvg from '../../../../assets/img/info.svg';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import {
  dismissOnGoingProcessModal,
  setSelectedNetworkForDeposit,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {Effect} from '../../../store';
import {BitpaySupportedTokenOptsByAddress} from '../../../constants/tokens';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import Button, {ButtonState} from '../../../components/button/Button';
import {useTranslation} from 'react-i18next';
import {findWalletById, toFiat} from '../../../store/wallet/utils/wallet';
import {
  IsERCToken,
  IsEVMCoin,
  IsSegwitCoin,
} from '../../../store/wallet/utils/currency';
import {LogActions} from '../../../store/log';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Analytics} from '../../../store/analytics/analytics.effects';
import SearchComponent, {
  SearchableItem,
} from '../../../components/chain-search/ChainSearch';
import {ignoreGlobalListContextList} from '../../../components/modal/chain-selector/ChainSelector';
import uniqBy from 'lodash.uniqby';
import {CreateOptions} from '../../../store/wallet/effects';
import {ToWalletSelectorCustomCurrency} from '../../services/components/ToWalletSelectorModal';
import {SupportedCoinsOptions} from '../../../constants/SupportedCurrencyOptions';
import {AppActions} from '../../../store/app';
import {
  createHomeCardList,
  keyBackupRequired,
} from '../../tabs/home/components/Crypto';
import {Network} from '../../../constants';
import {SwapCryptoCoin} from '../../services/swap-crypto/screens/SwapCryptoRoot';
import Icons from '../../wallet/components/WalletIcons';
import Animated, {FadeIn} from 'react-native-reanimated';

const ModalHeader = styled.View`
  height: 50px;
  margin-right: 10px;
  margin-left: 10px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  position: relative;
`;

const CloseModalButtonContainer = styled.View`
  position: absolute;
  left: 0;
`;

const CloseModalButton = styled.TouchableOpacity`
  padding: 5px;
  height: 41px;
  width: 41px;
  border-radius: 50px;
  background-color: #9ba3ae33;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModalTitleContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const SafeAreaView = styled.SafeAreaView`
  flex: 1;
`;

const GlobalSelectContainer = styled.View`
  padding: ${ScreenGutter};
`;

export const WalletSelectMenuContainer = styled.View`
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  max-height: 75%;
  padding-bottom: 20px;
`;

export interface WalletSelectMenuHeaderContainerParams {
  currency?: string;
}

export const WalletSelectMenuHeaderContainer = styled.View<WalletSelectMenuHeaderContainerParams>`
  padding: 16px;
  padding-bottom: ${({currency}) => (currency ? 14 : 0)}px;
  justify-content: ${({currency}) => (currency ? 'flex-start' : 'center')};
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : '#ECEFFD')};
  border-bottom-width: ${({currency}) => (currency ? 1 : 0)}px;
`;

export const WalletSelectBottomContainer = styled.TouchableOpacity`
  padding: 16px;
`;

export const WalletSelectMenuHeaderIconContainer = styled.View`
  padding-right: 0px;
`;

export const WalletSelectMenuBodyContainer = styled.ScrollView`
  padding: 0 ${ScreenGutter} 2px;
`;

const NoWalletsMsg = styled(BaseText)`
  font-size: 15px;
  text-align: center;
  margin-top: 20px;
`;

const PlusIconContainer = styled.View`
  margin-right: 15px;
`;

const SearchComponentContainer = styled.View`
  margin-bottom: 16px;
`;

interface ToWalletSelectorCoinObj {
  id: string;
  chain: string;
  currencyAbbreviation: string;
  currencyName: string;
  tokenAddress?: string;
  img?: string | ((props?: any) => ReactElement);
  total: number;
  availableWalletsByKey: {
    [key in string]: Wallet[];
  };
}
interface ToWalletSelectorChainObj extends ToWalletSelectorCoinObj {
  tokens?: ToWalletSelectorCoinObj[];
}

export type GlobalSelectModalContext =
  | 'send'
  | 'receive'
  | 'coinbase'
  | 'contact'
  | 'scanner'
  | 'sell'
  | 'buy'
  | 'swap'
  | 'paperwallet';

export type GlobalSelectParamList = {
  context: GlobalSelectModalContext;
  recipient?: {
    address: string;
    currency: string;
    chain: string;
    name?: string;
    type?: string;
    network?: string;
    destinationTag?: number;
    opts?: {
      sendMax?: boolean | undefined;
      message?: string;
      feePerKb?: number;
      showEVMWalletsAndTokens?: boolean;
    };
  };
  amount?: number;
};

export interface GlobalSelectObj extends SearchableItem {
  id: string;
  currencyName: string;
  currencyAbbreviation: string;
  img: string | ((props?: any) => React.ReactElement);
  total: number;
  chainsImg: {
    [key: string]: {
      badgeUri?: string | ((props?: any) => React.ReactElement) | undefined;
      badgeImg?: string | ((props?: any) => React.ReactElement) | undefined;
      priority: number | undefined;
    };
  };
  chains: string[];
  tokenAddresses: {
    [key: string]: {
      tokenAddress?: string;
    };
  };
  availableWallets: Wallet[];
  availableWalletsByKey: {
    [key: string]: Wallet[];
  };
}

export interface GlobalSelectObjByKey {
  [key: string]: GlobalSelectObj;
}

export interface AddWalletData {
  key: Key;
  currency: {
    chain: string;
    currencyAbbreviation: string;
    isToken?: boolean;
    tokenAddress?: string;
  };
  associatedWallet?: Wallet;
  options: CreateOptions;
  context?: string;
}

const buildSelectableCurrenciesList = (
  customToSelectCurrencies: ToWalletSelectorCustomCurrency[] | SwapCryptoCoin[],
  selectedChainFilterOption: string | undefined,
  wallets: Wallet[],
): GlobalSelectObjByKey => {
  const coins: GlobalSelectObjByKey = {};
  customToSelectCurrencies.forEach(currency => {
    const {currencyAbbreviation, chain, name, tokenAddress, logoUri, badgeUri} =
      currency;

    if (!selectedChainFilterOption || chain === selectedChainFilterOption) {
      const filteredWallets = wallets.filter(
        wallet =>
          wallet.currencyAbbreviation === currencyAbbreviation &&
          wallet.chain === chain,
      );

      const coinEntry = coins[currencyAbbreviation] || {
        id: _.uniqueId('coin_'),
        currencyName: name,
        currencyAbbreviation,
        chainsImg: {},
        chains: [],
        tokenAddresses: {},
        img: logoUri,
        availableWallets: [],
        availableWalletsByKey: {},
      };

      coinEntry.availableWallets = _.unionBy(
        [...coinEntry.availableWallets, ...filteredWallets],
        c => c.id,
      );

      coinEntry.total = coinEntry.availableWallets.length;
      coinEntry.availableWalletsByKey = _.groupBy(
        coinEntry.availableWallets,
        'keyId',
      );
      const priority = SupportedCoinsOptions.find(
        ({chain: _chain}) => _chain === chain,
      )?.priority;
      coinEntry.chainsImg[chain] = {
        badgeUri:
          IsEVMCoin(currencyAbbreviation) && !badgeUri ? logoUri : badgeUri,
        priority,
      };
      if (!coinEntry.chains.includes(chain)) {
        coinEntry.chains = [...coinEntry.chains, chain];
      }
      if (tokenAddress) {
        coinEntry.tokenAddresses[chain] = {
          tokenAddress,
        };
      }
      coins[currencyAbbreviation] = coinEntry;
    }
  });

  return coins;
};

const buildSelectableWalletList = (
  categories: string[],
  wallets: Wallet[],
): GlobalSelectObjByKey => {
  const coins: GlobalSelectObjByKey = {};

  categories.forEach(category => {
    const filteredWallets = wallets.filter(
      wallet =>
        getCurrencyAbbreviation(wallet.currencyAbbreviation, wallet.chain) ===
        category,
    );
    if (filteredWallets.length > 0) {
      const {currencyAbbreviation, chain, currencyName, img} =
        filteredWallets[0];

      const coinEntry = coins[currencyAbbreviation] || {
        id: _.uniqueId('coin_'),
        currencyName,
        currencyAbbreviation,
        chainsImg: {},
        chains: [],
        tokenAddresses: createTokenAddresses(filteredWallets),
        img,
        availableWallets: [],
        availableWalletsByKey: {},
      };

      coinEntry.availableWallets = [
        ...coinEntry.availableWallets,
        ...filteredWallets,
      ];
      coinEntry.chains = [
        ...coinEntry.chains,
        ...Array.from(new Set(filteredWallets.map(w => w.chain))),
      ];
      coinEntry.total = coinEntry.availableWallets.length;
      coinEntry.availableWalletsByKey = _.groupBy(
        coinEntry.availableWallets,
        'keyId',
      );

      const priority = SupportedCoinsOptions.find(
        ({chain: _chain}) => _chain === chain,
      )?.priority;

      coinEntry.chains.forEach(chain => {
        const wallet = filteredWallets.find(w => w.chain === chain);
        if (!wallet || coinEntry.chainsImg[chain]?.priority) {
          return;
        }
        coinEntry.chainsImg[chain] = {
          badgeUri:
            IsEVMCoin(currencyAbbreviation) && !wallet.badgeImg
              ? wallet.img
              : wallet.badgeImg,
          priority,
        };
      });
      coins[currencyAbbreviation] = coinEntry;
    }
  });
  return coins;
};

const createTokenAddresses = (
  wallets: Wallet[],
): {
  [key: string]: {
    tokenAddress?: string;
  };
} => {
  return wallets.reduce(
    (acc, wallet) => {
      if (wallet.credentials.tokenAddress) {
        acc[wallet.chain] = {tokenAddress: wallet.credentials.tokenAddress};
      }
      return acc;
    },
    {} as {
      [key: string]: {
        tokenAddress?: string;
      };
    },
  );
};

const filterByChain = (
  selectObj: GlobalSelectObj,
  selectedNetworkForDeposit: string,
) => {
  const newSelectObj = {...selectObj};

  Object.entries(newSelectObj.availableWalletsByKey).forEach(
    ([key, wallets]) => {
      const filteredWallets = wallets.filter(
        wallet => wallet.credentials.chain === selectedNetworkForDeposit,
      );
      if (filteredWallets.length > 0) {
        newSelectObj.availableWalletsByKey[key] = filteredWallets;
      } else {
        delete newSelectObj.availableWalletsByKey[key]; // Remove keys with no matching wallets
      }
    },
  );

  // Filter availableWallets
  newSelectObj.availableWallets = newSelectObj.availableWallets.filter(
    wallet => wallet.credentials.chain === selectedNetworkForDeposit,
  );

  // Filter chains
  newSelectObj.chains = newSelectObj.chains.filter(
    chain => chain === selectedNetworkForDeposit,
  );

  // Filter token addresses
  newSelectObj.chains = newSelectObj.chains.filter(
    chain => chain === selectedNetworkForDeposit,
  );

  // Filter chainsImg
  const filteredChainsImg = {};
  Object.entries(newSelectObj.chainsImg).forEach(([chain, value]) => {
    if (chain === selectedNetworkForDeposit) {
      // @ts-ignore
      filteredChainsImg[chain] = value;
    }
  });
  newSelectObj.chainsImg = filteredChainsImg;

  return newSelectObj;
};

const handleLinkedChainSelection = (
  linkedChain: any,
  selectedNetworkForDeposit: any,
  filteredSelectedObj: any,
  setAddTokenToLinkedWallet: (obj: any) => void,
  openWalletSelector: (obj: any) => void,
  openKeySelector: (obj: any) => void,
) => {
  const filteredLinkedChain = filterByChain(
    linkedChain,
    selectedNetworkForDeposit,
  );
  if (Object.keys(filteredLinkedChain?.availableWalletsByKey).length > 0) {
    setAddTokenToLinkedWallet(filteredSelectedObj);
    openWalletSelector(filteredLinkedChain);
  } else {
    openKeySelector(filteredSelectedObj);
  }
};

const handleTokenWalletSelection = (
  chain: string,
  currencyAbbreviation: string,
  filteredSelectedObj: any,
  selectedNetworkForDeposit: any,
  currenciesSupportedList: any[],
  setAddTokenToLinkedWallet: (obj: any) => void,
  openWalletSelector: (obj: any) => void,
  openKeySelector: (obj: any) => void,
) => {
  const linkedChain = currenciesSupportedList.find(
    coin =>
      BitpaySupportedCoins[coin.currencyAbbreviation] &&
      coin.chains.includes(chain),
  );
  if (linkedChain) {
    handleLinkedChainSelection(
      linkedChain,
      selectedNetworkForDeposit,
      filteredSelectedObj,
      setAddTokenToLinkedWallet,
      openWalletSelector,
      openKeySelector,
    );
  } else {
    openKeySelector(filteredSelectedObj);
  }
};

const isChainDisabled = (
  disabledChain: string | undefined,
  currencySymbol: string,
): boolean => {
  // disabledChain to prevent show chain selected as source, but show the available tokens
  return (
    !!disabledChain &&
    SUPPORTED_EVM_COINS.includes(disabledChain) &&
    disabledChain === currencySymbol.toLowerCase()
  );
};

const handleWalletSelection = (
  filteredSelectedObj: any,
  selectedNetworkForDeposit: any,
  currenciesSupportedList: any[],
  setAddTokenToLinkedWallet: (obj: any) => void,
  openWalletSelector: (obj: any) => void,
  openKeySelector: (obj: any) => void,
  onWalletSelect: (wallet: any) => void,
  disabledChain: string | undefined,
  logger: any,
) => {
  const {chains, currencyAbbreviation} = filteredSelectedObj;
  const chain = chains[0];
  if (
    isChainDisabled(
      disabledChain,
      getCurrencyAbbreviation(currencyAbbreviation, chain),
    )
  ) {
    logger.warn(
      `${disabledChain} is disabled, since it is the source of the Swap. Showing available tokens anyways`,
    );
    return;
  }
  const wallets = Object.values(
    filteredSelectedObj.availableWalletsByKey,
  ).flat();
  if (wallets.length === 0) {
    if (IsERCToken(currencyAbbreviation, chain)) {
      handleTokenWalletSelection(
        chain,
        currencyAbbreviation,
        filteredSelectedObj,
        selectedNetworkForDeposit,
        currenciesSupportedList,
        setAddTokenToLinkedWallet,
        openWalletSelector,
        openKeySelector,
      );
    } else {
      openKeySelector(filteredSelectedObj);
    }
  } else {
    openWalletSelector(filteredSelectedObj);
  }
};

interface GlobalSelectProps {
  useAsModal?: boolean;
  modalTitle?: any;
  customSupportedCurrencies?: any[];
  customToSelectCurrencies?:
    | ToWalletSelectorCustomCurrency[]
    | SwapCryptoCoin[];
  globalSelectOnDismiss?: (
    newWallet?: any,
    createNewWalletData?: AddWalletData,
  ) => void;
  modalContext?: any;
  livenetOnly?: any;
  disabledChain?: string | undefined;
  onHelpPress?: () => void;
  selectingNetworkForDeposit?: boolean;
}

type GlobalSelectScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.GLOBAL_SELECT
> &
  GlobalSelectProps;

const GlobalSelect: React.FC<GlobalSelectScreenProps | GlobalSelectProps> = ({
  useAsModal,
  modalTitle,
  customSupportedCurrencies,
  customToSelectCurrencies,
  globalSelectOnDismiss,
  modalContext,
  livenetOnly,
  disabledChain,
  onHelpPress,
  selectingNetworkForDeposit,
}) => {
  const {t} = useTranslation();
  const route = useRoute<RouteProp<WalletGroupParamList, 'GlobalSelect'>>();
  let {context, recipient, amount} = route.params || {};
  if (useAsModal && modalContext) {
    context = modalContext;
  }
  const theme = useTheme();
  const logger = useLogger();
  const dispatch = useAppDispatch();
  const {keys, tokenOptionsByAddress, customTokenOptionsByAddress} =
    useAppSelector(({WALLET}) => WALLET);
  const {rates} = useAppSelector(({RATE}) => RATE);
  const allTokensByAddress = {
    ...BitpaySupportedTokenOptsByAddress,
    ...tokenOptionsByAddress,
    ...customTokenOptionsByAddress,
  };
  const chainSelectorIsVisible = useAppSelector(
    ({APP}) => APP.showChainSelectorModal,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [dataToDisplay, setDataToDisplay] = useState<GlobalSelectObj[]>([]);
  const [showInitiallyHiddenComponents, setShowInitiallyHiddenComponents] =
    useState(false);
  const [showModalContent, setShowModalContent] = useState(false);
  const [mountSheetModals, setMountSheetModals] = useState(false);
  const [chainSelectorModalIsVisible, setChainSelectorModalIsVisible] =
    useState(false);
  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);
  const [showReceiveAddressBottomModal, setShowReceiveAddressBottomModal] =
    useState(false);
  const [receiveWallet, setReceiveWallet] = useState<Wallet>();
  const navigation = useNavigation();
  const [walletSelectModalVisible, setWalletSelectModalVisible] =
    useState(false);
  const [selectedObj, setSelectedObj] = useState({} as GlobalSelectObj);
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as GlobalSelectObj[]);
  const selectedChainFilterOption = useAppSelector(({APP}) =>
    ignoreGlobalListContextList.includes(context)
      ? APP.selectedLocalChainFilterOption
      : APP.selectedChainFilterOption,
  );
  const selectedNetworkForDeposit = useAppSelector(
    ({APP}) => APP.selectedNetworkForDeposit,
  );
  const [keySelectorModalVisible, setKeySelectorModalVisible] =
    useState<boolean>(false);
  const [cardsList, setCardsList] = useState<any>();
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const [addTokenToLinkedWallet, setAddTokenToLinkedWallet] =
    useState<GlobalSelectObj>();
  const [selectedToAddToNewWallet, setSelectedToAddToNewWallet] =
    useState<GlobalSelectObj>();
  // object to pass to select modal
  const [keyWallets, setKeysWallets] =
    useState<KeyWalletsRowProps<KeyWallet>[]>();

  useState(async () => {
    await sleep(400);
    setShowModalContent(true);
    setShowInitiallyHiddenComponents(true);
    await sleep(1000);
    setMountSheetModals(true);
  }, []);

  const NON_BITPAY_SUPPORTED_TOKENS = Array.from(
    new Set(
      Object.entries(allTokensByAddress)
        .flatMap(([address, tokenData]) => {
          const symbol = tokenData?.symbol?.toLowerCase();
          const chain = getChainFromTokenByAddressKey(address);
          const currency = getCurrencyAbbreviation(symbol, chain);
          return !BitpaySupportedTokens[address] &&
            !BitpaySupportedCoins[currency]
            ? currency
            : undefined;
        })
        .filter((currency): currency is string => currency !== undefined),
    ),
  );
  // all wallets
  let wallets = Object.values(keys).flatMap(key => key.wallets);
  // Filter hidden wallets
  wallets = wallets.filter(wallet => !wallet.hideWallet);

  // only show wallets with funds
  if (
    ['send', 'sell', 'swap', 'coinbase', 'contact', 'scanner'].includes(context)
  ) {
    wallets = wallets.filter(wallet => wallet.balance.sat > 0);
  }

  if (recipient && ['coinbase', 'contact', 'scanner'].includes(context)) {
    if (recipient.currency && recipient.chain) {
      wallets = wallets.filter(
        wallet =>
          (wallet.currencyAbbreviation === recipient?.currency &&
            wallet.chain === recipient?.chain) ||
          (recipient?.opts?.showEVMWalletsAndTokens &&
            BitpaySupportedEvmCoins[wallet.currencyAbbreviation]),
      );
    }
    if (recipient?.network) {
      wallets = wallets.filter(wallet => wallet.network === recipient?.network);
    }
  }

  if (livenetOnly) {
    wallets = wallets.filter(wallet => wallet.network === 'livenet');
  }

  const currenciesSupportedList = useMemo(() => {
    const coins = customSupportedCurrencies
      ? customSupportedCurrencies
      : SUPPORTED_COINS;
    const tokens = customSupportedCurrencies ? [] : SUPPORTED_TOKENS;
    const nonBitpayTokens = customSupportedCurrencies
      ? []
      : NON_BITPAY_SUPPORTED_TOKENS;
    const allCurrencies = uniqBy(
      [...coins, ...tokens, ...nonBitpayTokens],
      c => c,
    );
    const allCurrencyData = buildSelectableWalletList(allCurrencies, wallets);
    setDataToDisplay(Object.values(allCurrencyData).splice(0, 20));
    return Object.values(allCurrencyData);
  }, []);

  const customCurrenciesSupportedList = useMemo(() => {
    if (customToSelectCurrencies) {
      const allCurrencyData = buildSelectableCurrenciesList(
        customToSelectCurrencies,
        selectedChainFilterOption,
        wallets,
      );
      setDataToDisplay(Object.values(allCurrencyData).splice(0, 20));
      return Object.values(allCurrencyData);
    } else {
      return [];
    }
  }, [selectedChainFilterOption]);

  const goToBuyCrypto = async () => {
    if (globalSelectOnDismiss) {
      globalSelectOnDismiss(undefined);
      await sleep(600);
      dispatch(
        LogActions.debug('[GlobalSelect] No wallets. Buy Crypto clicked.'),
      );
      dispatch(
        Analytics.track('Clicked Buy Crypto', {
          context: `GlobalSelect-${context}`,
        }),
      );
      navigation.reset({
        index: 1,
        routes: [
          {
            name: 'Tabs',
            params: {screen: 'Home'},
          },
          {
            name: 'BuyCryptoRoot',
            params: {
              amount: 200,
            },
          },
        ],
      });
    }
  };

  const openWalletSelector = useCallback(
    async (selectObj: GlobalSelectObj) => {
      setKeysWallets(
        Object.keys(selectObj.availableWalletsByKey).map(keyId => {
          const key = keys[keyId];
          return {
            key: keyId,
            keyName: key.keyName || 'My Key',
            backupComplete: key.backupComplete,
            wallets: selectObj.availableWalletsByKey[keyId]
              .filter(wallet => !wallet.hideWallet)
              .map(wallet => {
                const {
                  balance,
                  hideWallet,
                  currencyAbbreviation,
                  tokenAddress,
                  network,
                  chain,
                  credentials: {walletName: fallbackName},
                  walletName,
                } = wallet;
                return merge(cloneDeep(wallet), {
                  cryptoBalance: balance.crypto,
                  cryptoLockedBalance: balance.cryptoLocked,
                  fiatBalance: formatFiatAmount(
                    convertToFiat(
                      dispatch(
                        toFiat(
                          balance.sat,
                          defaultAltCurrency.isoCode,
                          currencyAbbreviation,
                          chain,
                          rates,
                          tokenAddress,
                        ),
                      ),
                      hideWallet,
                      network,
                    ),
                    defaultAltCurrency.isoCode,
                  ),
                  fiatLockedBalance: formatFiatAmount(
                    convertToFiat(
                      dispatch(
                        toFiat(
                          balance.satLocked,
                          defaultAltCurrency.isoCode,
                          currencyAbbreviation,
                          chain,
                          rates,
                          tokenAddress,
                        ),
                      ),
                      hideWallet,
                      network,
                    ),
                    defaultAltCurrency.isoCode,
                  ),
                  currencyAbbreviation: currencyAbbreviation.toUpperCase(),
                  network,
                  walletName: walletName || fallbackName,
                });
              }),
          };
        }),
      );
      setWalletSelectModalVisible(true);
    },
    [keys],
  );

  const onWalletSelect = useCallback(
    async (wallet: Wallet | undefined, addWalletData?: AddWalletData) => {
      if (useAsModal && globalSelectOnDismiss) {
        setWalletSelectModalVisible(false);
        await sleep(500);
        globalSelectOnDismiss(wallet, addWalletData);
        return;
      }
      if (!wallet) {
        return;
      }
      if (['coinbase', 'contact', 'scanner'].includes(context)) {
        setWalletSelectModalVisible(false);
        await sleep(500);
        const {name, address, type, destinationTag, opts} = recipient!;
        if (!address) {
          return;
        }

        try {
          const sendTo = {
            name,
            type: type || context,
            address,
            destinationTag,
          };

          if (!amount) {
            navigation.navigate(WalletScreens.AMOUNT, {
              sendMaxEnabled: ['contact', 'scanner'].includes(context),
              cryptoCurrencyAbbreviation:
                wallet.currencyAbbreviation.toUpperCase(),
              chain: wallet.chain,
              tokenAddress: wallet.tokenAddress,
              onAmountSelected: async (amount, setButtonState, opts) => {
                dispatch(
                  _createProposalAndBuildTxDetails({
                    wallet,
                    amount: Number(amount),
                    sendTo,
                    setButtonState,
                    opts,
                  }),
                );
              },
            });
          } else {
            dispatch(
              _createProposalAndBuildTxDetails({
                wallet,
                amount: Number(amount),
                sendTo,
                opts,
              }),
            );
          }
        } catch (err) {
          const errStr =
            err instanceof Error ? err.message : JSON.stringify(err);
          dispatch(LogActions.error('[GlobalSelect] ' + errStr));
        }
      } else if (context === 'send') {
        setWalletSelectModalVisible(false);
        await sleep(1000);
        navigation.navigate('SendTo', {wallet});
      } else {
        setReceiveWallet(wallet);
        setShowReceiveAddressBottomModal(true);
      }
    },
    [context, navigation, globalSelectOnDismiss, recipient, useAsModal],
  );

  const onLinkedWalletSelect = async (linkedWallet: Wallet) => {
    if (!addTokenToLinkedWallet) {
      logger.warn('No Token data provided. Aborting token wallet creation');
      onWalletSelect(undefined, undefined);
      return;
    }
    logger.debug(
      `Linked wallet selected. Adding ${addTokenToLinkedWallet.currencyAbbreviation} wallet.`,
    );

    const chain = addTokenToLinkedWallet?.chains[0];
    const tokenAddress =
      addTokenToLinkedWallet?.tokenAddresses?.[chain]?.tokenAddress;
    const currencyAbbreviation =
      addTokenToLinkedWallet?.currencyAbbreviation?.toLowerCase();

    // Needed to prevent pointer issues
    const associatedWallet = findWalletById(
      keys[linkedWallet.keyId].wallets,
      linkedWallet.id,
    ) as Wallet;

    const addWalletData: AddWalletData = {
      key: keys[linkedWallet.keyId],
      associatedWallet: associatedWallet,
      currency: {
        currencyAbbreviation,
        isToken: true,
        chain,
        tokenAddress,
      },
      options: {
        network: Network.mainnet,
        useNativeSegwit: undefined,
        singleAddress: false,
        walletName: undefined,
      },
    };

    if (addWalletData) {
      onWalletSelect(undefined, addWalletData);
    }
  };

  const _createProposalAndBuildTxDetails =
    ({
      wallet,
      amount,
      sendTo,
      setButtonState,
      opts,
    }: {
      wallet: Wallet;
      amount: number;
      sendTo: {
        name: string | undefined;
        type: string;
        address: string;
        destinationTag?: number;
      };
      setButtonState?: (state: ButtonState) => void;
      opts: any;
    }): Effect<Promise<void>> =>
    async (dispatch, getState) => {
      try {
        if (setButtonState) {
          setButtonState('loading');
        } else {
          dispatch(startOnGoingProcessModal('CREATING_TXP'));
        }
        const {txDetails, txp} = await dispatch(
          createProposalAndBuildTxDetails({
            wallet,
            recipient: sendTo,
            amount,
            ...opts,
          }),
        );
        if (setButtonState) {
          setButtonState('success');
        } else {
          dispatch(dismissOnGoingProcessModal());
        }
        await sleep(300);
        navigation.navigate('Confirm', {
          wallet,
          recipient: sendTo,
          txp,
          txDetails,
          amount,
          message: opts?.message,
        });
      } catch (err: any) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(LogActions.error('[GlobalSelect] ' + errStr));
        if (setButtonState) {
          setButtonState('failed');
        } else {
          dispatch(dismissOnGoingProcessModal());
        }
        const [errorMessageConfig] = await Promise.all([
          dispatch(handleCreateTxProposalError(err)),
          sleep(400),
        ]);
        dispatch(
          showBottomNotificationModal({
            ...errorMessageConfig,
            enableBackdropDismiss: false,
            actions: [
              {
                text: t('OK'),
                action: () => {
                  if (setButtonState) {
                    setButtonState(undefined);
                  }
                },
              },
            ],
          }),
        );
      }
    };

  const renderItem = useCallback(
    ({item}: {item: GlobalSelectObj}) => {
      return (
        <GlobalSelectRow
          item={item}
          context={context}
          hasSelectedChainFilterOption={!!selectedChainFilterOption}
          emit={(selectObj: GlobalSelectObj) => {
            setSelectedToAddToNewWallet(selectObj);
            // if only one chain available for the token - skip chain selector
            const hasMultipleChainAvailable = selectObj.chains.length > 1;
            if (
              ['buy', 'swap'].includes(context) &&
              IsEVMCoin(selectObj.chains[0]) &&
              selectingNetworkForDeposit &&
              !selectedChainFilterOption &&
              hasMultipleChainAvailable
            ) {
              setSelectedObj(selectObj);
              dispatch(
                AppActions.showChainSelectorModal({
                  context,
                  customChains: selectObj.chains as SupportedChains[],
                  selectingNetworkForDeposit,
                }),
              );
              return;
            }
            // if only one wallet - skip wallet selector
            const wallets = Object.values(
              selectObj.availableWalletsByKey,
            ).flat();
            if (wallets.length === 0) {
              const {chains, currencyAbbreviation} = selectObj;
              const chain = chains[0];
              if (IsERCToken(currencyAbbreviation, chain)) {
                handleTokenWalletSelection(
                  chain,
                  currencyAbbreviation,
                  selectObj,
                  chain, // as selectedNetworkForDeposit
                  currenciesSupportedList,
                  setAddTokenToLinkedWallet,
                  openWalletSelector,
                  openKeySelector,
                );
              } else {
                openKeySelector(selectObj);
              }
            } else if (wallets.length === 1 && !selectingNetworkForDeposit) {
              onWalletSelect(wallets[0]);
            } else {
              openWalletSelector(selectObj);
            }
          }}
          key={item.id}
        />
      );
    },
    [selectedChainFilterOption],
  );

  const closeModal = () => {
    setShowReceiveAddressBottomModal(false);
  };

  const handleBasicWalletCreation = async (
    selectedCurrency: GlobalSelectObj,
    key: Key,
  ) => {
    const chain = selectedCurrency?.chains[0];
    const tokenAddress =
      selectedCurrency?.tokenAddresses?.[chain]?.tokenAddress;
    const currencyAbbreviation =
      selectedCurrency?.currencyAbbreviation?.toLowerCase();
    if (!currencyAbbreviation) {
      logger.warn('No adding coin provided. Aborting wallet creation');
      return;
    }

    // adds wallet and binds to key obj - creates eth wallet if needed
    const addWalletData: AddWalletData = {
      key,
      associatedWallet: undefined,
      currency: {
        currencyAbbreviation: currencyAbbreviation,
        isToken: currencyAbbreviation !== chain,
        chain,
        tokenAddress,
      },
      options: {
        network: Network.mainnet,
        useNativeSegwit: IsSegwitCoin(selectedCurrency.currencyAbbreviation),
        singleAddress: false,
        walletName: undefined,
      },
    };

    if (addWalletData) {
      onWalletSelect(undefined, addWalletData);
    }
  };

  const onKeySelected = async (
    selectedCurrency: GlobalSelectObj,
    selectedKey: Key,
  ) => {
    setKeySelectorModalVisible(false);
    if (selectedKey.backupComplete) {
      logger.debug(
        `Key selected. Adding ${selectedCurrency.currencyAbbreviation} wallet.`,
      );
      handleBasicWalletCreation(selectedCurrency, selectedKey);
    } else {
      logger.debug('Key selected. Needs backup.');
      if (globalSelectOnDismiss) {
        globalSelectOnDismiss();
      }
      await sleep(1000);
      dispatch(
        showBottomNotificationModal(
          keyBackupRequired(selectedKey, navigation, dispatch, context),
        ),
      );
    }
  };

  const openKeySelector = async (selectObj: GlobalSelectObj) => {
    setCardsList(
      createHomeCardList({
        navigation,
        keys: Object.values(keys),
        dispatch,
        linkedCoinbase: false,
        homeCarouselConfig: homeCarouselConfig || [],
        homeCarouselLayoutType: 'listView',
        hideKeyBalance: hideAllBalances,
        context: 'keySelector',
        onPress: onKeySelected,
        currency: selectObj,
      }),
    );
    await sleep(1000);
    setKeySelectorModalVisible(true);
  };

  const onChainSelectorModalHide = () => {
    setChainSelectorModalIsVisible(false);
  };

  useEffect(() => {
    // If a chain filter was selected after a network was selected, clear the network selection.
    if (selectedChainFilterOption && selectedNetworkForDeposit) {
      dispatch(setSelectedNetworkForDeposit(undefined));
    }
  }, [selectedChainFilterOption]);

  useEffect(() => {
    if (chainSelectorIsVisible) {
      setChainSelectorModalIsVisible(true);
    }
  }, [chainSelectorIsVisible]);

  useEffect(() => {
    if (!wallets[0]) {
      // No wallets available
      // TODO: show warning
      if (useAsModal) {
        closeModal();
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      }
    }
  }, [navigation, wallets, useAsModal]);

  useEffect(() => {
    if (
      !chainSelectorModalIsVisible &&
      selectedNetworkForDeposit &&
      selectingNetworkForDeposit &&
      selectedObj.availableWalletsByKey
    ) {
      const filteredSelectedObj = filterByChain(
        selectedObj,
        selectedNetworkForDeposit,
      );
      handleWalletSelection(
        filteredSelectedObj,
        selectedNetworkForDeposit,
        currenciesSupportedList,
        setAddTokenToLinkedWallet,
        openWalletSelector,
        openKeySelector,
        onWalletSelect,
        disabledChain,
        logger,
      );
    }
  }, [
    navigation,
    chainSelectorModalIsVisible,
    selectedNetworkForDeposit,
    selectingNetworkForDeposit,
    selectedObj,
  ]);

  const onEndReached = async () => {
    if (isLoading) {
      return;
    }
    const remainingCustomCurrencies =
      customCurrenciesSupportedList.length - dataToDisplay.length;
    const remainingCurrencies =
      currenciesSupportedList.length - dataToDisplay.length;

    if (remainingCustomCurrencies <= 0 && remainingCurrencies <= 0) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    await sleep(1000);
    const startIndex = currentPage + 20;
    const endIndex = startIndex + 20;
    if (!searchVal && !selectedChainFilterOption) {
      if (
        selectingNetworkForDeposit &&
        customCurrenciesSupportedList.length > 0
      ) {
        const itemsToAdd = customCurrenciesSupportedList.slice(
          startIndex,
          endIndex,
        );

        setDataToDisplay(prevData => [...prevData, ...itemsToAdd]);
      } else {
        const itemsToAdd = currenciesSupportedList.slice(startIndex, endIndex);
        setDataToDisplay(prevData => [...prevData, ...itemsToAdd]);
      }
    }
    setCurrentPage(prevPage => prevPage + 20);
    setIsLoading(false);
  };

  if (!showModalContent && useAsModal) {
    return <></>;
  }
  return (
    <SafeAreaView>
      {useAsModal && (
        <ModalHeader>
          <CloseModalButtonContainer>
            <CloseModalButton
              onPress={() => {
                if (globalSelectOnDismiss) {
                  globalSelectOnDismiss(undefined);
                }
              }}>
              <CloseModal
                {...{
                  width: 20,
                  height: 20,
                  color: theme.dark ? 'white' : 'black',
                }}
              />
            </CloseModalButton>
          </CloseModalButtonContainer>
          {!!modalTitle && (
            <ModalTitleContainer>
              <TextAlign align={'center'}>
                <H4>{modalTitle}</H4>
              </TextAlign>
              {onHelpPress ? (
                <TouchableOpacity
                  onPress={() => {
                    onHelpPress();
                  }}
                  style={{marginLeft: 5}}>
                  <InfoSvg width={20} height={20} />
                </TouchableOpacity>
              ) : null}
            </ModalTitleContainer>
          )}
        </ModalHeader>
      )}
      <GlobalSelectContainer>
        {(currenciesSupportedList?.length > 0 ||
          customCurrenciesSupportedList.length > 0) && (
          <SearchComponentContainer>
            <SearchComponent<GlobalSelectObj>
              searchVal={searchVal}
              setSearchVal={setSearchVal}
              searchResults={searchResults}
              setSearchResults={setSearchResults}
              searchFullList={
                customCurrenciesSupportedList.length > 0
                  ? customCurrenciesSupportedList
                  : currenciesSupportedList
              }
              context={context}
              onModalHide={onChainSelectorModalHide}
            />
          </SearchComponentContainer>
        )}
        {(currenciesSupportedList?.length > 0 ||
          customCurrenciesSupportedList.length > 0) &&
          showInitiallyHiddenComponents && (
            <Animated.FlatList
              entering={FadeIn.duration(Platform.OS === 'android' ? 800 : 300)}
              contentContainerStyle={{paddingBottom: 150}}
              data={
                !searchVal && !selectedChainFilterOption
                  ? dataToDisplay
                  : searchResults
              }
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              getItemLayout={(data, index) => ({
                length: 75,
                offset: 75 * index,
                index,
              })}
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={21}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.3}
              ListFooterComponent={() =>
                !searchVal && !selectedChainFilterOption ? (
                  isLoading ? (
                    <View style={{flex: 1}}>
                      <ActivityIndicator
                        style={{
                          paddingVertical: 20,
                          alignItems: 'center',
                          height: 60,
                        }}
                        size="large"
                        color={SlateDark}
                      />
                    </View>
                  ) : (
                    <View style={{flex: 1, height: 60}} />
                  )
                ) : null
              }
            />
          )}
        {currenciesSupportedList.length === 0 &&
        customCurrenciesSupportedList.length === 0 ? (
          <>
            {context === 'send' ? (
              <NoWalletsMsg>
                {t(
                  'There are no wallets with funds available to use this feature.',
                )}
              </NoWalletsMsg>
            ) : null}

            {context === 'sell' ? (
              <NoWalletsMsg>
                {t(
                  'Your wallet balance is too low to sell crypto. Add funds now and start selling.',
                )}
              </NoWalletsMsg>
            ) : null}

            {context === 'swap' ? (
              <NoWalletsMsg>
                {t(
                  'Your wallet balance is too low to swap crypto. Add funds now and start swapping.',
                )}
              </NoWalletsMsg>
            ) : null}

            {['sell', 'swap'].includes(context) ? (
              <Button
                style={{marginTop: 20}}
                onPress={goToBuyCrypto}
                buttonStyle={'primary'}>
                {'Buy Crypto'}
              </Button>
            ) : null}
          </>
        ) : null}

        {mountSheetModals && (
          <SheetModal
            isVisible={walletSelectModalVisible}
            onBackdropPress={() => {
              dispatch(setSelectedNetworkForDeposit(undefined));
              setAddTokenToLinkedWallet(undefined);
              setWalletSelectModalVisible(false);
            }}>
            <WalletSelectMenuContainer>
              <WalletSelectMenuHeaderContainer>
                <TextAlign align={'center'}>
                  <H4>{t('Select a wallet')}</H4>
                </TextAlign>
              </WalletSelectMenuHeaderContainer>
              <WalletSelectMenuBodyContainer>
                <KeyWalletsRow
                  keyWallets={keyWallets!}
                  hideBalance={hideAllBalances}
                  onPress={
                    addTokenToLinkedWallet?.currencyAbbreviation
                      ? onLinkedWalletSelect
                      : onWalletSelect
                  }
                />
              </WalletSelectMenuBodyContainer>
              {selectedToAddToNewWallet && selectingNetworkForDeposit ? (
                <RowContainer
                  noBorder={true}
                  style={{marginTop: 20, marginLeft: 10}}
                  onPress={() => {
                    setAddTokenToLinkedWallet(undefined);
                    setWalletSelectModalVisible(false);
                    openKeySelector(selectedToAddToNewWallet);
                  }}>
                  <PlusIconContainer>
                    <Icons.Add />
                  </PlusIconContainer>
                  <H5 style={{fontWeight: '400'}}>
                    {IsEVMCoin(selectedToAddToNewWallet.chains[0])
                      ? t('Add as New Account')
                      : t('Add as New Wallet')}
                  </H5>
                </RowContainer>
              ) : null}
              {/*Nested receive modal*/}
              {receiveWallet && (
                <ReceiveAddress
                  isVisible={showReceiveAddressBottomModal}
                  closeModal={closeModal}
                  wallet={receiveWallet}
                />
              )}
            </WalletSelectMenuContainer>
          </SheetModal>
        )}
        {/*Receive modal if one wallet*/}
        {receiveWallet && !walletSelectModalVisible && (
          <ReceiveAddress
            isVisible={showReceiveAddressBottomModal}
            closeModal={closeModal}
            wallet={receiveWallet}
          />
        )}
        {mountSheetModals && (
          <SheetModal
            isVisible={keySelectorModalVisible}
            onBackdropPress={() => setKeySelectorModalVisible(false)}>
            <WalletSelectMenuContainer>
              <WalletSelectMenuHeaderContainer>
                <TextAlign align={'center'}>
                  <H4>
                    {context === 'swap'
                      ? t('Swap to')
                      : t('Select Destination')}
                  </H4>
                </TextAlign>
                <NoWalletsMsg>
                  {context === 'swap'
                    ? t('Choose a key you would like to swap the funds to')
                    : t('Choose a key you would like to deposit the funds to')}
                </NoWalletsMsg>
              </WalletSelectMenuHeaderContainer>
              <WalletSelectMenuBodyContainer>
                {cardsList?.list.map((data: any) => {
                  return <View key={data.id}>{data.component}</View>;
                })}
              </WalletSelectMenuBodyContainer>
            </WalletSelectMenuContainer>
          </SheetModal>
        )}
      </GlobalSelectContainer>
    </SafeAreaView>
  );
};

export default GlobalSelect;
