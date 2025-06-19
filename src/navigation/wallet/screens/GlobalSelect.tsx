import React, {useCallback, useMemo, useState, useEffect} from 'react';
import styled from 'styled-components/native';
import {BottomSheetFlashList} from '@gorhom/bottom-sheet';
import {NavigationProp, RouteProp} from '@react-navigation/native';
import {FlashList} from '@shopify/flash-list';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import {
  BitpaySupportedCoins,
  BitpaySupportedEvmCoins,
  BitpaySupportedSvmCoins,
  BitpaySupportedTokens,
  SUPPORTED_COINS,
  SUPPORTED_TOKENS,
} from '../../../constants/currencies';
import {Wallet, Key} from '../../../store/wallet/wallet.models';
import {
  getChainFromTokenByAddressKey,
  getCurrencyAbbreviation,
  sleep,
} from '../../../utils/helper-methods';
import {Platform, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import GlobalSelectRow from '../../../components/list/GlobalSelectRow';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {
  ActiveOpacity,
  HEIGHT,
  Hr,
  ImageContainer,
  Row,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {groupBy, unionBy, uniqueId} from 'lodash';
import {KeyWalletsRowProps} from '../../../components/list/KeyWalletsRow';
import {
  Action,
  Black,
  LightBlack,
  LinkBlue,
  SlateDark,
  White,
} from '../../../styles/colors';
import {
  H4,
  TextAlign,
  BaseText,
  Paragraph,
} from '../../../components/styled/Text';
import {WalletScreens, WalletGroupParamList} from '../WalletGroup';
import ReceiveAddress from '../components/ReceiveAddress';
import CloseIcon from '../../../components/modal/close/Close';
import KeySvg from '../../../../assets/img/key.svg';
import InfoSvg from '../../../../assets/img/info.svg';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {Effect} from '../../../store';
import {BitpaySupportedTokenOptsByAddress} from '../../../constants/tokens';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import Button, {ButtonState} from '../../../components/button/Button';
import {useTranslation} from 'react-i18next';
import {
  buildAccountList,
  buildAssetsByChain,
  findWalletById,
} from '../../../store/wallet/utils/wallet';
import {
  IsVMChain,
  IsERCToken,
  IsEVMChain,
  IsSegwitCoin,
  IsSVMChain,
} from '../../../store/wallet/utils/currency';
import {LogActions} from '../../../store/log';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Analytics} from '../../../store/analytics/analytics.effects';
import SearchComponent, {
  SearchableItem,
} from '../../../components/chain-search/ChainSearch';
import {
  ignoreGlobalListContextList,
  NetworkName,
} from '../../../components/modal/chain-selector/ChainSelector';
import uniqBy from 'lodash.uniqby';
import {CreateOptions} from '../../../store/wallet/effects';
import {
  SupportedChainOption,
  SupportedChainsOptions,
  SupportedCoinsOptions,
} from '../../../constants/SupportedCurrencyOptions';
import {
  createHomeCardList,
  keyBackupRequired,
} from '../../tabs/home/components/Crypto';
import {Network} from '../../../constants';
import {SwapCryptoCoin} from '../../services/swap-crypto/screens/SwapCryptoRoot';
import Animated, {FadeIn} from 'react-native-reanimated';
import AccountListRow, {
  AccountRowProps,
} from '../../../components/list/AccountListRow';
import {AssetsByChainData} from './AccountDetails';
import AssetsByChainRow from '../../../components/list/AssetsByChainRow';
import Blockie from '../../../components/blockie/Blockie';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {getExternalServiceSymbol} from '../../services/utils/external-services-utils';
import {Keys} from '../../../store/wallet/wallet.reducer';
import {SolanaPayOpts} from './send/confirm/Confirm';

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

const CloseModalButton = styled(TouchableOpacity)`
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

export interface ToWalletSelectorCustomCurrency {
  currencyAbbreviation: string;
  symbol: string;
  chain: string;
  name: string;
  logoUri: any;
  badgeUri: any;
  tokenAddress?: string;
}

export interface WalletSelectMenuHeaderContainerParams {
  currency?: string;
}

export const WalletSelectMenuHeaderContainer = styled.View<WalletSelectMenuHeaderContainerParams>`
  flex-direction: row;
  padding: 16px;
  padding-bottom: ${({currency}) => (currency ? 14 : 0)}px;
  padding-left: 5;
  justify-content: ${({currency}) => (currency ? 'flex-start' : 'center')};
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : '#ECEFFD')};
  border-bottom-width: ${({currency}) => (currency ? 1 : 0)}px;
`;

export const WalletSelectBottomContainer = styled(TouchableOpacity)`
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

const SearchComponentContainer = styled.View`
  margin-bottom: 16px;
`;

