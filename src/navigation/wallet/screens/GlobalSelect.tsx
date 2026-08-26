import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
} from 'react';
import {useTheme} from '../../../contexts';
import {useBottomSheetScrollableCreator} from '@gorhom/bottom-sheet';
import {NavigationProp, RouteProp} from '@react-navigation/native';
import {FlashList, type FlashListProps} from '@shopify/flash-list';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import {
  BitpaySupportedCoins,
  BitpaySupportedEvmCoins,
  BitpaySupportedSvmCoins,
  BitpaySupportedTokens,
  SUPPORTED_COINS,
  SUPPORTED_EVM_COINS,
  SUPPORTED_TOKENS,
} from '../../../constants/currencies';
import {Wallet, Key} from '../../../store/wallet/wallet.models';
import {
  getChainFromTokenByAddressKey,
  getCurrencyAbbreviation,
  sleep,
} from '../../../utils/helper-methods';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
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
import {groupBy, unionBy, isEmpty} from 'lodash';
import {KeyWalletsRowProps} from '../../../components/list/KeyWalletsRow';
import {
  Action,
  Black,
  LightBlack,
  LightBlue,
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
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {Effect} from '../../../store';
import {BitpaySupportedTokenOptsByAddress} from '../../../constants/tokens';
import Button, {ButtonState} from '../../../components/button/Button';
import {useTranslation} from 'react-i18next';
import {
  buildAccountList,
  buildAssetsByChain,
  findWalletById,
} from '../../../store/wallet/utils/wallet';
import {
  buildAccountListSignature,
  getRatesRevision,
  resolveAccountListSnapshot,
} from '../../../store/wallet/utils/accountListCache';
import {
  canCacheGlobalSelectList as canCacheGlobalSelectListFor,
  getGlobalSelectInitialAccountSelection,
  getGlobalSelectListCacheKey,
  getGlobalSelectSupportedCurrenciesSignature,
} from './globalSelectListCache';
import {
  IsVMChain,
  IsERCToken,
  IsEVMChain,
  IsSegwitCoin,
  IsSVMChain,
} from '../../../store/wallet/utils/currency';
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
import Animated from 'react-native-reanimated';
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
import cloneDeep from 'lodash.clonedeep';
import Icons from '../components/WalletIcons';
import {AppActions} from '../../../store/app';
import {useOngoingProcess, useTokenContext} from '../../../contexts';
import {logManager} from '../../../managers/LogManager';
import type {Rates} from '../../../store/rate/rate.models';
import {scheduleAfterTransitionAndIdle} from '../../../utils/scheduleAfterInteractionsAndFrames';
import {performanceLog} from '../../../utils/performanceDebug';

const SCREEN_GUTTER = Number(ScreenGutter.replace('px', ''));
const EMPTY_GLOBAL_SELECT_RATES: Rates = {};
const EMPTY_GLOBAL_SELECT_TOKEN_OPTIONS_BY_ADDRESS = {};

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
  },
  modalHeader: {
    height: 50,
    marginRight: 10,
    marginLeft: 10,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  closeModalButtonContainer: {
    position: 'absolute',
    left: 0,
  },
  closeModalButton: {
    padding: 5,
    height: 41,
    width: 41,
    borderRadius: 50,
    backgroundColor: '#9ba3ae33',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  globalSelectContainer: {
    padding: SCREEN_GUTTER,
  },
  walletSelectMenuContainer: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '75%',
    paddingBottom: 20,
  },
  walletSelectMenuHeaderContainerBase: {
    flexDirection: 'row',
    paddingTop: 16,
    paddingRight: 16,
    paddingLeft: 5,
  },
  walletSelectBottomContainer: {
    padding: 16,
  },
  walletSelectMenuHeaderIconContainer: {
    paddingRight: 0,
  },
  walletSelectMenuBodyContainer: {
    paddingTop: 0,
    paddingHorizontal: SCREEN_GUTTER,
    paddingBottom: 2,
  },
  noWalletsMsg: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 20,
  },
  searchComponentContainer: {
    marginBottom: 16,
  },
  titleNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    marginTop: 20,
    paddingBottom: 10,
  },
  titleName: {
    marginLeft: 10,
  },
  closeButton: {
    marginRight: 10,
  },
  networkChainContainer: {
    marginLeft: 12,
  },
  networkRowContainer: {
    flexDirection: 'row',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 5,
  },
  flashListContainer: {
    height: HEIGHT - 100,
  },
  addAccountBtnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 9,
  },
  addAccountBtnText: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
    letterSpacing: 0,
    marginLeft: 10,
  },
});

const CloseModalButton: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.closeModalButton, style]} {...rest} />
);

export interface CustomGlobalSelectCurrency {
  currencyAbbreviation: string;
  symbol?: string;
  chain: string;
  name: string;
  logoUri?: any;
  badgeUri?: any;
  tokenAddress?: string;
}

export interface ToWalletSelectorCustomCurrency
  extends CustomGlobalSelectCurrency {
  symbol: string;
}

export interface WalletSelectMenuHeaderContainerParams {
  currency?: string;
}

export const WalletSelectMenuContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.walletSelectMenuContainer,
        {backgroundColor: theme.dark ? LightBlack : White},
        style,
      ]}
      {...rest}
    />
  );
});
WalletSelectMenuContainer.displayName = 'WalletSelectMenuContainer';

export const WalletSelectMenuHeaderContainer = React.forwardRef<
  View,
  WalletSelectMenuHeaderContainerParams & React.ComponentProps<typeof View>
>(({currency, style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.walletSelectMenuHeaderContainerBase,
        {
          paddingBottom: currency ? 14 : 0,
          justifyContent: currency ? 'flex-start' : 'center',
          borderBottomColor: theme.dark ? LightBlack : LightBlue,
          borderBottomWidth: currency ? 1 : 0,
        },
        style,
      ]}
      {...rest}
    />
  );
});
WalletSelectMenuHeaderContainer.displayName = 'WalletSelectMenuHeaderContainer';

export const WalletSelectBottomContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity
    style={[styles.walletSelectBottomContainer, style]}
    {...rest}
  />
);

export const WalletSelectMenuHeaderIconContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View
    ref={ref}
    style={[styles.walletSelectMenuHeaderIconContainer, style]}
    {...rest}
  />
));
WalletSelectMenuHeaderIconContainer.displayName =
  'WalletSelectMenuHeaderIconContainer';