const TitleNameContainer = styled.View`
  flex-direction: row;
  align-items: center;
  border-bottom-color: ${({theme: {dark}}) => (dark ? SlateDark : '#ECEFFD')};
  border-bottom-width: 1px;
  margin-top: 20px;
  padding-bottom: 10px;
`;

const TitleName = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-left: 10px;
`;

const CloseButton = styled(TouchableOpacity)`
  margin-right: 10px;
`;

const CloseButtonText = styled(Paragraph)`
  color: ${({theme: {dark}}) => (dark ? LinkBlue : Action)};
`;

const NetworkChainContainer = styled(TouchableOpacity)`
  margin-left: 12px;
`;

const NetworkRowContainer = styled.View`
  flex-direction: row;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px;
`;

const FlashListCointainer = styled(Animated.View)`
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
  height: ${HEIGHT - 100}px;
`;

export type GlobalSelectModalContext =
  | 'send'
  | 'receive'
  | 'coinbase'
  | 'coinbaseDeposit'
  | 'contact'
  | 'scanner'
  | 'sell'
  | 'buy'
  | 'swapFrom'
  | 'swapTo'
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
      showSVMWalletsAndTokens?: boolean;
      solanaPayOpts?: SolanaPayOpts;
    };
  };
  amount?: number;
  selectedAccountAddress?: string;
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
        id: uniqueId('coin_'),
        currencyName: name,
        currencyAbbreviation,
        chainsImg: {},
        chains: [],
        tokenAddresses: {},
        img: logoUri,
        availableWallets: [],
        availableWalletsByKey: {},
      };

      coinEntry.availableWallets = unionBy(
        [...coinEntry.availableWallets, ...filteredWallets],
        c => c.id,
      );

      coinEntry.total = coinEntry.availableWallets.length;
      coinEntry.availableWalletsByKey = groupBy(
        coinEntry.availableWallets,
        'keyId',
      );
      const priority = SupportedCoinsOptions.find(
        ({chain: _chain}) => _chain === chain,
      )?.priority;
      coinEntry.chainsImg[chain] = {
        badgeUri: IsVMChain(chain) && !badgeUri ? logoUri : badgeUri,
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
  context?: GlobalSelectModalContext,
): GlobalSelectObjByKey => {
  const coins: GlobalSelectObjByKey = {};

  categories.forEach(category => {
    const filteredWallets = wallets.filter(wallet => {
      if (
        context &&
        ['sell', 'swapFrom', 'swapTo'].includes(context) &&
        ['eth', 'eth_arb', 'eth_base', 'eth_op'].includes(category)
      ) {
        // Workaround to differentiate eth in evm chains from external services
        const conditions: {[key: string]: {currency: string; chain: string}} = {
          eth: {currency: 'eth', chain: 'eth'},
          eth_arb: {currency: 'eth', chain: 'arb'},
          eth_base: {currency: 'eth', chain: 'base'},
          eth_op: {currency: 'eth', chain: 'op'},
        };

        const condition = conditions[category];
        return (
          condition &&
          wallet.currencyAbbreviation === condition.currency &&
          wallet.chain === condition.chain
        );
      } else {
        return (
          getCurrencyAbbreviation(wallet.currencyAbbreviation, wallet.chain) ===
          category
        );
      }
    });
    if (filteredWallets.length > 0) {
      const {currencyAbbreviation, chain, currencyName, img} =
        filteredWallets[0];

      const coinEntry = coins[currencyAbbreviation] || {
        id: uniqueId('coin_'),
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
      coinEntry.availableWalletsByKey = groupBy(
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
            IsVMChain(chain) && !wallet.badgeImg ? wallet.img : wallet.badgeImg,
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

interface GlobalSelectProps {
  useAsModal?: boolean;
  modalTitle?: string;
  customSupportedCurrencies?: any[];
  customToSelectCurrencies?:
    | ToWalletSelectorCustomCurrency[]
    | SwapCryptoCoin[];
  globalSelectOnDismiss?: (
    newWallet?: any,
    createNewWalletData?: AddWalletData,
  ) => void;
  modalContext?: GlobalSelectModalContext;
  livenetOnly?: boolean;
  onHelpPress?: () => void;
  navigation: NavigationProp<any>;
  route: RouteProp<WalletGroupParamList, any>;
}

type GlobalSelectScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.GLOBAL_SELECT
> &
  GlobalSelectProps;

const FlashListComponent: FlashList<any> | typeof BottomSheetFlashList = (
  props: any,
) => {
  const Container = useMemo(
    () => (props.inModal ? BottomSheetFlashList : FlashList),
    [props.inModal],
  );
  return <Container {...props}>{props.children}</Container>;
};

const GlobalSelect: React.FC<GlobalSelectScreenProps | GlobalSelectProps> = ({
  useAsModal,
  modalTitle,
  customSupportedCurrencies,
  customToSelectCurrencies,
  globalSelectOnDismiss,
  modalContext,
  livenetOnly,
  onHelpPress,
  navigation,
  route,
}) => {
  const {t} = useTranslation();
  let {context, recipient, amount, selectedAccountAddress} = route.params || {};
  if (useAsModal && modalContext) {
    context = modalContext;
  }
  const logger = useLogger();
  const dispatch = useAppDispatch();
  const {
    keys: _keys,
    tokenOptionsByAddress,
    customTokenOptionsByAddress,
  } = useAppSelector(({WALLET}) => WALLET);
  const {rates} = useAppSelector(({RATE}) => RATE);
  const allTokensByAddress = {
    ...BitpaySupportedTokenOptsByAddress,
    ...tokenOptionsByAddress,
    ...customTokenOptionsByAddress,
  };
  const [dataToDisplay, setDataToDisplay] = useState<
    GlobalSelectObj[] | KeyWalletsRowProps[]
  >([]);
  const [showInitiallyHiddenComponents, setShowInitiallyHiddenComponents] =
    useState(false);
  const [mountSheetModals, setMountSheetModals] = useState(false);
  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);
  const [showReceiveAddressBottomModal, setShowReceiveAddressBottomModal] =
    useState(false);
  const [receiveWallet, setReceiveWallet] = useState<Wallet>();
  const [cryptoSelectModalVisible, setCryptoSelectModalVisible] =
    useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState<
    (GlobalSelectObj | KeyWalletsRowProps | AssetsByChainData)[]
  >([]);
  const [selectedEVMAccount, setSelectedEVMAccount] = useState(
    {} as Partial<AccountRowProps> & {assetsByChain?: AssetsByChainData[]},
  );
  const [selectedAssetsFromAccount, setSelectedAssetsFromAccount] = useState(
    [] as AssetsByChainData[],
  );
  const [hideCloseButton, setHideCloseButton] = useState(false);
  const selectedChainFilterOption = useAppSelector(({APP}) =>
    ignoreGlobalListContextList.includes(context)
      ? APP.selectedLocalChainFilterOption
      : APP.selectedChainFilterOption,
  );

  const [cardsList, setCardsList] = useState<any>();
  const [accountsCardsList, setAccountsCardsList] = useState<any>();
  const [networkCardsList, setNetworkCardsList] = useState<any>();
  const [cryptoSelectContext, setCryptoSelectContext] = useState({
    status: 'key-selection',
    title: 'Select Key to Deposit to',
  });
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);

  useEffect(() => {
    const mountComponents = async () => {
      await sleep(400);
      setShowInitiallyHiddenComponents(true);
      await sleep(1000);
      setMountSheetModals(true);
    };
    mountComponents();
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

  const filterCompleteWallets = (keys: Keys) => {
    return Object.fromEntries(
      Object.entries(keys).filter(([_, keys]) =>
        keys.wallets.some(wallet => wallet.isComplete()),
      ),
    );
  };

  // Filter keys with only incomplete wallets
  const keys = filterCompleteWallets(_keys);

  // all wallets
  let wallets = Object.values(keys).flatMap(key => key.wallets);
  // Filter hidden wallets
  wallets = wallets.filter(
    wallet => !wallet.hideWallet && !wallet.hideWalletByAccount,
  );

  // only show wallets with funds
  // only show selected account address wallets if selectedAccountAddress is provided
  if (
    [
      'send',
      'sell',
      'swapFrom',
      'coinbaseDeposit',
      'contact',
      'scanner',
    ].includes(context)
  ) {
    wallets = wallets.filter(
      wallet =>
        wallet.balance.sat > 0 &&
        (!selectedAccountAddress ||
          wallet.receiveAddress === selectedAccountAddress),
    );
  }

  // only show selected account address wallets if selectedAccountAddress is provided
  if (['receive'].includes(context) && selectedAccountAddress) {
    wallets = wallets.filter(wallet =>
      selectedAccountAddress
        ? wallet.receiveAddress === selectedAccountAddress
        : false,
    );
  }

  if (
    recipient &&
    ['coinbaseDeposit', 'contact', 'scanner'].includes(context)
  ) {
    if (recipient.currency && recipient.chain) {
      wallets = wallets.filter(
        wallet =>
          (wallet.currencyAbbreviation === recipient?.currency &&
            wallet.chain === recipient?.chain) ||
          (recipient?.opts?.showEVMWalletsAndTokens &&
            BitpaySupportedEvmCoins[wallet.chain]) ||
          (recipient?.opts?.showSVMWalletsAndTokens &&
            BitpaySupportedSvmCoins[wallet.chain]),
      );
    }
    if (recipient?.network) {
      wallets = wallets.filter(wallet => wallet.network === recipient?.network);
    }
  }

  if (livenetOnly) {
    wallets = wallets.filter(wallet => wallet.network === 'livenet');
  }

  if (context === 'coinbase' && useAsModal && customSupportedCurrencies) {
    const supportedCurrencies = [
      ...new Set(
        customSupportedCurrencies.map(item =>
          item.currencyAbbreviation.toLowerCase(),
        ),
      ),
    ];
    wallets = wallets.filter(wallet =>
      supportedCurrencies.includes(wallet.currencyAbbreviation),
    );
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
    let allCurrencyData = {} as KeyWalletsRowProps[] | GlobalSelectObjByKey;
    if (
      [
        'send',
        'sell',
        'swapFrom',
        'coinbase',
        'coinbaseDeposit',
        'contact',
        'scanner',
      ].includes(context)
    ) {
      const getFilterByCustomWallets = (key: Key): Wallet[] => {
        let _filterByCustomWallets: Wallet[] = [];
        if (['sell', 'swapFrom'].includes(context)) {
          // Workaround to differentiate eth in evm chains from external services
          _filterByCustomWallets = wallets.filter(
            w =>
              allCurrencies.includes(
                getExternalServiceSymbol(w.currencyAbbreviation, w.chain),
              ) && w.keyId === key.id,
          );
        } else {
          _filterByCustomWallets = wallets.filter(w => {
            const isContextValid =
              !['coinbaseDeposit'].includes(context) ||
              allCurrencies.includes(
                getCurrencyAbbreviation(w.currencyAbbreviation, w.chain),
              );

            return isContextValid && w.keyId === key.id;
          });
        }
        return _filterByCustomWallets;
      };

      allCurrencyData = Object.values(keys)
        .map(key => {
          const accountList = buildAccountList(
            key,
            defaultAltCurrency.isoCode,
            rates,
            dispatch,
            {
              filterByCustomWallets: getFilterByCustomWallets(key),
              filterByHideWallet: true,
            },
          );

          const accounts = accountList.map(account => {
            if (IsVMChain(account.chains[0])) {
              const assetsByChain = buildAssetsByChain(
                account,
                defaultAltCurrency.isoCode,
              );
              return {...account, assetsByChain};
            }
            return account;
          }) as (AccountRowProps & {assetsByChain?: AssetsByChainData[]})[];

          if (accounts.length === 0) {
            return null;
          }

          return {
            key: key.id,
            keyName: key.keyName || 'My Key',
            backupComplete: key.backupComplete,
            accounts,
          };
        })
        .filter(item => item !== null) as KeyWalletsRowProps[];
      setDataToDisplay(allCurrencyData);
      const keyWalletsArray = allCurrencyData as KeyWalletsRowProps[];
      if (
        keyWalletsArray.length === 1 &&
        keyWalletsArray[0]?.accounts?.length === 1 &&
        IsVMChain(keyWalletsArray[0].accounts[0].chains[0])
      ) {
        // if only one account and is evm show assets directly
        const selectedAccount = keyWalletsArray[0].accounts[0];
        setSelectedEVMAccount({
          keyId: selectedAccount.keyId,
          chains: selectedAccount.chains,
          accountName: selectedAccount.accountName,
          accountNumber: selectedAccount.accountNumber,
          receiveAddress: selectedAccount.receiveAddress,
        });
        setSelectedAssetsFromAccount(selectedAccount.assetsByChain!);
        setSearchVal('');
        setSearchResults([]);
        setHideCloseButton(true);
      }
      return allCurrencyData;
    } else if (!customToSelectCurrencies) {
      allCurrencyData = buildSelectableWalletList(
        allCurrencies,
        wallets,
        context,
      );
      setDataToDisplay(Object.values(allCurrencyData));
      return Object.values(allCurrencyData);
    } else {
      return [];
    }
  }, []);

  const customCurrenciesSupportedList = useMemo(() => {
    if (customToSelectCurrencies) {
      const allCurrencyData = buildSelectableCurrenciesList(
        customToSelectCurrencies,
        selectedChainFilterOption,
        wallets,
      );
      setDataToDisplay(Object.values(allCurrencyData));
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

  const openCryptoSelector = useCallback(async (selectObj: GlobalSelectObj) => {
    setCryptoSelectModalVisible(true);
    const availableKeys = Object.values(keys);
    if (availableKeys.length > 1) {
      // has more than 1 key created -> choose key
      openKeySelector(selectObj);
    } else {
      // only 1 key created -> choose account if evm / select wallet if utxo
      const selectedKey = availableKeys[0];
      if (IsVMChain(selectObj.chains[0])) {
        openAccountSelector(selectObj, selectedKey);
      } else {
        openAccountUtxoSelector(selectObj, selectedKey);
      }
    }
  }, []);

  const onWalletSelect = useCallback(
    async (wallet: Wallet | undefined, addWalletData?: AddWalletData) => {
      if (useAsModal && globalSelectOnDismiss) {
        globalSelectOnDismiss(wallet, addWalletData);
        return;
      }
      if (!wallet) {
        return;
      }
      if (
        ['coinbase', 'coinbaseDeposit', 'contact', 'scanner'].includes(context)
      ) {
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
              wallet,
              sendTo,
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
        navigation.navigate('SendTo', {wallet});
      } else {
        setReceiveWallet(wallet);
      }
    },
    [context, navigation, globalSelectOnDismiss, recipient, useAsModal],
  );

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
          solanaPayOpts: opts?.solanaPayOpts,
        });
      } catch (err: any) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(LogActions.error('[GlobalSelect] ' + errStr));
        if (setButtonState) {
          setButtonState('failed');
          sleep(1000).then(() => setButtonState?.(null));
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
          }),
        );
      }
    };

  const memoizedRenderAssetsItem = useCallback(
    ({item, index}: {item: AssetsByChainData; index: number}) => {
      return (
        <View style={{marginLeft: -10}}>
          <AssetsByChainRow
            id={item.id}
            accountItem={item}
            hideBalance={hideAllBalances}
            onPress={(walletId, copayerId) => {
              const keyFullWalletObjs = keys[selectedEVMAccount.keyId!].wallets;
              const fullWalletObj = findWalletById(
                keyFullWalletObjs,
                walletId,
                copayerId,
              ) as Wallet;
              onWalletSelect(fullWalletObj);
            }}
            showChainAssetsByDefault={true}
          />
        </View>
      );
    },
    [selectedChainFilterOption, selectedEVMAccount, selectedAssetsFromAccount],
  );

  const renderItem = useCallback(
    ({item}: {item: GlobalSelectObj | KeyWalletsRowProps}) => {
      if (
        [
          'sell',
          'swapFrom',
          'send',
          'coinbase',
          'coinbaseDeposit',
          'contact',
          'scanner',
        ].includes(context)
      ) {
        const keyWallets = item as KeyWalletsRowProps;
        return (
          <View>
            <TitleNameContainer>
              <KeySvg />
              <TitleName>{keyWallets.keyName || 'My Key'}</TitleName>
            </TitleNameContainer>
            {keyWallets.accounts.map(
              (
                account: AccountRowProps & {
                  assetsByChain?: AssetsByChainData[];
                },
                index,
              ) => (
                <View key={index.toString()} style={{marginLeft: -10}}>
                  <AccountListRow
                    key={account.id}
                    id={account.id}
                    accountItem={account}
                    hideBalance={hideAllBalances}
                    onPress={() => {
                      if (IsVMChain(account.chains[0])) {
                        setSearchVal('');
                        setSearchResults([]);
                        setSelectedEVMAccount({
                          keyId: account.keyId,
                          chains: account.chains,
                          accountName: account.accountName,
                          accountNumber: account.accountNumber,
                          receiveAddress: account.receiveAddress,
                        });
                        setSelectedAssetsFromAccount(account.assetsByChain!);
                      } else {
                        const keyFullWalletObjs = keys[account.keyId].wallets;
                        const fullWalletObj = findWalletById(
                          keyFullWalletObjs,
                          account.wallets[0].id,
                          account.wallets[0].copayerId,
                        ) as Wallet;
                        onWalletSelect(fullWalletObj);
                      }
                    }}
                  />
                </View>
              ),
            )}
          </View>
        );
      }

      const selectableObj = item as GlobalSelectObj;
      return (
        <GlobalSelectRow
          item={selectableObj}
          hasSelectedChainFilterOption={!!selectedChainFilterOption}
          emit={(selectObj: GlobalSelectObj) => {
            openCryptoSelector(selectObj);
          }}
          key={selectableObj.id}
        />
      );
    },
    [selectedChainFilterOption],
  );

  const closeModal = () => {
    setShowReceiveAddressBottomModal(false);
    setReceiveWallet(undefined);
  };

  const handleBasicWalletCreation = async (
    selectedCurrency: GlobalSelectObj,
    key: Key,
    selectedNetwork: string,
    associatedWallet?: Wallet,
  ) => {
    const chain = selectedNetwork;
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
      associatedWallet,
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
    if (selectedKey.backupComplete) {
      if (IsVMChain(selectedCurrency.chains[0])) {
        openAccountSelector(selectedCurrency, selectedKey);
      } else {
        openAccountUtxoSelector(selectedCurrency, selectedKey);
      }
    } else {
      logger.debug('Key selected. Needs backup.');
      if (globalSelectOnDismiss) {
        globalSelectOnDismiss();
      }
      await sleep(1000);
      setCryptoSelectModalVisible(false);
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
    setCryptoSelectContext({
      title: 'Select Key to Deposit to',
      status: 'key-selection',
    });
  };

  const onAccountSelected = async (
    selectedAccount: AccountRowProps,
    selectedCurrency: GlobalSelectObj,
    selectedKey: Key,
  ) => {
    openNetworkSelector(selectedAccount, selectedCurrency, selectedKey);
  };

  const onNetworkSelected = async (
    selectedAccount: AccountRowProps,
    selectedKey: Key,
    selectedCurrency: GlobalSelectObj,
    selectedNetwork: string,
  ) => {
    setCryptoSelectModalVisible(false);
    await sleep(1000);

    if (!selectedAccount) {
      handleBasicWalletCreation(selectedCurrency, selectedKey, selectedNetwork);
      return;
    }

    const {keyId, wallets} = selectedAccount;
    const wallet = wallets.find(
      w =>
        w.currencyAbbreviation.toLowerCase() ===
          selectedCurrency.currencyAbbreviation.toLowerCase() &&
        w.chain.toLowerCase() === selectedNetwork.toLowerCase(),
    );
    const handleWalletSelection = (walletId: string, copayerId?: string) => {
      const walletFullObject = findWalletById(
        keys[keyId].wallets,
        walletId,
        copayerId,
      ) as Wallet;
      onWalletSelect(walletFullObject, undefined);
    };

    const handleERC20WalletCreation = () => {
      const associatedWallet = wallets.find(
        w =>
          w.chain === selectedNetwork &&
          !IsERCToken(w.currencyAbbreviation, w.chain),
      )!; // search for associated wallet before creation
      let associatedWalletFullObject;
      if (associatedWallet) {
        associatedWalletFullObject = findWalletById(
          keys[keyId].wallets,
          associatedWallet.id,
          associatedWallet.copayerId,
        ) as Wallet;
      }
      handleBasicWalletCreation(
        selectedCurrency,
        selectedKey,
        selectedNetwork,
        associatedWalletFullObject,
      );
    };
    if (IsERCToken(selectedCurrency.currencyAbbreviation, selectedNetwork)) {
      wallet
        ? handleWalletSelection(wallet.id, wallet.copayerId)
        : handleERC20WalletCreation();
    } else if (wallet) {
      handleWalletSelection(wallet.id, wallet.copayerId);
    }
  };

  const openAccountUtxoSelector = async (
    selectedCurrency: GlobalSelectObj,
    selectedKey: Key,
  ) => {
    const accountList = buildAccountList(
      selectedKey,
      defaultAltCurrency.isoCode,
      rates,
      dispatch,
      {
        filterByHideWallet: true,
        skipFiatCalculations: true,
        filterWalletsByChain: true,
        filterByComplete: true,
        chain: selectedCurrency.chains[0],
      },
    ).filter(account => !IsVMChain(account.chains[0]));
    if (accountList.length > 1) {
      // has more than 1 account created -> choose account
      setAccountsCardsList({
        accounts: accountList,
        currency: selectedCurrency,
        key: selectedKey,
      });
      setCryptoSelectContext({
        title: 'Select Wallet to Deposit to',
        status: 'account-selection',
      });
    } else {
      // ony 1 account created -> choose network
      const selectedAccount = accountList[0];
      openNetworkSelector(selectedAccount, selectedCurrency, selectedKey);
    }
  };

  const openAccountSelector = async (
    selectedCurrency: GlobalSelectObj,
    selectedKey: Key,
  ) => {
    const accountList = buildAccountList(
      selectedKey,
      defaultAltCurrency.isoCode,
      rates,
      dispatch,
      {
        filterByHideWallet: true,
        skipFiatCalculations: true,
        filterByCurrencyAbbreviation: true,
        currencyAbbreviation: selectedCurrency.currencyAbbreviation,
      },
    );

    const evmAccounts = accountList.filter(account =>
      IsEVMChain(account.chains[0]),
    );
    const svmAccounts = accountList.filter(account =>
      IsSVMChain(account.chains[0]),
    );

    const hasMultipleAccounts =
      evmAccounts.length > 1 || svmAccounts.length > 1;
    const hasBothVmTypes = evmAccounts.length > 0 && svmAccounts.length > 0;

    if (hasMultipleAccounts || hasBothVmTypes) {
      setAccountsCardsList({
        accounts: [...evmAccounts, ...svmAccounts],
        currency: selectedCurrency,
        key: selectedKey,
      });
      setCryptoSelectContext({
        title: 'Select Account to Deposit to',
        status: 'account-selection',
      });
      return;
    } else {
      // Only 1 account available
      const selectedAccount = evmAccounts[0] || svmAccounts[0];
      if (selectedAccount) {
        openNetworkSelector(selectedAccount, selectedCurrency, selectedKey);
      }
    }
  };

  const openNetworkSelector = async (
    selectedAccount: AccountRowProps,
    selectedCurrency: GlobalSelectObj,
    selectedKey: Key,
  ) => {
    if (selectedChainFilterOption) {
      const selectedNetwork = SupportedChainsOptions.find(
        network => network.chain === selectedChainFilterOption,
      )!;
      onNetworkSelected(
        selectedAccount,
        selectedKey,
        selectedCurrency,
        selectedNetwork.chain,
      );
      return;
    }
    let networks = SupportedChainsOptions.filter(network =>
      selectedCurrency.chains.includes(network.chain),
    );
    if (context === 'receive') {
      // user is selecting address to receive funds if context === receive
      setCryptoSelectModalVisible(false);
      await sleep(1000);
      const {keyId, wallets} = selectedAccount;
      const walletFullObject = findWalletById(
        keys[keyId].wallets,
        wallets[0].id,
        wallets[0].copayerId,
      ) as Wallet;
      onWalletSelect(walletFullObject, undefined);
      return;
    }
    if (networks.length === 1) {
      onNetworkSelected(
        selectedAccount,
        selectedKey,
        selectedCurrency,
        networks[0].chain,
      );
      return;
    }
    setNetworkCardsList({
      networks,
      account: selectedAccount,
      currency: selectedCurrency,
      key: selectedKey,
    });
    setCryptoSelectContext({
      title: 'Select Network',
      status: 'network-selection',
    });
  };

  useEffect(() => {
    if (!wallets[0]) {
      // No wallets available
      // TODO: show warning
      if (useAsModal) {
        closeModal();
      }
    }
  }, [navigation, wallets, useAsModal]);

  useEffect(() => {
    if (selectedEVMAccount) {
      const data =
        !searchVal && !selectedChainFilterOption
          ? dataToDisplay
          : searchResults;
      const selectedAccount = data
        // @ts-ignore
        .flatMap(({accounts}) => accounts || [])
        .find(
          account =>
            // @ts-ignore
            account.receiveAddress === selectedEVMAccount.receiveAddress,
        ) as AccountRowProps & {assetsByChain?: AssetsByChainData[]};

      if (selectedAccount) {
        setSearchVal('');
        setSearchResults([]);
        setSelectedEVMAccount({
          keyId: selectedAccount.keyId,
          chains: selectedAccount.chains,
          accountName: selectedAccount.accountName,
          accountNumber: selectedAccount.accountNumber,
          receiveAddress: selectedAccount.receiveAddress,
        });
        setSelectedAssetsFromAccount(selectedAccount.assetsByChain!);
      }
    }
  }, [selectedChainFilterOption]);

  useEffect(() => {
    if (receiveWallet) {
      const showReceiveModal = async () => {
        await sleep(1000);
        setShowReceiveAddressBottomModal(true);
      };
      showReceiveModal();
    }
  }, [receiveWallet]);

  return (
    <SafeAreaView>
      {useAsModal && (
        <ModalHeader style={{marginTop: Platform.OS === 'android' ? 20 : 0}}>
          <CloseModalButtonContainer>
            <CloseModalButton
              onPress={() => {
                if (globalSelectOnDismiss) {
                  globalSelectOnDismiss(undefined);
                }
              }}>
              <CloseIcon />
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
        <SearchComponentContainer>
          <SearchComponent<
            GlobalSelectObj | KeyWalletsRowProps | AssetsByChainData
          >
            searchVal={searchVal}
            setSearchVal={setSearchVal}
            searchResults={searchResults}
            setSearchResults={setSearchResults}
            searchFullList={
              selectedAssetsFromAccount.length > 0
                ? selectedAssetsFromAccount
                : customCurrenciesSupportedList.length > 0
                ? customCurrenciesSupportedList
                : currenciesSupportedList
            }
            context={context}
          />
        </SearchComponentContainer>
        {(currenciesSupportedList?.length > 0 ||
          customCurrenciesSupportedList.length > 0) &&
          selectedAssetsFromAccount.length === 0 && (
            <>
              {showInitiallyHiddenComponents && (
                <FlashListCointainer entering={FadeIn.duration(800)}>
                  <FlashListComponent
                    inModal={useAsModal}
                    contentContainerStyle={{paddingBottom: 150}}
                    data={
                      !searchVal && !selectedChainFilterOption
                        ? dataToDisplay
                        : (searchResults as (
                            | GlobalSelectObj
                            | KeyWalletsRowProps
                          )[])
                    }
                    keyExtractor={(_, index: number) => index.toString()}
                    renderItem={renderItem}
                    estimatedItemSize={90}
                    onEndReachedThreshold={0.3}
                  />
                </FlashListCointainer>
              )}
            </>
          )}

        {selectedAssetsFromAccount.length > 0 && (
          <>
            <View>
              <TitleNameContainer>
                <Row style={{alignItems: 'center'}}>
                  <Blockie size={19} seed={selectedEVMAccount.receiveAddress} />
                  <View style={{maxWidth: 250}}>
                    <TitleName ellipsizeMode="tail" numberOfLines={1}>
                      {selectedEVMAccount.accountName}
                    </TitleName>
                  </View>
                </Row>
                {!hideCloseButton ? (
                  <CloseButton
                    onPress={() => {
                      setSearchVal('');
                      setSearchResults([]);
                      setSelectedAssetsFromAccount([]);
                      setSelectedEVMAccount({} as Partial<AccountRowProps>);
                    }}>
                    <CloseButtonText>{t('CLOSE')}</CloseButtonText>
                  </CloseButton>
                ) : null}
              </TitleNameContainer>
              <FlashListCointainer
                entering={FadeIn.duration(500)}
                style={{height: HEIGHT - 235}}>
                <FlashListComponent
                  inModal={useAsModal}
                  estimatedItemSize={90}
                  contentContainerStyle={{paddingBottom: 300}}
                  data={
                    !searchVal && !selectedChainFilterOption
                      ? selectedAssetsFromAccount
                      : (searchResults as AssetsByChainData[])
                  }
                  keyExtractor={(_, index: number) => index.toString()}
                  renderItem={memoizedRenderAssetsItem}
                />
              </FlashListCointainer>
            </View>
          </>
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

            {context === 'swapFrom' ? (
              <NoWalletsMsg>
                {t(
                  'Your wallet balance is too low to swap crypto. Add funds now and start swapping.',
                )}
              </NoWalletsMsg>
            ) : null}

            {['sell', 'swapFrom'].includes(context) ? (
              <Button
                style={{marginTop: 20}}
                onPress={goToBuyCrypto}
                buttonStyle={'primary'}>
                {'Buy Crypto'}
              </Button>
            ) : null}
          </>
        ) : null}

        {cryptoSelectContext && mountSheetModals ? (
          <SheetModal
            isVisible={cryptoSelectModalVisible}
            onBackdropPress={() => {
              setCryptoSelectModalVisible(false);
            }}>
            <WalletSelectMenuContainer
              style={{minHeight: 300, paddingBottom: 80}}>
              <WalletSelectMenuHeaderContainer style={{marginBottom: 10}}>
                <TextAlign align={'center'}>
                  <H4>{cryptoSelectContext?.title}</H4>
                </TextAlign>
              </WalletSelectMenuHeaderContainer>

              {cryptoSelectContext.status === 'key-selection' && (
                <Animated.View entering={FadeIn.duration(300)}>
                  <WalletSelectMenuBodyContainer>
                    {cardsList?.list.map((data: any) => (
                      <View key={data.id}>{data.component}</View>
                    ))}
                  </WalletSelectMenuBodyContainer>
                </Animated.View>
              )}

              {cryptoSelectContext.status === 'account-selection' && (
                <Animated.View entering={FadeIn.duration(300)}>
                  <WalletSelectMenuBodyContainer>
                    {accountsCardsList?.accounts?.map(
                      (item: AccountRowProps) => (
                        <AccountListRow
                          key={item.id}
                          id={item.id}
                          accountItem={item}
                          hideBalance={hideAllBalances}
                          onPress={() =>
                            onAccountSelected(
                              item,
                              accountsCardsList.currency,
                              accountsCardsList.key,
                            )
                          }
                        />
                      ),
                    )}
                  </WalletSelectMenuBodyContainer>
                </Animated.View>
              )}

              {cryptoSelectContext.status === 'network-selection' && (
                <Animated.View entering={FadeIn.duration(300)}>
                  <WalletSelectMenuBodyContainer>
                    {networkCardsList?.networks?.map(
                      (item: SupportedChainOption, index: number) => (
                        <View key={index.toString()}>
                          <NetworkChainContainer
                            activeOpacity={ActiveOpacity}
                            onPress={() =>
                              onNetworkSelected(
                                networkCardsList.account,
                                networkCardsList.key,
                                networkCardsList.currency,
                                item.chain,
                              )
                            }>
                            <NetworkRowContainer>
                              <ImageContainer>
                                <CurrencyImage img={item.img} size={32} />
                              </ImageContainer>
                              <NetworkName>{item.chainName}</NetworkName>
                            </NetworkRowContainer>
                          </NetworkChainContainer>
                          {networkCardsList?.networks?.length - 1 > index ? (
                            <Hr />
                          ) : null}
                        </View>
                      ),
                    )}
                  </WalletSelectMenuBodyContainer>
                </Animated.View>
              )}
            </WalletSelectMenuContainer>
          </SheetModal>
        ) : null}

        {receiveWallet && (
          <ReceiveAddress
            isVisible={showReceiveAddressBottomModal}
            closeModal={closeModal}
            wallet={receiveWallet}
            context={'globalselect'}
          />
        )}
      </GlobalSelectContainer>
    </SafeAreaView>
  );
};

export default GlobalSelect;