export const WalletSelectMenuBodyContainer = React.forwardRef<
  ScrollView,
  React.ComponentProps<typeof ScrollView>
>(({style, ...rest}, ref) => (
  <ScrollView
    ref={ref}
    style={[styles.walletSelectMenuBodyContainer, style]}
    {...rest}
  />
));
WalletSelectMenuBodyContainer.displayName = 'WalletSelectMenuBodyContainer';

const NoWalletsMsg: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => <BaseText style={[styles.noWalletsMsg, style]} {...rest} />;

const TitleNameContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.titleNameContainer,
        {borderBottomColor: theme.dark ? SlateDark : LightBlue},
        style,
      ]}
      {...rest}
    />
  );
};

const TitleName: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.titleName, {color: theme.dark ? White : SlateDark}, style]}
      {...rest}
    />
  );
};

const CloseButton: React.FC<React.ComponentProps<typeof TouchableOpacity>> = ({
  style,
  ...rest
}) => <TouchableOpacity style={[styles.closeButton, style]} {...rest} />;

const CloseButtonText: React.FC<React.ComponentProps<typeof Paragraph>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[{color: theme.dark ? LinkBlue : Action}, style]}
      {...rest}
    />
  );
};

const NetworkChainContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.networkChainContainer, style]} {...rest} />
);

const NetworkRowContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.networkRowContainer, style]} {...rest} />;

const FlashListCointainer: React.FC<
  React.ComponentProps<typeof Animated.View>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <Animated.View
      style={[
        styles.flashListContainer,
        {backgroundColor: theme.dark ? Black : White},
        style,
      ]}
      {...rest}
    />
  );
};

const AddAccountBtnContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.addAccountBtnContainer, style]} {...rest} />
);

const AddAccountBtnText: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => <BaseText style={[styles.addAccountBtnText, style]} {...rest} />;

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

export type AssetContext = {
  currencyAbbreviation: string;
  chain: string;
  network?: string;
  tokenAddress?: string;
};

export type GlobalSelectParamList = {
  context: GlobalSelectModalContext;
  _preloadContent?: boolean;
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
  assetContext?: AssetContext;
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

type GlobalSelectAccount = AccountRowProps & {
  assetsByChain?: AssetsByChainData[];
};

type GlobalSelectFlatRow =
  | {__row: 'keyHeader'; id: string; keyName: string}
  | {
      __row: 'account';
      id: string;
      account: GlobalSelectAccount;
      keyId: string;
    }
  | {__row: 'currency'; id: string; item: GlobalSelectObj};

export const flattenGlobalSelectData = (
  source: (GlobalSelectObj | KeyWalletsRowProps)[],
): GlobalSelectFlatRow[] => {
  const rows: GlobalSelectFlatRow[] = [];
  source.forEach(entry => {
    if (entry && Array.isArray((entry as KeyWalletsRowProps).accounts)) {
      const keyEntry = entry as KeyWalletsRowProps;
      rows.push({
        __row: 'keyHeader',
        id: `header-${keyEntry.key}`,
        keyName: keyEntry.keyName || 'My Key',
      });
      (keyEntry.accounts as GlobalSelectAccount[]).forEach(account => {
        rows.push({
          __row: 'account',
          id: `account-${keyEntry.key}-${account.id}`,
          account,
          keyId: keyEntry.key,
        });
      });
    } else if (
      entry &&
      typeof (entry as GlobalSelectObj).currencyAbbreviation === 'string'
    ) {
      const selectableObj = entry as GlobalSelectObj;
      rows.push({
        __row: 'currency',
        id: `currency-${selectableObj.id}`,
        item: selectableObj,
      });
    }
  });
  return rows;
};

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
  customToSelectCurrencies: CustomGlobalSelectCurrency[],
  selectedChainFilterOption: string | undefined,
  wallets: Wallet[],
): GlobalSelectObjByKey => {
  const coins: GlobalSelectObjByKey = {};
  (customToSelectCurrencies || []).forEach(currency => {
    const {currencyAbbreviation, chain, name, tokenAddress, logoUri, badgeUri} =
      currency;

    if (!selectedChainFilterOption || chain === selectedChainFilterOption) {
      const filteredWallets = wallets.filter(
        wallet =>
          wallet.currencyAbbreviation === currencyAbbreviation &&
          wallet.chain === chain,
      );

      const coinEntry = coins[currencyAbbreviation] || {
        id: `coin-${currencyAbbreviation}`,
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

export type PreloadedCustomGlobalSelectList = {
  signature: string;
  data: GlobalSelectObj[];
};

const getCustomGlobalSelectListSignature = ({
  customToSelectCurrencies,
  selectedChainFilterOption,
  wallets,
}: {
  customToSelectCurrencies: CustomGlobalSelectCurrency[];
  selectedChainFilterOption?: string;
  wallets: Wallet[];
}): string => {
  const currencySignature = customToSelectCurrencies
    .map(
      ({currencyAbbreviation, chain, name, tokenAddress, logoUri, badgeUri}) =>
        [
          currencyAbbreviation,
          chain,
          name,
          tokenAddress,
          typeof logoUri === 'string' ? logoUri : '',
          typeof badgeUri === 'string' ? badgeUri : '',
        ].join(':'),
    )
    .join('|');
  const walletSignature = wallets
    .map(wallet =>
      [
        wallet.id,
        wallet.keyId,
        wallet.currencyAbbreviation,
        wallet.chain,
        wallet.network,
        wallet.receiveAddress,
        wallet.tokenAddress,
        wallet.balance?.sat,
      ].join(':'),
    )
    .join('|');

  return `${
    selectedChainFilterOption || ''
  };${currencySignature};${walletSignature}`;
};

export const resolveCustomGlobalSelectList = ({
  customToSelectCurrencies,
  selectedChainFilterOption,
  wallets,
  previous,
}: {
  customToSelectCurrencies: CustomGlobalSelectCurrency[];
  selectedChainFilterOption?: string;
  wallets: Wallet[];
  previous?: PreloadedCustomGlobalSelectList;
}): PreloadedCustomGlobalSelectList => {
  const signature = getCustomGlobalSelectListSignature({
    customToSelectCurrencies,
    selectedChainFilterOption,
    wallets,
  });

  if (previous?.signature === signature) {
    return previous;
  }

  return {
    signature,
    data: Object.values(
      buildSelectableCurrenciesList(
        customToSelectCurrencies,
        selectedChainFilterOption,
        wallets,
      ),
    ),
  };
};

const buildSelectableWalletList = (
  categories: string[],
  wallets: Wallet[],
  context?: GlobalSelectModalContext,
): GlobalSelectObjByKey => {
  const coins: GlobalSelectObjByKey = {};

  const candidateCategories = new Set<string>();
  wallets.forEach(wallet => {
    candidateCategories.add(
      getCurrencyAbbreviation(wallet.currencyAbbreviation, wallet.chain),
    );
    if (wallet.currencyAbbreviation === 'eth') {
      candidateCategories.add('eth');
      candidateCategories.add('eth_arb');
      candidateCategories.add('eth_base');
      candidateCategories.add('eth_op');
    }
    if (wallet.currencyAbbreviation === 'pol') {
      candidateCategories.add('matic');
      candidateCategories.add('matic_e');
    }
  });
  const relevantCategories = categories.filter(category =>
    candidateCategories.has(category),
  );

  relevantCategories.forEach(category => {
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
        // POL/MATIC special cases
        if (
          category === 'matic' &&
          wallet.chain === 'matic' &&
          wallet.currencyAbbreviation === 'pol'
        ) {
          return true;
        }
        if (
          category === 'matic_e' &&
          wallet.chain === 'eth' &&
          wallet.currencyAbbreviation === 'pol'
        ) {
          return true;
        }
        return (
          getCurrencyAbbreviation(wallet.currencyAbbreviation, wallet.chain) ===
          category
        );
      }
    });
    if (filteredWallets.length > 0) {
      const {currencyAbbreviation, chain, currencyName, img} =
        filteredWallets[0];

      const key =
        currencyAbbreviation === 'pol' && chain === 'eth'
          ? 'matic'
          : currencyAbbreviation;
      const coinEntry = coins[key] || {
        id: `coin-${key}`,
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
      coins[key] = coinEntry;
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
  customToSelectCurrencies?: CustomGlobalSelectCurrency[];
  globalSelectOnDismiss?: (
    newWallet?: any,
    createNewWalletData?: AddWalletData,
  ) => void;
  modalContext?: GlobalSelectModalContext;
  livenetOnly?: boolean;
  onHelpPress?: () => void;
  preloadedCustomToSelectCurrenciesList?: PreloadedCustomGlobalSelectList;
  navigation: NavigationProp<any>;
  route: RouteProp<WalletGroupParamList, any>;
}

type GlobalSelectScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.GLOBAL_SELECT
> &
  GlobalSelectProps;

const accountListContexts = [
  'send',
  'sell',
  'swapFrom',
  'coinbase',
  'coinbaseDeposit',
  'contact',
  'scanner',
];

const accountListContextsRequiringCurrencyCatalog = [
  'sell',
  'swapFrom',
  'coinbaseDeposit',
];

export const shouldShowGlobalSelectEmptyState = ({
  isContentReady,
  currenciesSupportedCount,
  customCurrenciesSupportedCount,
}: {
  isContentReady: boolean;
  currenciesSupportedCount: number;
  customCurrenciesSupportedCount: number;
}): boolean =>
  isContentReady &&
  currenciesSupportedCount === 0 &&
  customCurrenciesSupportedCount === 0;

const filterCompleteWallets = (keys: Keys): Keys =>
  Object.fromEntries(
    Object.entries(keys).filter(([_, key]) =>
      key.wallets.some(
        wallet => wallet.isComplete() && !wallet.pendingTssSession,
      ),
    ),
  );

export const preloadCustomGlobalSelectList = ({
  keys,
  customToSelectCurrencies,
  selectedChainFilterOption,
  livenetOnly = true,
  previous,
}: {
  keys: Keys;
  customToSelectCurrencies: CustomGlobalSelectCurrency[];
  selectedChainFilterOption?: string;
  livenetOnly?: boolean;
  previous?: PreloadedCustomGlobalSelectList;
}): PreloadedCustomGlobalSelectList => {
  const wallets = Object.values(filterCompleteWallets(keys))
    .flatMap(key => key.wallets)
    .filter(
      wallet =>
        !wallet.hideWallet &&
        !wallet.hideWalletByAccount &&
        (!livenetOnly || wallet.network === 'livenet'),
    );

  return resolveCustomGlobalSelectList({
    customToSelectCurrencies,
    selectedChainFilterOption,
    wallets,
    previous,
  });
};

type FlashListComponentProps<T> = FlashListProps<T> & {
  inModal?: boolean;
};

const BottomSheetIntegratedFlashList = <T,>(
  props: FlashListComponentProps<T>,
) => {
  const BottomSheetScrollable = useBottomSheetScrollableCreator();

  return <FlashList {...props} renderScrollComponent={BottomSheetScrollable} />;
};

export const FlashListComponent = <T,>({
  inModal,
  ...props
}: FlashListComponentProps<T>) =>
  inModal ? (
    <BottomSheetIntegratedFlashList {...props} />
  ) : (
    <FlashList {...props} />
  );

const GlobalSelect: React.FC<GlobalSelectScreenProps | GlobalSelectProps> = ({
  useAsModal,
  modalTitle,
  customSupportedCurrencies,
  customToSelectCurrencies,
  globalSelectOnDismiss,
  modalContext,
  livenetOnly,
  onHelpPress,
  preloadedCustomToSelectCurrenciesList,
  navigation,
  route,
}) => {
  const {t} = useTranslation();
  let {context, recipient, amount, selectedAccountAddress, assetContext} =
    route.params || {};
  const [isFocused, setIsFocused] = useState(
    () => useAsModal || navigation.isFocused(),
  );
  if (useAsModal && modalContext) {
    context = modalContext;
  }
  const requiresCurrencyCatalog =
    !customToSelectCurrencies &&
    (!accountListContexts.includes(context) ||
      accountListContextsRequiringCurrencyCatalog.includes(context));
  const requiresAccountRates = accountListContexts.includes(context);
  const logger = useLogger();
  const dispatch = useAppDispatch();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const {tokenOptionsByAddress} = useTokenContext();
  const _keys = useAppSelector(({WALLET}) => WALLET.keys);
  const customTokenOptionsByAddress = useAppSelector(({WALLET}) =>
    requiresCurrencyCatalog
      ? WALLET.customTokenOptionsByAddress
      : EMPTY_GLOBAL_SELECT_TOKEN_OPTIONS_BY_ADDRESS,
  );
  const rates = useAppSelector(({RATE}) =>
    requiresAccountRates ? RATE.rates : EMPTY_GLOBAL_SELECT_RATES,
  );
  const allTokensByAddress = useMemo(
    () =>
      requiresCurrencyCatalog && !customSupportedCurrencies
        ? {
            ...BitpaySupportedTokenOptsByAddress,
            ...tokenOptionsByAddress,
            ...customTokenOptionsByAddress,
          }
        : undefined,
    [
      customSupportedCurrencies,
      customTokenOptionsByAddress,
      requiresCurrencyCatalog,
      tokenOptionsByAddress,
    ],
  );
  const customSupportedCurrenciesSignature = useMemo(
    () =>
      getGlobalSelectSupportedCurrenciesSignature(customSupportedCurrencies),
    [customSupportedCurrencies],
  );
  const globalSelectListCacheKey = getGlobalSelectListCacheKey({
    context,
    selectedAccountAddress,
    variant: customSupportedCurrencies
      ? useAsModal
        ? 'modal'
        : 'screen'
      : undefined,
  });
  const canCacheGlobalSelectList = canCacheGlobalSelectListFor({
    context,
    useAsModal,
    customSupportedCurrencies,
    customToSelectCurrencies,
  });
  const customGlobalSelectListCacheRef = useRef(
    preloadedCustomToSelectCurrenciesList,
  );
  const [mountSheetModals, setMountSheetModals] = useState(false);
  const defaultAltCurrencyIsoCode = useAppSelector(
    ({APP}) => APP.defaultAltCurrency.isoCode,
  );
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const [showReceiveAddressBottomModal, setShowReceiveAddressBottomModal] =
    useState(false);
  const [receiveWallet, setReceiveWallet] = useState<Wallet>();
  const [cryptoSelectModalVisible, setCryptoSelectModalVisible] =
    useState(false);
  const pendingCryptoSelectorDismissActionRef = useRef<
    (() => void | Promise<void>) | undefined
  >(undefined);
  const autoAdvanceReceiveRef = useRef(false);
  const initialAccountSelectionHandledRef = useRef(false);
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
  const showCryptoSelectModal = useCallback(() => {
    setMountSheetModals(true);
    setCryptoSelectModalVisible(true);
  }, []);
  const handleCryptoSelectModalHide = useCallback(() => {
    const pendingAction = pendingCryptoSelectorDismissActionRef.current;
    pendingCryptoSelectorDismissActionRef.current = undefined;
    pendingAction?.();
  }, []);

  useEffect(() => {
    if (useAsModal) {
      setIsFocused(true);
      return;
    }

    setIsFocused(navigation.isFocused());
    const unsubscribeFocus = navigation.addListener('focus', () =>
      setIsFocused(true),
    );
    const unsubscribeBlur = navigation.addListener('blur', () =>
      setIsFocused(false),
    );

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, useAsModal]);

  const NON_BITPAY_SUPPORTED_TOKENS = useMemo(() => {
    if (!allTokensByAddress) {
      return [];
    }

    return Array.from(
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
  }, [allTokensByAddress]);
  const nonBitpaySupportedTokensSignature = useMemo(
    () =>
      getGlobalSelectSupportedCurrenciesSignature(NON_BITPAY_SUPPORTED_TOKENS),
    [NON_BITPAY_SUPPORTED_TOKENS],
  );

  // Filter keys with only incomplete wallets
  const keys = useMemo(() => filterCompleteWallets(_keys), [_keys]);

  const wallets = useMemo(() => {
    let filteredWallets = Object.values(keys)
      .flatMap(key => key.wallets)
      .filter(wallet => !wallet.hideWallet && !wallet.hideWalletByAccount);

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
      filteredWallets = filteredWallets.filter(
        wallet =>
          wallet.balance.sat > 0 &&
          (!selectedAccountAddress ||
            wallet.receiveAddress === selectedAccountAddress),
      );
    }

    if (context === 'receive' && selectedAccountAddress) {
      filteredWallets = filteredWallets.filter(
        wallet => wallet.receiveAddress === selectedAccountAddress,
      );
    }

    if (
      recipient &&
      ['coinbaseDeposit', 'contact', 'scanner'].includes(context)
    ) {
      if (recipient.currency && recipient.chain) {
        filteredWallets = filteredWallets.filter(
          wallet =>
            (wallet.currencyAbbreviation === recipient.currency &&
              wallet.chain === recipient.chain) ||
            (recipient.opts?.showEVMWalletsAndTokens &&
              BitpaySupportedEvmCoins[wallet.chain]) ||
            (recipient.opts?.showSVMWalletsAndTokens &&
              BitpaySupportedSvmCoins[wallet.chain]),
        );
      }
      if (recipient.network) {
        filteredWallets = filteredWallets.filter(
          wallet => wallet.network === recipient.network,
        );
      }
    }

    if (livenetOnly) {
      filteredWallets = filteredWallets.filter(
        wallet => wallet.network === 'livenet',
      );
    }

    if (assetContext?.currencyAbbreviation && assetContext.chain) {
      const filterCurrencyAbbreviation =
        assetContext.currencyAbbreviation.toLowerCase();
      const filterChain = assetContext.chain.toLowerCase();
      const filterNetwork = assetContext.network?.toLowerCase();
      const filterTokenAddress = assetContext.tokenAddress?.toLowerCase();

      filteredWallets = filteredWallets.filter(wallet => {
        if (wallet.currencyAbbreviation !== filterCurrencyAbbreviation) {
          return false;
        }
        if (wallet.chain !== filterChain) {
          return false;
        }
        if (filterNetwork && wallet.network !== filterNetwork) {
          return false;
        }

        if (filterTokenAddress) {
          return wallet.tokenAddress?.toLowerCase() === filterTokenAddress;
        }

        return true;
      });
    }

    if (context === 'coinbase' && useAsModal && customSupportedCurrencies) {
      const supportedCurrencies = new Set(
        customSupportedCurrencies.map(item =>
          item.currencyAbbreviation.toLowerCase(),
        ),
      );
      filteredWallets = filteredWallets.filter(wallet =>
        supportedCurrencies.has(wallet.currencyAbbreviation),
      );
    }

    return filteredWallets;
  }, [
    assetContext,
    context,
    customSupportedCurrencies,
    keys,
    livenetOnly,
    recipient,
    selectedAccountAddress,
    useAsModal,
  ]);

  const globalSelectListSignature = useMemo(
    () =>
      buildAccountListSignature({
        wallets,
        keys: Object.values(keys),
        quoteCurrency: defaultAltCurrencyIsoCode,
        ratesRevision: getRatesRevision(rates),
        extra: [
          context,
          selectedAccountAddress,
          nonBitpaySupportedTokensSignature,
          useAsModal ? 'modal' : 'screen',
          customSupportedCurrenciesSignature,
        ],
      }),
    [
      context,
      defaultAltCurrencyIsoCode,
      nonBitpaySupportedTokensSignature,
      rates,
      selectedAccountAddress,
      customSupportedCurrenciesSignature,
      keys,
      useAsModal,
      wallets,
    ],
  );

  const currenciesSupportedList = useMemo(() => {
    const buildCurrenciesSupportedList = () => {
      const coins = customSupportedCurrencies
        ? customSupportedCurrencies
        : SUPPORTED_COINS;
      const tokens = customSupportedCurrencies ? [] : SUPPORTED_TOKENS;
      const nonBitpayTokens = customSupportedCurrencies
        ? []
        : NON_BITPAY_SUPPORTED_TOKENS;
      const allCurrencies = requiresCurrencyCatalog
        ? uniqBy([...coins, ...tokens, ...nonBitpayTokens], c => c)
        : [];
      let allCurrencyData = {} as KeyWalletsRowProps[] | GlobalSelectObjByKey;
      if (accountListContexts.includes(context)) {
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
              defaultAltCurrencyIsoCode,
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
                  defaultAltCurrencyIsoCode,
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
        return allCurrencyData;
      } else if (!customToSelectCurrencies) {
        allCurrencyData = buildSelectableWalletList(
          allCurrencies,
          wallets,
          context,
        );
        return Object.values(allCurrencyData);
      } else {
        return [];
      }
    };

    if (!canCacheGlobalSelectList) {
      return buildCurrenciesSupportedList();
    }

    return resolveAccountListSnapshot({
      cacheKey: globalSelectListCacheKey,
      signature: globalSelectListSignature,
      build: buildCurrenciesSupportedList,
    });
  }, [
    NON_BITPAY_SUPPORTED_TOKENS,
    canCacheGlobalSelectList,
    context,
    customSupportedCurrencies,
    customToSelectCurrencies,
    defaultAltCurrencyIsoCode,
    dispatch,
    globalSelectListCacheKey,
    globalSelectListSignature,
    keys,
    rates,
    requiresCurrencyCatalog,
    wallets,
  ]);

  const customCurrenciesSupportedList = useMemo(() => {
    if (customToSelectCurrencies) {
      const resolvedList = resolveCustomGlobalSelectList({
        customToSelectCurrencies,
        selectedChainFilterOption,
        wallets,
        previous:
          preloadedCustomToSelectCurrenciesList ??
          customGlobalSelectListCacheRef.current,
      });
      customGlobalSelectListCacheRef.current = resolvedList;
      return resolvedList.data;
    } else {
      return [];
    }
  }, [
    customToSelectCurrencies,
    preloadedCustomToSelectCurrenciesList,
    selectedChainFilterOption,
    wallets,
  ]);

  const dataToDisplay = customToSelectCurrencies
    ? customCurrenciesSupportedList
    : currenciesSupportedList;

  useEffect(() => {
    if (initialAccountSelectionHandledRef.current) {
      return;
    }

    const initialAccountSelection = getGlobalSelectInitialAccountSelection(
      currenciesSupportedList,
    );
    if (!initialAccountSelection) {
      return;
    }

    initialAccountSelectionHandledRef.current = true;
    setSelectedEVMAccount(initialAccountSelection.account);
    setSelectedAssetsFromAccount(
      initialAccountSelection.assetsByChain as AssetsByChainData[],
    );
    setSearchVal('');
    setSearchResults([]);
    setHideCloseButton(true);
  }, [currenciesSupportedList]);

  const goToBuyCrypto = async () => {
    if (globalSelectOnDismiss) {
      globalSelectOnDismiss(undefined);
      await sleep(600);
      logManager.debug('[GlobalSelect] No wallets. Buy Crypto clicked.');
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
            name: 'BuyAndSellRoot',
            params: {
              amount: 200,
              context: 'buyCrypto',
            },
          },
        ],
      });
    }
  };

  const openCryptoSelectorRef = useRef<
    (selectObj: GlobalSelectObj) => Promise<void>
  >(async () => undefined);
  const openCryptoSelector = useCallback(
    (selectObj: GlobalSelectObj) => openCryptoSelectorRef.current(selectObj),
    [],
  );

  useLayoutEffect(() => {
    openCryptoSelectorRef.current = async (selectObj: GlobalSelectObj) => {
      const availableKeys = Object.values(keys);
      if (availableKeys.length > 1) {
        openKeySelector(selectObj);
      } else {
        const selectedKey = availableKeys[0];
        if (IsVMChain(selectObj.chains[0])) {
          openAccountSelector(selectObj, selectedKey);
        } else {
          openAccountUtxoSelector(selectObj, selectedKey);
        }
      }
    };
  });

  useEffect(() => {
    if (autoAdvanceReceiveRef.current) {
      return;
    }

    if (context !== 'receive' || !isFocused) {
      return;
    }

    if (cryptoSelectModalVisible) {
      return;
    }

    const currentList = searchVal ? searchResults : dataToDisplay;
    if (currentList.length !== 1) {
      return;
    }

    const onlyItem = currentList[0] as any;
    if (!onlyItem?.currencyAbbreviation || onlyItem?.accounts) {
      return;
    }

    autoAdvanceReceiveRef.current = true;
    openCryptoSelector(onlyItem as GlobalSelectObj);
  }, [
    context,
    cryptoSelectModalVisible,
    dataToDisplay,
    isFocused,
    searchResults,
    searchVal,
    openCryptoSelector,
  ]);

  const createProposalAndNavigate = useCallback(
    ({
        wallet,
        amount: proposalAmount,
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
      async dispatchEffect => {
        try {
          if (setButtonState) {
            setButtonState('loading');
          } else {
            showOngoingProcess('CREATING_TXP');
          }
          const {txDetails, txp} = await dispatchEffect(
            createProposalAndBuildTxDetails({
              wallet,
              recipient: sendTo,
              amount: proposalAmount,
              ...opts,
            }),
          );
          if (setButtonState) {
            setButtonState('success');
          } else {
            hideOngoingProcess();
          }
          await sleep(300);
          navigation.navigate('Confirm', {
            wallet,
            recipient: sendTo,
            txp,
            txDetails,
            amount: proposalAmount,
            message: opts?.message,
            solanaPayOpts: opts?.solanaPayOpts,
          });
        } catch (err: any) {
          const errStr =
            err instanceof Error ? err.message : JSON.stringify(err);
          logManager.error('[GlobalSelect] ' + errStr);
          if (setButtonState) {
            setButtonState('failed');
            sleep(1000).then(() => setButtonState?.(null));
          } else {
            hideOngoingProcess();
          }
          const errorMessageConfig = await dispatchEffect(
            handleCreateTxProposalError(err),
          );
          dispatchEffect(
            showBottomNotificationModal({
              ...errorMessageConfig,
              enableBackdropDismiss: true,
            }),
          );
        }
      },
    [hideOngoingProcess, navigation, showOngoingProcess],
  );

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
                  createProposalAndNavigate({
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
              createProposalAndNavigate({
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
          logManager.error('[GlobalSelect] ' + errStr);
        }
      } else if (context === 'send') {
        navigation.navigate('SendTo', {
          keyId: wallet.keyId,
          walletId: wallet.id,
          copayerId: wallet.credentials?.copayerId,
        });
      } else if (context === 'swapFrom') {
        navigation.navigate('SwapCryptoRoot', {selectedWallet: wallet});
      } else {
        setReceiveWallet(wallet);
      }
    },
    [
      amount,
      context,
      createProposalAndNavigate,
      dispatch,
      globalSelectOnDismiss,
      navigation,
      recipient,
      useAsModal,
    ],
  );

  const preloadedSendToRef = useRef<string | undefined>(undefined);
  const preloadSendTo = useCallback(
    (wallet: Wallet | undefined) => {
      if (
        context !== 'send' ||
        !wallet ||
        typeof (navigation as any).preload !== 'function'
      ) {
        return;
      }

      const copayerId = wallet.credentials?.copayerId;
      const preloadIdentity = `${wallet.keyId}:${wallet.id}:${copayerId || ''}`;
      if (preloadedSendToRef.current === preloadIdentity) {
        return;
      }

      preloadedSendToRef.current = preloadIdentity;
      performanceLog('[PERF-PRELOAD] SendTo start source:GlobalSelect');
      (navigation as any).preload('SendTo', {
        keyId: wallet.keyId,
        walletId: wallet.id,
        copayerId,
        _preloadContent: true,
      });
    },
    [context, navigation],
  );
  const preloadSendToRef = useRef(preloadSendTo);
  preloadSendToRef.current = preloadSendTo;
  const stablePreloadSendTo = useCallback(
    (wallet: Wallet | undefined) => preloadSendToRef.current(wallet),
    [],
  );
  const firstSendWallet = context === 'send' ? wallets[0] : undefined;
  const firstSendWalletIdentity = firstSendWallet
    ? `${firstSendWallet.keyId}:${firstSendWallet.id}:${
        firstSendWallet.credentials?.copayerId || ''
      }`
    : undefined;
  const firstSendWalletRef = useRef(firstSendWallet);
  firstSendWalletRef.current = firstSendWallet;

  useEffect(() => {
    if (!isFocused || useAsModal) {
      return;
    }

    preloadedSendToRef.current = undefined;
    if (!firstSendWalletIdentity) {
      return;
    }

    const preloadTask = scheduleAfterTransitionAndIdle({
      navigation: navigation as any,
      transitionFallbackMs: 800,
      idleTimeoutMs: 900,
      callback: signal => {
        if (!signal.aborted) {
          stablePreloadSendTo(firstSendWalletRef.current);
        }
      },
    });

    return preloadTask.cancel;
  }, [
    firstSendWalletIdentity,
    isFocused,
    navigation,
    stablePreloadSendTo,
    useAsModal,
  ]);

  const memoizedRenderAssetsItem = useCallback(
    ({item}: {item: AssetsByChainData; index: number}) => {
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
            onPressIn={(walletId, copayerId) => {
              const keyFullWalletObjs = keys[selectedEVMAccount.keyId!].wallets;
              stablePreloadSendTo(
                findWalletById(
                  keyFullWalletObjs,
                  walletId,
                  copayerId,
                ) as Wallet,
              );
            }}
            showChainAssetsByDefault={true}
          />
        </View>
      );
    },
    [
      hideAllBalances,
      keys,
      onWalletSelect,
      selectedEVMAccount,
      stablePreloadSendTo,
    ],
  );

  const renderItem = useCallback(
    ({item}: {item: GlobalSelectFlatRow}) => {
      if (item.__row === 'keyHeader') {
        return (
          <TitleNameContainer>
            <KeySvg />
            <TitleName>{item.keyName}</TitleName>
          </TitleNameContainer>
        );
      }

      if (item.__row === 'account') {
        const {account} = item;
        return (
          <View style={{marginLeft: -10}}>
            <AccountListRow
              id={account.id}
              accountItem={account}
              hideBalance={hideAllBalances}
              animateEntrance={false}
              onPressIn={() => {
                if (IsVMChain(account.chains[0])) {
                  return;
                }
                stablePreloadSendTo(
                  findWalletById(
                    keys[account.keyId].wallets,
                    account.wallets[0].id,
                    account.wallets[0].copayerId,
                  ) as Wallet,
                );
              }}
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
        );
      }

      return (
        <GlobalSelectRow
          item={item.item}
          hasSelectedChainFilterOption={!!selectedChainFilterOption}
          emit={(selectObj: GlobalSelectObj) => {
            openCryptoSelector(selectObj);
          }}
        />
      );
    },
    [
      hideAllBalances,
      keys,
      onWalletSelect,
      openCryptoSelector,
      selectedChainFilterOption,
      stablePreloadSendTo,
    ],
  );

  const flatListData = useMemo(() => {
    const source = (
      !searchVal && !selectedChainFilterOption ? dataToDisplay : searchResults
    ) as (GlobalSelectObj | KeyWalletsRowProps)[];
    return flattenGlobalSelectData(source);
  }, [searchVal, selectedChainFilterOption, dataToDisplay, searchResults]);

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
      setCryptoSelectModalVisible(false);
      await sleep(300);
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
    showCryptoSelectModal();
  };

  const onAccountSelected = async (
    selectedAccount: AccountRowProps,
    selectedCurrency: GlobalSelectObj,
    selectedKey: Key,
  ) => {
    openNetworkSelector(selectedAccount, selectedCurrency, selectedKey);
  };

  const onNetworkSelected = async (
    selectedAccount: AccountRowProps | undefined,
    selectedKey: Key,
    selectedCurrency: GlobalSelectObj,
    selectedNetwork: string,
  ) => {
    const completeSelection = async () => {
      if (!selectedAccount) {
        handleBasicWalletCreation(
          selectedCurrency,
          selectedKey,
          selectedNetwork,
        );
        return;
      }

      const {keyId, wallets: selectedAccountWallets} = selectedAccount;
      const wallet = selectedAccountWallets.find(
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
        const associatedWallet = selectedAccountWallets.find(
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

    if (useAsModal && ['buy', 'swapTo'].includes(context)) {
      if (cryptoSelectModalVisible) {
        pendingCryptoSelectorDismissActionRef.current = completeSelection;
        setCryptoSelectModalVisible(false);
      } else {
        await completeSelection();
      }
      return;
    }

    setCryptoSelectModalVisible(false);
    await sleep(500);
    await completeSelection();
  };

  const openAccountUtxoSelector = async (
    selectedCurrency: GlobalSelectObj,
    selectedKey: Key,
  ) => {
    const accountList = buildAccountList(
      selectedKey,
      defaultAltCurrencyIsoCode,
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
      showCryptoSelectModal();
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
      defaultAltCurrencyIsoCode,
      rates,
      dispatch,
      {
        skipFiatCalculations: true,
      },
    );

    const evmAccounts = cloneDeep(accountList).filter(
      account =>
        IsEVMChain(account.chains[0]) &&
        account.chains.some(chain => selectedCurrency.chains.includes(chain)),
    );
    const svmAccounts = cloneDeep(accountList).filter(
      account =>
        IsSVMChain(account.chains[0]) &&
        account.chains.some(chain => selectedCurrency.chains.includes(chain)),
    );

    const hasMultipleAccounts =
      evmAccounts.length > 1 || svmAccounts.length > 1;
    const hasBothVmTypes = evmAccounts.length > 0 && svmAccounts.length > 0;

    const selectedCurrencyHasBothVmTypes =
      selectedCurrency.chains.includes('sol') &&
      cloneDeep(selectedCurrency.chains).some(chain =>
        SUPPORTED_EVM_COINS.includes(chain),
      );

    if (
      hasMultipleAccounts ||
      hasBothVmTypes ||
      selectedCurrencyHasBothVmTypes
    ) {
      setAccountsCardsList({
        accounts: [...evmAccounts, ...svmAccounts],
        currency: selectedCurrency,
        showAddSvmAccount:
          ['buy', 'swapTo', 'coinbase', 'coinbaseDeposit'].includes(context) &&
          selectedCurrencyHasBothVmTypes &&
          evmAccounts.length > 0 &&
          svmAccounts.length === 0,
        showAddEvmAccount:
          ['buy', 'swapTo', 'coinbase', 'coinbaseDeposit'].includes(context) &&
          selectedCurrencyHasBothVmTypes &&
          svmAccounts.length > 0 &&
          evmAccounts.length === 0,
        key: selectedKey,
      });
      setCryptoSelectContext({
        title: 'Select Account to Deposit to',
        status: 'account-selection',
      });
      showCryptoSelectModal();
      return;
    } else {
      // Only 1 account available
      const selectedAccount = evmAccounts[0] || svmAccounts[0];
      openNetworkSelector(selectedAccount, selectedCurrency, selectedKey);
    }
  };

  const openNetworkSelector = async (
    selectedAccount: AccountRowProps | undefined,
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

    let networks = SupportedChainsOptions.filter(
      network =>
        selectedCurrency.chains.includes(network.chain) &&
        (!selectedAccount || selectedAccount?.chains?.includes(network.chain)),
    );
    if (context === 'receive') {
      if (!selectedAccount) {
        logger.warn(
          'Selected Account is undefined. Cannot select wallet to receive.',
        );
        setCryptoSelectModalVisible(false);
        await sleep(500);
        dispatch(
          AppActions.showBottomNotificationModal({
            type: 'warning',
            title: t('Unable to generate address'),
            message: t(
              'Your Key does not have an Account or Wallet corresponding to the selected currency.',
            ),
            enableBackdropDismiss: true,
            actions: [
              {
                text: t('GOT IT'),
                action: () => null,
                primary: true,
              },
            ],
          }),
        );
        return;
      }
      // user is selecting address to receive funds if context === receive
      setCryptoSelectModalVisible(false);
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
    showCryptoSelectModal();
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
    if (isEmpty(selectedEVMAccount)) {
      return;
    }

    const accountGroups = (
      currenciesSupportedList as (GlobalSelectObj | KeyWalletsRowProps)[]
    ).filter(item =>
      Array.isArray((item as KeyWalletsRowProps).accounts),
    ) as KeyWalletsRowProps[];
    const selectedAccount = accountGroups
      .flatMap(item => item.accounts as GlobalSelectAccount[])
      .find(
        account =>
          account.keyId === selectedEVMAccount.keyId &&
          account.receiveAddress === selectedEVMAccount.receiveAddress,
      );

    if (!selectedAccount) {
      setSearchVal('');
      setSearchResults([]);
      setSelectedEVMAccount({} as Partial<AccountRowProps>);
      setSelectedAssetsFromAccount(currentAssets =>
        currentAssets.length ? [] : currentAssets,
      );
      setHideCloseButton(false);
      return;
    }

    const remainsTheOnlyVmAccount =
      accountGroups.length === 1 &&
      accountGroups[0].accounts.length === 1 &&
      IsVMChain(accountGroups[0].accounts[0].chains[0]);
    setHideCloseButton(remainsTheOnlyVmAccount);

    setSelectedEVMAccount(currentAccount => {
      if (
        currentAccount.keyId === selectedAccount.keyId &&
        currentAccount.receiveAddress === selectedAccount.receiveAddress &&
        currentAccount.accountName === selectedAccount.accountName &&
        currentAccount.accountNumber === selectedAccount.accountNumber &&
        currentAccount.chains === selectedAccount.chains
      ) {
        return currentAccount;
      }

      return {
        keyId: selectedAccount.keyId,
        chains: selectedAccount.chains,
        accountName: selectedAccount.accountName,
        accountNumber: selectedAccount.accountNumber,
        receiveAddress: selectedAccount.receiveAddress,
      };
    });
    setSelectedAssetsFromAccount(currentAssets =>
      currentAssets === selectedAccount.assetsByChain
        ? currentAssets
        : selectedAccount.assetsByChain ?? [],
    );
  }, [currenciesSupportedList, selectedEVMAccount]);

  useEffect(() => {
    if (receiveWallet) {
      const showReceiveModal = async () => {
        setShowReceiveAddressBottomModal(true);
      };
      showReceiveModal();
    }
  }, [receiveWallet]);

  return (
    <SafeAreaView style={styles.safeAreaView}>
      {useAsModal && (
        <View
          style={[
            styles.modalHeader,
            {marginTop: Platform.OS === 'android' ? 20 : 0},
          ]}>
          <View style={styles.closeModalButtonContainer}>
            <CloseModalButton
              onPress={() => {
                if (globalSelectOnDismiss) {
                  globalSelectOnDismiss(undefined);
                }
              }}>
              <CloseIcon />
            </CloseModalButton>
          </View>
          {!!modalTitle && (
            <View style={styles.modalTitleContainer}>
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
            </View>
          )}
        </View>
      )}
      <View style={styles.globalSelectContainer}>
        <View style={styles.searchComponentContainer}>
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
        </View>
        {(currenciesSupportedList?.length > 0 ||
          customCurrenciesSupportedList.length > 0) &&
          selectedAssetsFromAccount.length === 0 && (
            <FlashListCointainer>
              <FlashListComponent
                inModal={useAsModal}
                contentContainerStyle={{paddingBottom: 150}}
                data={flatListData}
                extraData={hideAllBalances}
                keyExtractor={(item: GlobalSelectFlatRow) => item.id}
                getItemType={(item: GlobalSelectFlatRow) => item.__row}
                renderItem={renderItem}
                onEndReachedThreshold={0.3}
              />
            </FlashListCointainer>
          )}

        {selectedAssetsFromAccount.length > 0 ? (
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
              <FlashListCointainer style={{height: HEIGHT - 235}}>
                <FlashListComponent
                  inModal={useAsModal}
                  contentContainerStyle={{paddingBottom: 300}}
                  data={
                    !searchVal && !selectedChainFilterOption
                      ? selectedAssetsFromAccount
                      : (searchResults as AssetsByChainData[])
                  }
                  extraData={hideAllBalances}
                  keyExtractor={(item: AssetsByChainData) => item.id}
                  renderItem={memoizedRenderAssetsItem}
                />
              </FlashListCointainer>
            </View>
          </>
        ) : null}

        {shouldShowGlobalSelectEmptyState({
          isContentReady: true,
          currenciesSupportedCount: currenciesSupportedList.length,
          customCurrenciesSupportedCount: customCurrenciesSupportedList.length,
        }) ? (
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
            }}
            onModalHide={handleCryptoSelectModalHide}>
            <WalletSelectMenuContainer
              style={{minHeight: 300, paddingBottom: 80}}>
              <WalletSelectMenuHeaderContainer style={{marginBottom: 10}}>
                <TextAlign align={'center'}>
                  <H4>{cryptoSelectContext?.title}</H4>
                </TextAlign>
              </WalletSelectMenuHeaderContainer>

              {cryptoSelectContext.status === 'key-selection' && (
                <WalletSelectMenuBodyContainer>
                  {cardsList?.list.map((data: any) => (
                    <View key={data.id}>{data.component}</View>
                  ))}
                </WalletSelectMenuBodyContainer>
              )}

              {cryptoSelectContext.status === 'account-selection' && (
                <WalletSelectMenuBodyContainer>
                  {accountsCardsList?.accounts?.map((item: AccountRowProps) => (
                    <AccountListRow
                      key={item.id}
                      id={item.id}
                      accountItem={item}
                      hideBalance={hideAllBalances}
                      animateEntrance={false}
                      onPress={() =>
                        onAccountSelected(
                          item,
                          accountsCardsList.currency,
                          accountsCardsList.key,
                        )
                      }
                    />
                  ))}
                  {accountsCardsList.showAddSvmAccount ? (
                    <AddAccountBtnContainer
                      onPress={() => {
                        // It is not necessary to show the list of networks for SVM
                        onNetworkSelected(
                          undefined,
                          accountsCardsList.key,
                          accountsCardsList.currency,
                          'sol',
                        );
                      }}>
                      <Icons.Add />
                      <AddAccountBtnText>
                        {t('Add Solana Account')}
                      </AddAccountBtnText>
                    </AddAccountBtnContainer>
                  ) : null}
                  {accountsCardsList.showAddEvmAccount ? (
                    <AddAccountBtnContainer
                      onPress={() => {
                        const _selectedCurrency = cloneDeep(
                          accountsCardsList.currency,
                        );
                        _selectedCurrency.chains =
                          _selectedCurrency.chains.filter((chain: string) =>
                            SUPPORTED_EVM_COINS.includes(chain),
                          );
                        openNetworkSelector(
                          undefined,
                          _selectedCurrency,
                          accountsCardsList.key,
                        );
                      }}>
                      <Icons.Add />
                      <AddAccountBtnText>
                        {t('Add EVM Account')}
                      </AddAccountBtnText>
                    </AddAccountBtnContainer>
                  ) : null}
                </WalletSelectMenuBodyContainer>
              )}

              {cryptoSelectContext.status === 'network-selection' && (
                <WalletSelectMenuBodyContainer>
                  {networkCardsList?.networks?.map(
                    (item: SupportedChainOption, index: number) => (
                      <View key={item.chain}>
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
      </View>
    </SafeAreaView>
  );
};

export default GlobalSelect;
