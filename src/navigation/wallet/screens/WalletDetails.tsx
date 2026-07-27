import {useNavigation, useTheme} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {FlashList} from '@shopify/flash-list';
import i18next from 'i18next';
import _ from 'lodash';
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {useTranslation} from 'react-i18next';
import {
  DeviceEventEmitter,
  Linking,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {useTheme as useStyledTheme} from '../../../contexts';
import {shareNative} from '../../../utils/share';
import {useStore} from 'react-redux';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import BalanceHistoryChart from '../../../components/charts/BalanceHistoryChart';
import BalanceHeaderSupplement from '../../../components/charts/BalanceHeaderSupplement';
import FullWidthBalanceChartContainer from '../../../components/charts/FullWidthBalanceChartContainer';
import {getTimeframeSelectorWidth} from '../../../components/charts/timeframeSelectorWidth';
import useLegacyLastDayChangeRowData from '../../../components/charts/useLegacyLastDayChangeRowData';
import usePortfolioBalanceChartSurface from '../../../portfolio/ui/hooks/usePortfolioBalanceChartSurface';
import usePortfolioBalanceChartReadiness from '../../../portfolio/ui/hooks/usePortfolioBalanceChartReadiness';
import Settings from '../../../components/settings/Settings';
import {
  Balance,
  BaseText,
  H2,
  H5,
  HeaderTitle,
  Link,
  Paragraph,
  ProposalBadge,
  Small,
} from '../../../components/styled/Text';
import {Network} from '../../../constants';
import {
  showBottomNotificationModal,
  toggleHideAllBalances,
} from '../../../store/app/app.actions';
import {maybePopulatePortfolioForWallets} from '../../../store/portfolio';
import {startUpdateWalletStatus} from '../../../store/wallet/effects/status/status';
import {
  buildUIFormattedWallet,
  findWalletById,
  isSegwit,
  isTaproot,
} from '../../../store/wallet/utils/wallet';
import {formatFiatAmount} from '../../../utils/helper-methods';
import {
  setWalletScanning,
  updatePortfolioBalance,
} from '../../../store/wallet/wallet.actions';
import {
  Key,
  TransactionProposal,
  Wallet,
} from '../../../store/wallet/wallet.models';
import {
  Action,
  Air,
  Black,
  LightBlack,
  LuckySevens,
  Slate30,
  SlateDark,
  White,
} from '../../../styles/colors';
import {
  formatCurrencyAbbreviation,
  getProtocolName,
  shouldScale,
  sleep,
} from '../../../utils/helper-methods';
import LinkingButtons from '../../tabs/home/components/LinkingButtons';
import {
  BalanceUpdateError,
  CustomErrorMessage,
  RbfTransaction,
  SpeedupEthTransaction,
  SpeedupInsufficientFunds,
  SpeedupInvalidTx,
  SpeedupTransaction,
  UnconfirmedInputs,
} from '../components/ErrorMessages';
import OptionsSheet, {Option} from '../components/OptionsSheet';
import ReceiveAddress from '../components/ReceiveAddress';
import BalanceDetailsModal from '../components/BalanceDetailsModal';
import Icons from '../components/WalletIcons';
import MultisigIcon from '../../../../assets/img/icon-multisig-group.svg';
import {WalletScreens, WalletGroupParamList} from '../WalletGroup';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {startGetRates} from '../../../store/wallet/effects';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {
  BuildUiFriendlyList,
  CanSpeedupTx,
  GetTransactionHistory,
  GroupTransactionHistory,
  IsMoved,
  IsReceived,
  IsShared,
  TX_HISTORY_LIMIT,
} from '../../../store/wallet/effects/transactions/transactions';
import {
  ProposalBadgeContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import TransactionRow, {
  TRANSACTION_ROW_HEIGHT,
} from '../../../components/list/TransactionRow';
import TransactionProposalRow from '../../../components/list/TransactionProposalRow';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import {IsERCToken} from '../../../store/wallet/utils/currency';
import {
  DeviceEmitterEvents,
  WalletLoadHistoryTarget,
} from '../../../constants/device-emitter-events';
import {isCoinSupportedToBuy} from '../../services/buy-crypto/utils/buy-crypto-utils';
import {isCoinSupportedToSell} from '../../services/sell-crypto/utils/sell-crypto-utils';
import {isCoinSupportedToSwap} from '../../services/swap-crypto/utils/swap-crypto-utils';
import {
  buildBtcSpeedupTx,
  buildEthERCTokenSpeedupTx,
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import KeySvg from '../../../../assets/img/key.svg';
import TimerSvg from '../../../../assets/img/timer.svg';
import InfoSvg from '../../../../assets/img/info.svg';
import {
  BitpaySupportedCoins,
  SUPPORTED_VM_TOKENS,
} from '../../../constants/currencies';
import ContactIcon from '../../tabs/contacts/components/ContactIcon';
import {getAssetTheme} from '../../../utils/portfolio/assetTheme';
import {
  TransactionIcons,
  TRANSACTION_ICON_SIZE,
} from '../../../constants/TransactionIcons';
import SentBadgeSvg from '../../../../assets/img/sent-badge.svg';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {getGiftCardIcons} from '../../../lib/gift-cards/gift-card';
import {BillPayAccount} from '../../../store/shop/shop.models';
import debounce from 'lodash.debounce';
import ArchaxFooter from '../../../components/archax/archax-footer';
import {ExternalServicesScreens} from '../../services/ExternalServicesGroup';
import {isTSSKey} from '../../../store/wallet/effects/tss-send/tss-send';
import {logManager} from '../../../managers/LogManager';
import type {RootState} from '../../../store';
import {getQuoteCurrency} from '../../../utils/portfolio/assets';
import {formatUnknownError} from '../../../utils/errors/formatUnknownError';
import ThresholdBadge from '../../../components/threshold-badge/ThresholdBadge';

export type WalletDetailsScreenParamList = {
  walletId: string;
  skipInitializeHistory?: boolean;
  copayerId?: string;
};

type WalletDetailsScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  'WalletDetails'
>;

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  walletDetailsContainer: {
    flex: 1,
  },
  headerContainer: {
    marginTop: 18,
    marginHorizontal: 0,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  cryptoBalanceRow: {
    marginTop: -5,
  },
  touchableRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  balanceContainer: {
    paddingTop: 0,
    paddingHorizontal: 15,
    paddingBottom: 22,
    flexDirection: 'column',
  },
  transactionSectionHeaderContainer: {
    padding: gutter,
    height: 55,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  borderBottom: {
    borderBottomWidth: 1,
  },
  skeletonContainer: {
    marginBottom: 20,
  },
  emptyListContainer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 50,
  },
  lockedBalanceContainer: {
    flexDirection: 'row',
    padding: gutter,
    justifyContent: 'center',
    alignItems: 'center',
    height: 75,
  },
  description: {
    overflow: 'hidden',
    fontSize: 16,
  },
  tailContainer: {
    marginLeft: 'auto' as any,
  },
  value: {
    textAlign: 'right',
    fontWeight: '700',
    fontSize: 16,
  },
  fiat: {
    fontSize: 14,
    textAlign: 'right',
  },
  headerKeyName: {
    textAlign: 'center',
    marginLeft: 5,
    fontSize: 12,
    lineHeight: 20,
  },
  headerSubTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeContainerBase: {
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 3,
  },
  typeContainerMargin: {
    marginTop: 10,
    marginHorizontal: 4,
    marginBottom: 0,
  },
  networkBadgeRow: {
    alignItems: 'center',
    marginTop: 10,
  },
  networkBadgeContainerMargin: {
    marginTop: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    marginRight: 4,
  },
  iconContainer: {
    marginRight: 5,
  },
  typeText: {
    fontSize: 12,
  },
  cryptoBalanceText: {
    fontSize: 13,
  },
  linkText: {
    fontWeight: '500',
    fontSize: 18,
    textAlign: 'center',
  },
});

const WalletDetailsContainer: React.FC<
  React.ComponentProps<typeof SafeAreaView>
> = ({style, ...rest}) => (
  <SafeAreaView style={[styles.walletDetailsContainer, style]} {...rest} />
);

const HeaderContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.headerContainer, style]} {...rest} />;

const Row: React.FC<React.ComponentProps<typeof View>> = ({style, ...rest}) => (
  <View style={[styles.row, style]} {...rest} />
);

const CryptoBalanceRow: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <Row style={[styles.cryptoBalanceRow, style]} {...rest} />;

const TouchableRow: React.FC<React.ComponentProps<typeof TouchableOpacity>> = ({
  style,
  ...rest
}) => <TouchableOpacity style={[styles.touchableRow, style]} {...rest} />;

const BalanceContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.balanceContainer, style]} {...rest} />;

const TransactionSectionHeaderContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => {
  const theme = useStyledTheme();
  return (
    <View
      style={[
        styles.transactionSectionHeaderContainer,
        {backgroundColor: theme.dark ? LightBlack : '#F5F6F7'},
        style,
      ]}
      {...rest}
    />
  );
};

const BorderBottom: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useStyledTheme();
  return (
    <View
      style={[
        styles.borderBottom,
        {borderBottomColor: theme.dark ? LightBlack : Air},
        style,
      ]}
      {...rest}
    />
  );
};

const SkeletonContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.skeletonContainer, style]} {...rest} />;

const EmptyListContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.emptyListContainer, style]} {...rest} />;

const LockedBalanceContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.lockedBalanceContainer, style]} {...rest} />
);

const Description: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => <BaseText style={[styles.description, style]} {...rest} />;

const TailContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.tailContainer, style]} {...rest} />;

const HeadContainer: React.FC<React.ComponentProps<typeof View>> = props => (
  <View {...props} />
);

const Value: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => <BaseText style={[styles.value, style]} {...rest} />;

const Fiat: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useStyledTheme();
  return (
    <BaseText
      style={[styles.fiat, {color: theme.dark ? White : SlateDark}, style]}
      {...rest}
    />
  );
};

const HeaderKeyName: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useStyledTheme();
  return (
    <BaseText
      style={[
        styles.headerKeyName,
        {color: theme.dark ? LuckySevens : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const HeaderSubTitleContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.headerSubTitleContainer, style]} {...rest} />;

const TypeContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useStyledTheme();
  return (
    <HeaderSubTitleContainer
      style={[
        styles.typeContainerBase,
        {borderColor: theme.dark ? LightBlack : Slate30},
        styles.typeContainerMargin,
        style,
      ]}
      {...rest}
    />
  );
};

const NetworkBadgeRow: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <Row style={[styles.networkBadgeRow, style]} {...rest} />;

const NetworkBadgeContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => (
  <TypeContainer
    style={[styles.networkBadgeContainerMargin, style]}
    {...rest}
  />
);

const IconContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.iconContainer, style]} {...rest} />;

const TypeText: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useStyledTheme();
  return (
    <BaseText
      style={[
        styles.typeText,
        {color: theme.dark ? LuckySevens : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const CryptoBalanceText: React.FC<React.ComponentProps<typeof Paragraph>> = ({
  style,
  ...rest
}) => <Paragraph style={[styles.cryptoBalanceText, style]} {...rest} />;

const LinkText: React.FC<React.ComponentProps<typeof Link>> = ({
  style,
  ...rest
}) => <Link style={[styles.linkText, style]} {...rest} />;

const getWalletType = (
  key: Key,
  wallet: Wallet,
): undefined | {title: string; icon?: ReactElement} => {
  const {
    credentials: {token, walletId, addressType, keyId},
  } = wallet;
  if (!keyId) {
    return {title: i18next.t('Read Only')};
  }
  if (token) {
    const linkedWallet = key.wallets.find(({tokens}) =>
      tokens?.includes(walletId),
    );
    const walletName =
      linkedWallet?.walletName || linkedWallet?.credentials.walletName;
    return {title: `${walletName}`, icon: <Icons.Wallet />};
  }

  if (isSegwit(addressType)) {
    return {title: 'Segwit'};
  }

  if (isTaproot(addressType)) {
    return {title: 'Taproot'};
  }
  return;
};

const formatSelectedCryptoBalance = (balance: string): string => {
  const trimmed = String(balance || '').trim();
  const numericValue = Number(trimmed.replace(/,/g, ''));

  return trimmed && Number.isFinite(numericValue) && numericValue === 0
    ? '0.00'
    : balance;
};

const transactionKeyExtractor = (_item: any, index: number) => index.toString();

const WalletDetails: React.FC<WalletDetailsScreenProps> = ({route}) => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const reduxStore = useStore();
  const theme = useTheme();
  const {width: windowWidth} = useWindowDimensions();
  const {t} = useTranslation();
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {walletId, skipInitializeHistory, copayerId} = route.params;

  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const supportedCardMap = useAppSelector(
    ({SHOP_CATALOG}) => SHOP_CATALOG.supportedCardMap,
  );
  const committedPortfolioQuoteCurrency = useAppSelector(
    ({PORTFOLIO}) => PORTFOLIO.quoteCurrency,
  );

  const locationData = useAppSelector(({LOCATION}) => LOCATION.locationData);
  const timeframeSelectorWidth = getTimeframeSelectorWidth(
    windowWidth,
    ScreenGutter,
  );

  const wallets = (Object.values(keys) as Key[]).flatMap(k => k.wallets);

  const contactList = useAppSelector(({CONTACT}) => CONTACT.list);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const showPortfolioValue = useAppSelector(({APP}) => APP.showPortfolioValue);
  const fullWalletObj = findWalletById(wallets, walletId, copayerId) as Wallet;
  const key = keys[fullWalletObj.keyId];
  const uiFormattedWallet = buildUIFormattedWallet(
    fullWalletObj,
    defaultAltCurrency.isoCode,
    rates,
    dispatch,
    'symbol',
  );
  const accounts = useAppSelector(
    ({SHOP}) => SHOP.billPayAccounts[uiFormattedWallet.network],
  );
  const [showReceiveAddressBottomModal, setShowReceiveAddressBottomModal] =
    useState(false);
  const [showBalanceDetailsModal, setShowBalanceDetailsModal] = useState(false);
  const walletType = getWalletType(key, fullWalletObj);
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);

  const getLatestWalletFromReduxState = useCallback(() => {
    const state = reduxStore.getState() as RootState;
    const latestKeys = state.WALLET.keys as Record<string, Key>;
    const latestWallets = (Object.values(latestKeys) as Key[]).flatMap(
      (walletKey: Key) => walletKey.wallets || [],
    );
    const latestWallet = findWalletById(latestWallets, walletId, copayerId) as
      | Wallet
      | undefined;

    return {
      state,
      wallet: latestWallet,
    };
  }, [copayerId, reduxStore, walletId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={{height: 'auto'}}>
          <HeaderSubTitleContainer>
            <KeySvg width={10} height={10} />
            <HeaderKeyName>{key.keyName}</HeaderKeyName>
          </HeaderSubTitleContainer>
          <HeaderTitle style={{textAlign: 'center'}}>
            {uiFormattedWallet.walletName}
          </HeaderTitle>
        </View>
      ),
      headerRight: () => (
        <Settings
          onPress={() => {
            setShowWalletOptions(true);
          }}
        />
      ),
    });
  }, [navigation, uiFormattedWallet.walletName, key.keyName]);

  const ShareAddress = async () => {
    try {
      await sleep(1000);
      const address = (await dispatch<any>(
        createWalletAddress({wallet: fullWalletObj, newAddress: false}),
      )) as string;

      dispatch(
        shareNative(
          {message: address, title: t('Share Address')},
          {
            dialogTitle: t('Share Address'),
            subject: t('Share Address'),
            excludedActivityTypes: [
              'print',
              'addToReadingList',
              'markupAsPDF',
              'openInIbooks',
              'postToFacebook',
              'postToTwitter',
              'saveToCameraRoll',
              'sharePlay',
            ],
          },
        ),
      );
    } catch (e) {}
  };

  const onPressWithDelay = async (cb: () => void) => {
    await sleep(500);
    cb();
  };

  const createViewOnBlockchainOption = () => {
    if (
      ['eth', 'matic', 'xrp', 'arb', 'base', 'op', 'sol'].includes(
        fullWalletObj.chain.toLowerCase(),
      ) ||
      IsERCToken(
        fullWalletObj.currencyAbbreviation.toLowerCase(),
        fullWalletObj.chain.toLowerCase(),
      )
    ) {
      return {
        img: <Icons.Settings />,
        title: t('View Wallet in Explorer'),
        description: t(
          'View your wallet transactions and activities on the blockchain.',
        ),
        onPress: () => onPressWithDelay(viewOnBlockchain),
      };
    }
    return null;
  };

  const createRequestAmountOption = () => ({
    img: <Icons.RequestAmount />,
    title: t('Request a specific amount'),
    description: t(
      'This will generate an invoice, which the person you send it to can pay using any wallet.',
    ),
    onPress: () =>
      onPressWithDelay(() =>
        navigation.navigate(WalletScreens.AMOUNT, {
          cryptoCurrencyAbbreviation: fullWalletObj.currencyAbbreviation,
          chain: fullWalletObj.chain,
          tokenAddress: fullWalletObj.tokenAddress,
          onAmountSelected: async (amount, setButtonState) => {
            setButtonState('success');
            await sleep(500);
            navigation.navigate('RequestSpecificAmountQR', {
              wallet: fullWalletObj,
              requestAmount: Number(amount),
            });
            sleep(300).then(() => setButtonState(null));
          },
        }),
      ),
  });

  const createShareAddressOption = () => ({
    img: <Icons.ShareAddress />,
    title: t('Share Address'),
    description: t(
      'Share your wallet address to someone in your contacts so they can send you funds.',
    ),
    onPress: ShareAddress,
  });

  const createWalletSettingsOption = () => ({
    img: <Icons.Settings />,
    title: t('Wallet Settings'),
    description: t('View all the ways to manage and configure your wallet.'),
    onPress: () =>
      onPressWithDelay(() =>
        navigation.navigate('WalletSettings', {
          key,
          walletId,
        }),
      ),
  });

  const getAssetOptions = (): Option[] =>
    [
      createViewOnBlockchainOption(),
      createRequestAmountOption(),
      createShareAddressOption(),
      createWalletSettingsOption(),
    ].filter(Boolean) as Option[];

  const onRefresh = async () => {
    setRefreshing(true);
    await sleep(1000);

    try {
      await dispatch(startGetRates({}));
      await Promise.all([
        dispatch(
          startUpdateWalletStatus({key, wallet: fullWalletObj, force: true}),
        ) as any,
        debouncedLoadHistory(true) as any,
        sleep(1000),
      ]);
      dispatch(updatePortfolioBalance());

      const {wallet: latestWallet} = getLatestWalletFromReduxState();
      setNeedActionTxps(latestWallet?.pendingTxps || []);

      if (latestWallet?.isScanning || fullWalletObj.isScanning) {
        // cancel scanning if user refreshes in case it's stuck
        dispatch(
          setWalletScanning({
            keyId: latestWallet?.keyId || key.id,
            walletId: latestWallet?.id || fullWalletObj.id,
            isScanning: false,
          }),
        );
      }

      Promise.resolve()
        .then(() =>
          dispatch(
            maybePopulatePortfolioForWallets({
              walletIds: [latestWallet?.id || fullWalletObj.id],
              quoteCurrency: getQuoteCurrency({
                portfolioQuoteCurrency: committedPortfolioQuoteCurrency,
                defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
              }),
              forceRetryQuarantined: true,
            }) as any,
          ),
        )
        .catch(error => {
          logManager.warn(
            `[portfolio] Failed background wallet details refresh populate: ${formatUnknownError(
              error,
            )}`,
          );
        });
    } catch {
      dispatch(showBottomNotificationModal(BalanceUpdateError()));
    } finally {
      setRefreshing(false);
    }
  };

  const {
    cryptoBalance,
    cryptoLockedBalance,
    cryptoSpendableBalance,
    fiatBalanceFormat,
    fiatLockedBalanceFormat,
    fiatSpendableBalanceFormat,
    currencyAbbreviation,
    chain,
    tokenAddress,
    network,
    pendingTxps,
  } = uiFormattedWallet;
  const chartQuoteCurrency = getQuoteCurrency({
    portfolioQuoteCurrency: committedPortfolioQuoteCurrency,
    defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
  });
  const chartWallets = useMemo(() => [fullWalletObj], [fullWalletObj]);
  const showFiatBalance = network !== Network.testnet;
  const {
    shouldMountBalanceChart: shouldMountWalletBalanceChart,
    shouldShowChartLoader: shouldShowWalletChartLoader,
    shouldRenderZeroBalanceChart: shouldRenderZeroWalletBalanceChart,
    shouldPreserveStaleBalanceChart: shouldPreserveStaleWalletBalanceChart,
    isBalanceChartDataReadyToQuery: isWalletBalanceChartDataReadyToQuery,
    chartableWallets,
  } = usePortfolioBalanceChartReadiness({
    wallets: chartWallets,
    enabled: showPortfolioValue === true && showFiatBalance,
    hideAllBalances,
    renderZeroBalanceChartWhenNoSnapshots: true,
  });
  const balanceChartSurface = usePortfolioBalanceChartSurface({
    wallets: chartableWallets,
    quoteCurrency: chartQuoteCurrency,
    fallbackCurrency: defaultAltCurrency.isoCode,
    enabled: shouldMountWalletBalanceChart,
    isBalanceChartDataReadyToQuery: isWalletBalanceChartDataReadyToQuery,
    preserveChartDrivenStateWhileNotReady:
      shouldPreserveStaleWalletBalanceChart,
    resetKey: `${walletId}:${copayerId || ''}`,
  });

  const displayedFiatBalanceFormat =
    typeof balanceChartSurface.selectedBalance === 'number'
      ? formatFiatAmount(
          balanceChartSurface.selectedBalance,
          chartQuoteCurrency,
          {
            currencyDisplay: 'symbol',
          },
        )
      : fiatBalanceFormat;

  const legacyLastDayChangeRowData = useLegacyLastDayChangeRowData({
    wallets: chartWallets,
    currentFiatBalance: fullWalletObj?.balance?.fiat,
    quoteCurrency: defaultAltCurrency.isoCode,
    enabled: showPortfolioValue !== true && !hideAllBalances && showFiatBalance,
  });
  const walletHeaderChangeRowData =
    showPortfolioValue === true
      ? balanceChartSurface.changeRowData
      : legacyLastDayChangeRowData;
  const selectedChartCryptoBalance =
    balanceChartSurface.displayedAnalysisPoint?.totalCryptoBalanceFormatted;
  const selectedCryptoBalance =
    typeof balanceChartSurface.selectedBalance === 'number' &&
    typeof selectedChartCryptoBalance === 'string'
      ? formatSelectedCryptoBalance(selectedChartCryptoBalance)
      : undefined;
  const formattedCryptoBalance = `${
    selectedCryptoBalance ?? cryptoBalance
  } ${formatCurrencyAbbreviation(currencyAbbreviation)}`;
  const assetTheme = useMemo(
    () =>
      getAssetTheme({
        currencyAbbreviation,
        chain,
        tokenAddress,
      }),
    [chain, currencyAbbreviation, tokenAddress],
  );
  const coinColor = assetTheme?.coinColor;
  const chartLineColor = !coinColor
    ? undefined
    : theme.dark && coinColor === Black
    ? White
    : coinColor;
  const chartGradientBackgroundColor = assetTheme?.gradientBackgroundColor;

  const [history, setHistory] = useState<any[]>([]);
  const [groupedHistory, setGroupedHistory] = useState<any[]>([]);
  const [loadMore, setLoadMore] = useState(true);
  const [isLoading, setIsLoading] = useState<boolean>();
  const [errorLoadingTxs, setErrorLoadingTxs] = useState<boolean>();
  const [needActionPendingTxps, setNeedActionPendingTxps] = useState<any[]>([]);
  const [needActionUnsentTxps, setNeedActionUnsentTxps] = useState<any[]>([]);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const walletChartChangeRowStyle = useMemo(() => ({marginTop: 2}), []);

  const setNeedActionTxps = useCallback(
    (pendingTxps: TransactionProposal[]) => {
      const txpsPending: TransactionProposal[] = [];
      const txpsUnsent: TransactionProposal[] = [];
      const formattedPendingTxps = BuildUiFriendlyList(
        pendingTxps,
        currencyAbbreviation,
        chain,
        [],
        tokenAddress,
        walletId,
      );
      formattedPendingTxps.forEach((txp: any) => {
        const action: any = _.find(txp.actions, {
          copayerId: fullWalletObj.credentials.copayerId,
        });

        if (
          ((!action || action.type === 'failed') && txp.status === 'pending') ||
          (action && txp.status === 'accepted')
        ) {
          const target =
            fullWalletObj.credentials.n > 1 ? txpsPending : txpsUnsent;
          target.push(txp);
        }
      });
      setNeedActionPendingTxps(current =>
        current.length === 0 && txpsPending.length === 0
          ? current
          : txpsPending,
      );
      setNeedActionUnsentTxps(current =>
        current.length === 0 && txpsUnsent.length === 0 ? current : txpsUnsent,
      );
    },
    [
      chain,
      currencyAbbreviation,
      fullWalletObj.credentials.copayerId,
      fullWalletObj.credentials.n,
      tokenAddress,
      walletId,
    ],
  );

  const loadHistory = useCallback(
    async (refresh?: boolean) => {
      if ((!loadMore && !refresh) || fullWalletObj.isScanning) {
        return;
      }
      try {
        setIsLoading(!refresh);
        setErrorLoadingTxs(false);
        if (!refresh) {
          // Allow one frame for chart/list loaders to render before heavy history work.
          await sleep(0);
        }

        const [transactionHistory] = await Promise.all([
          dispatch(
            GetTransactionHistory({
              wallet: fullWalletObj,
              transactionsHistory: history,
              limit: TX_HISTORY_LIMIT,
              contactList,
              refresh,
            }),
          ),
        ]);

        if (transactionHistory) {
          let {transactions: _history, loadMore: _loadMore} =
            transactionHistory;

          if (_history?.length) {
            setHistory(_history);
            const transactionGroups = GroupTransactionHistory(_history);
            const flattenedGroups = transactionGroups.reduce(
              (allTransactions, section) => [
                ...allTransactions,
                section.title,
                ...section.data,
              ],
              [] as any[],
            );
            setGroupedHistory(flattenedGroups);
          }

          setLoadMore(_loadMore);
        }

        setIsLoading(false);
      } catch (e) {
        const errStr = e instanceof Error ? e.message : JSON.stringify(e);
        logManager.error(
          '[WalletDetails] Error loading transaction history: ' + errStr,
        );
        setLoadMore(false);
        setIsLoading(false);
        setErrorLoadingTxs(true);
      }
    },
    [history],
  );

  const debouncedLoadHistory = useMemo(
    () => debounce(loadHistory, 300, {leading: true}),
    [loadHistory],
  );

  const loadHistoryRef = useRef(debouncedLoadHistory);

  useEffect(() => {
    loadHistoryRef.current = debouncedLoadHistory;

    return () => {
      debouncedLoadHistory.cancel();
    };
  }, [debouncedLoadHistory]);

  const updateWalletStatusAndProfileBalance = async () => {
    await dispatch(startUpdateWalletStatus({key, wallet: fullWalletObj}));
    dispatch(updatePortfolioBalance());
  };

  useEffect(() => {
    dispatch(
      Analytics.track('View Wallet', {
        coin: fullWalletObj?.currencyAbbreviation,
      }),
    );
    updateWalletStatusAndProfileBalance();
    if (!skipInitializeHistory) {
      debouncedLoadHistory();
    }
  }, []);

  useEffect(() => {
    setNeedActionTxps(fullWalletObj.pendingTxps);
    const subscription = DeviceEventEmitter.addListener(
      DeviceEmitterEvents.WALLET_LOAD_HISTORY,
      (payload?: string | WalletLoadHistoryTarget) => {
        if (
          typeof payload === 'object' &&
          (payload.historyContext !== 'wallet' ||
            payload.keyId !== key.id ||
            payload.walletId !== fullWalletObj.id ||
            (payload.copayerId &&
              payload.copayerId !== fullWalletObj.credentials?.copayerId))
        ) {
          return;
        }
        loadHistoryRef.current(true);
        setNeedActionTxps(fullWalletObj.pendingTxps);
      },
    );
    return () => subscription.remove();
  }, [
    fullWalletObj.credentials?.copayerId,
    fullWalletObj.id,
    fullWalletObj.pendingTxps,
    key.id,
    setNeedActionTxps,
  ]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      DeviceEmitterEvents.SET_REFRESHING,
      val => {
        setRefreshing(!!val);
      },
    );
    return () => subscription.remove();
  }, []);

  const itemSeparatorComponent = useCallback(() => <BorderBottom />, []);

  const listFooterComponent = () => (
    <>
      {!groupedHistory?.length ? null : (
        <View style={{marginBottom: 20}}>
          <BorderBottom />
        </View>
      )}
      {isLoading ? (
        <SkeletonContainer>
          <WalletTransactionSkeletonRow />
        </SkeletonContainer>
      ) : null}
    </>
  );

  const listEmptyComponent = () => (
    <>
      {!isLoading && !errorLoadingTxs && (
        <EmptyListContainer>
          <H5>{t("It's a ghost town in here")}</H5>
          <GhostSvg style={{marginTop: 20}} />
        </EmptyListContainer>
      )}

      {!isLoading && errorLoadingTxs && (
        <EmptyListContainer>
          <H5>{t('Could not update transaction history')}</H5>
          <GhostSvg style={{marginTop: 20}} />
        </EmptyListContainer>
      )}
    </>
  );

  const goToTransactionDetails = (transaction: any) => {
    navigation.navigate('TransactionDetails', {
      keyId: key.id,
      walletId: fullWalletObj.id,
      copayerId: fullWalletObj.credentials?.copayerId,
      historyContext: 'wallet',
      transaction,
    });
  };

  const speedupTransaction = async (transaction: any) => {
    try {
      let tx: any;
      if (chain.toLowerCase() === 'eth') {
        tx = await dispatch(
          buildEthERCTokenSpeedupTx(fullWalletObj, transaction),
        );
        goToConfirm(tx);
      }

      if (currencyAbbreviation.toLowerCase() === 'btc') {
        const address = await dispatch<Promise<string>>(
          createWalletAddress({wallet: fullWalletObj, newAddress: false}),
        );

        tx = await dispatch(
          buildBtcSpeedupTx(fullWalletObj, transaction, address),
        );

        dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: t('Miner fee notice'),
            message: t(
              'Because you are speeding up this transaction, the Bitcoin miner fee () will be deducted from the total.',
              {speedupFee: tx.speedupFee, currencyAbbreviation},
            ),
            enableBackdropDismiss: true,
            actions: [
              {
                text: t('Got It'),
                action: () => {
                  goToConfirm(tx);
                },
                primary: true,
              },
            ],
          }),
        );
      }
    } catch (e) {
      switch (e) {
        case 'InsufficientFunds':
          dispatch(showBottomNotificationModal(SpeedupInsufficientFunds()));
          break;
        case 'NoInput':
          dispatch(showBottomNotificationModal(SpeedupInvalidTx()));
          break;
        default:
          dispatch(
            showBottomNotificationModal(
              CustomErrorMessage({
                errMsg: t(
                  'Error getting "Speed Up" information. Please try again later.',
                ),
              }),
            ),
          );
      }
    }
  };

  const goToConfirm = async (tx: any) => {
    try {
      const {recipient, amount} = tx;
      const {txDetails, txp: newTxp} = await dispatch(
        createProposalAndBuildTxDetails(tx),
      );

      navigation.navigate('Confirm', {
        wallet: fullWalletObj,
        recipient,
        txp: newTxp,
        txDetails,
        amount,
        speedup: true,
      });
    } catch (err: any) {
      const errorMessageConfig = await dispatch(
        handleCreateTxProposalError(err),
      );
      dispatch(
        showBottomNotificationModal({
          ...errorMessageConfig,
          enableBackdropDismiss: true,
        }),
      );
    }
  };

  const showBalanceDetailsButton = (): boolean =>
    !!fullWalletObj &&
    fullWalletObj.balance?.sat !== fullWalletObj.balance?.satSpendable;

  const viewOnBlockchain = async (withConfirmation?: boolean) => {
    const coin = fullWalletObj.currencyAbbreviation.toLowerCase();
    const chain = fullWalletObj.chain.toLowerCase();

    if (
      ['eth', 'matic', 'xrp', 'arb', 'base', 'op', 'sol'].includes(chain) ||
      IsERCToken(coin, chain)
    ) {
      let address;
      try {
        address = (await dispatch<any>(
          createWalletAddress({wallet: fullWalletObj, newAddress: false}),
        )) as string;
      } catch {
        return;
      }

      let url: string | undefined;
      if (coin === 'xrp') {
        url =
          fullWalletObj.network === 'livenet'
            ? `https://${BitpaySupportedCoins.xrp.paymentInfo.blockExplorerUrls}account/${address}`
            : `https://${BitpaySupportedCoins.xrp.paymentInfo.blockExplorerUrlsTestnet}account/${address}`;
      }
      if (SUPPORTED_VM_TOKENS.includes(chain)) {
        url =
          fullWalletObj.network === 'livenet'
            ? `https://${BitpaySupportedCoins[chain].paymentInfo.blockExplorerUrls}address/${address}`
            : `https://${BitpaySupportedCoins[chain].paymentInfo.blockExplorerUrlsTestnet}address/${address}`;
      }
      if (IsERCToken(coin, chain)) {
        url =
          fullWalletObj.network === 'livenet'
            ? `https://${BitpaySupportedCoins[chain]?.paymentInfo.blockExplorerUrls}address/${address}#tokentxns`
            : `https://${BitpaySupportedCoins[chain]?.paymentInfo.blockExplorerUrlsTestnet}address/${address}#tokentxns`;
      }

      if (url) {
        withConfirmation
          ? openPopUpConfirmation(coin, url)
          : Linking.openURL(url);
      }
    }
  };

  const openPopUpConfirmation = (coin: string, url: string): void => {
    dispatch(
      showBottomNotificationModal({
        type: 'question',
        title: t('View on blockchain'),
        message: t('ViewTxHistory', {coin: coin.toUpperCase()}),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('CONTINUE'),
            action: () => {
              Linking.openURL(url);
            },
            primary: true,
          },
          {
            text: t('GO BACK'),
            action: () => {},
          },
        ],
      }),
    );
  };

  const onPressTransaction = useMemo(
    () => (transaction: any) => {
      const {hasUnconfirmedInputs, action, isRBF} = transaction;
      const isReceived = IsReceived(action);
      const isMoved = IsMoved(action);
      const currency = currencyAbbreviation.toLowerCase();

      if (
        hasUnconfirmedInputs &&
        (isReceived || isMoved) &&
        currency === 'btc'
      ) {
        dispatch(
          showBottomNotificationModal(
            UnconfirmedInputs(() => goToTransactionDetails(transaction)),
          ),
        );
      } else if (isRBF && isReceived && currency === 'btc') {
        dispatch(
          showBottomNotificationModal(
            RbfTransaction(
              () => speedupTransaction(transaction),
              () => goToTransactionDetails(transaction),
            ),
          ),
        );
      } else if (CanSpeedupTx(transaction, currency, chain)) {
        if (chain === 'eth') {
          dispatch(
            showBottomNotificationModal(
              SpeedupEthTransaction(
                () => speedupTransaction(transaction),
                () => goToTransactionDetails(transaction),
              ),
            ),
          );
        } else {
          dispatch(
            showBottomNotificationModal(
              SpeedupTransaction(
                () => speedupTransaction(transaction),
                () => goToTransactionDetails(transaction),
              ),
            ),
          );
        }
      } else {
        goToTransactionDetails(transaction);
      }
    },
    [],
  );

  const onPressTxp = useMemo(
    () => (transaction: any) => {
      navigation.navigate('TransactionProposalDetails', {
        walletId: fullWalletObj.id,
        transactionId: transaction.id,
        keyId: key.id,
      });
    },
    [],
  );

  const onPressTxpBadge = useMemo(
    () => () => {
      navigation.navigate('TransactionProposalNotifications', {
        walletId: fullWalletObj.credentials.walletId,
      });
    },
    [],
  );

  const getBillPayIcon = (
    billPayAccounts: BillPayAccount[],
    merchantId: string,
  ): string => {
    const account = (billPayAccounts || []).find(
      acct => acct[acct.type].merchantId === merchantId,
    );
    return account ? account[account.type].merchantIcon : '';
  };

  const getTxDescriptionDetails = (key: string | undefined) =>
    key === 'moonpay' ? 'MoonPay' : undefined;

  const renderTransaction = useCallback(({item}) => {
    return (
      <TransactionRow
        icon={
          item.customData?.recipientEmail ? (
            <ContactIcon
              name={item.customData?.recipientEmail}
              size={TRANSACTION_ICON_SIZE}
              badge={<SentBadgeSvg />}
            />
          ) : (
            TransactionIcons[item.uiIcon]
          )
        }
        iconURI={
          getBillPayIcon(accounts, item.uiIconURI) ||
          getGiftCardIcons(supportedCardMap)[item.uiIconURI]
        }
        description={item.uiDescription}
        details={getTxDescriptionDetails(item.customData?.service)}
        time={item.uiTime}
        value={item.uiValue}
        onPressTransaction={() => onPressTransaction(item)}
      />
    );
  }, []);

  const renderTxp = useCallback(
    (items: any[]) => {
      return (
        <View style={{paddingTop: 20}}>
          {items.slice(0, 5).map((item, index) => (
            <TransactionProposalRow
              key={`${item.id}-${index}`}
              icon={TransactionIcons[item.uiIcon]}
              creator={item.uiCreator}
              time={item.uiTime}
              value={item.uiValue}
              message={item.message}
              onPressTransaction={() => onPressTxp(item)}
              recipientCount={item.recipientCount}
              toAddress={item.toAddress}
              tokenAddress={item.tokenAddress}
              chain={item.chain}
              contactList={contactList}
            />
          ))}
          {items.length > 5 && (
            <TouchableOpacity
              style={{paddingTop: 10}}
              onPress={onPressTxpBadge}>
              <LinkText>{t('Show more')}</LinkText>
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [needActionPendingTxps, needActionUnsentTxps],
  );

  const protocolName = getProtocolName(chain, network);
  const showEvmGasWalletBadge =
    !!fullWalletObj?.credentials?.token &&
    IsERCToken(
      String(currencyAbbreviation || '').toLowerCase(),
      String(chain || '').toLowerCase(),
    );
  const showActivatedBadge =
    ['xrp'].includes(fullWalletObj?.currencyAbbreviation) &&
    Number(fullWalletObj?.balance?.cryptoConfirmedLocked) >= 10;
  const showThresholdBadge =
    !IsShared(fullWalletObj) && isTSSKey(key) && !!fullWalletObj.tssMetadata;
  const showSpendableRow = !hideAllBalances && showBalanceDetailsButton();
  const hasBottomMetadataRow =
    (!!walletType && !showEvmGasWalletBadge) ||
    showThresholdBadge ||
    showActivatedBadge;
  const hasTopMetadataBadges =
    !!protocolName || showSpendableRow || hasBottomMetadataRow;
  const walletChartPreContent = useMemo(() => {
    if (!hasTopMetadataBadges) {
      return null;
    }

    return (
      <>
        {protocolName ? (
          <NetworkBadgeRow>
            {showEvmGasWalletBadge && walletType ? (
              <NetworkBadgeContainer>
                {walletType.icon ? (
                  <IconContainer>{walletType.icon}</IconContainer>
                ) : null}
                <TypeText>{walletType.title}</TypeText>
              </NetworkBadgeContainer>
            ) : null}
            <NetworkBadgeContainer>
              <IconContainer>
                <Icons.Network />
              </IconContainer>
              <TypeText>{protocolName}</TypeText>
            </NetworkBadgeContainer>
            {IsShared(fullWalletObj) ? (
              <NetworkBadgeContainer>
                <IconContainer>
                  <MultisigIcon
                    width={15}
                    height={15}
                    color={theme.dark ? White : Action}
                  />
                </IconContainer>
                <TypeText>
                  Multisig {fullWalletObj.m}/{fullWalletObj.n}
                </TypeText>
              </NetworkBadgeContainer>
            ) : null}
            {['xrp', 'sol'].includes(fullWalletObj?.currencyAbbreviation) ? (
              <TouchableOpacity
                onPress={() => setShowBalanceDetailsModal(true)}>
                <InfoSvg />
              </TouchableOpacity>
            ) : null}
          </NetworkBadgeRow>
        ) : null}
        {showSpendableRow ? (
          <TouchableRow onPress={() => setShowBalanceDetailsModal(true)}>
            <TimerSvg
              width={28}
              height={15}
              fill={theme.dark ? White : Black}
            />
            <Small>
              <Text style={{fontWeight: 'bold'}}>
                {cryptoSpendableBalance}{' '}
                {formatCurrencyAbbreviation(currencyAbbreviation)}
              </Text>
              {showFiatBalance && <Text> ({fiatSpendableBalanceFormat})</Text>}
            </Small>
          </TouchableRow>
        ) : null}
        {hasBottomMetadataRow ? (
          <Row>
            {walletType && !showEvmGasWalletBadge && (
              <TypeContainer>
                {walletType.icon ? (
                  <IconContainer>{walletType.icon}</IconContainer>
                ) : null}
                <TypeText>{walletType.title}</TypeText>
              </TypeContainer>
            )}
            {showThresholdBadge ? (
              <ThresholdBadge
                m={fullWalletObj.tssMetadata!.m}
                n={fullWalletObj.tssMetadata!.n}
                size={'list'}
                style={{marginTop: 8}}
              />
            ) : null}
            {showActivatedBadge ? (
              <TypeContainer>
                <TypeText>{t('Activated')}</TypeText>
              </TypeContainer>
            ) : null}
          </Row>
        ) : null}
      </>
    );
  }, [
    cryptoSpendableBalance,
    currencyAbbreviation,
    fiatSpendableBalanceFormat,
    fullWalletObj,
    hasBottomMetadataRow,
    hasTopMetadataBadges,
    protocolName,
    showActivatedBadge,
    showEvmGasWalletBadge,
    showFiatBalance,
    showSpendableRow,
    showThresholdBadge,
    t,
    theme.dark,
    walletType,
  ]);
  const canShowWalletHeaderExtras =
    !hideAllBalances && !fullWalletObj.isScanning;
  const shouldRenderWalletChart =
    canShowWalletHeaderExtras && shouldMountWalletBalanceChart;
  const shouldRenderWalletHeaderSupplement =
    canShowWalletHeaderExtras &&
    (!!walletChartPreContent ||
      !!walletHeaderChangeRowData ||
      shouldRenderWalletChart);

  return (
    <WalletDetailsContainer>
      <FlashList
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={
          <>
            <HeaderContainer>
              <BalanceContainer>
                <TouchableOpacity
                  onLongPress={() => {
                    dispatch(toggleHideAllBalances());
                  }}>
                  {!fullWalletObj.isScanning ? (
                    <Row>
                      {!hideAllBalances ? (
                        <Balance
                          scale={shouldScale(
                            showFiatBalance
                              ? displayedFiatBalanceFormat
                              : formattedCryptoBalance,
                          )}>
                          {showFiatBalance
                            ? displayedFiatBalanceFormat
                            : formattedCryptoBalance}
                        </Balance>
                      ) : (
                        <H2>****</H2>
                      )}
                    </Row>
                  ) : (
                    <View style={{padding: 12}}>
                      <Row>
                        <H5>{t('[Scanning Addresses]')}</H5>
                      </Row>
                      <Row>
                        <H5>{t('Please wait...')}</H5>
                      </Row>
                    </View>
                  )}
                  <CryptoBalanceRow>
                    {!hideAllBalances &&
                      !fullWalletObj.isScanning &&
                      showFiatBalance && (
                        <CryptoBalanceText>
                          {formattedCryptoBalance}
                        </CryptoBalanceText>
                      )}
                  </CryptoBalanceRow>
                </TouchableOpacity>

                {shouldRenderWalletHeaderSupplement ? (
                  <FullWidthBalanceChartContainer>
                    <BalanceHeaderSupplement
                      changeRowData={walletHeaderChangeRowData}
                      content={walletChartPreContent}
                      contentTopMargin={12}
                      changeRowStyle={walletChartChangeRowStyle}
                      reserveChangeRowSpace={shouldRenderWalletChart}
                    />
                    {shouldRenderWalletChart ? (
                      <BalanceHistoryChart
                        wallets={chartableWallets}
                        quoteCurrency={chartQuoteCurrency}
                        rates={rates}
                        lineColor={chartLineColor}
                        gradientStartColor={chartGradientBackgroundColor}
                        showLoaderWhenNoSnapshots={shouldShowWalletChartLoader}
                        renderZeroBalanceWhenNoSnapshots={
                          shouldRenderZeroWalletBalanceChart
                        }
                        isBalanceChartDataReadyToQuery={
                          isWalletBalanceChartDataReadyToQuery
                        }
                        preserveVisibleSeriesWhileNotReady={
                          shouldPreserveStaleWalletBalanceChart
                        }
                        showChangeRow={false}
                        onSelectedBalanceChange={
                          balanceChartSurface.chartCallbacks
                            .onSelectedBalanceChange
                        }
                        onDisplayedAnalysisPointChange={
                          balanceChartSurface.chartCallbacks
                            .onDisplayedAnalysisPointChange
                        }
                        onChangeRowData={
                          balanceChartSurface.chartCallbacks.onChangeRowData
                        }
                        timeframeSelectorWidth={timeframeSelectorWidth}
                      />
                    ) : null}
                  </FullWidthBalanceChartContainer>
                ) : null}
              </BalanceContainer>

              {fullWalletObj ? (
                <LinkingButtons
                  buy={{
                    hide:
                      fullWalletObj.network === 'testnet' ||
                      !isCoinSupportedToBuy(
                        fullWalletObj.currencyAbbreviation,
                        fullWalletObj.chain,
                        locationData?.countryShortCode || 'US',
                      ),
                    cta: () => {
                      dispatch(
                        Analytics.track('Clicked Buy Crypto', {
                          context: 'WalletDetails',
                          coin: fullWalletObj.currencyAbbreviation,
                          chain: fullWalletObj.chain || '',
                        }),
                      );
                      navigation.navigate(
                        ExternalServicesScreens.ROOT_BUY_AND_SELL,
                        {
                          context: 'buyCrypto',
                          fromWallet: fullWalletObj,
                        },
                      );
                    },
                  }}
                  sell={{
                    hide:
                      !fullWalletObj.balance.sat ||
                      (fullWalletObj.network === 'testnet' &&
                        fullWalletObj.currencyAbbreviation !== 'eth' &&
                        fullWalletObj.chain !== 'eth') ||
                      !isCoinSupportedToSell(
                        fullWalletObj.currencyAbbreviation,
                        fullWalletObj.chain,
                        locationData?.countryShortCode || 'US',
                      ),
                    cta: () => {
                      dispatch(
                        Analytics.track('Clicked Sell Crypto', {
                          context: 'WalletDetails',
                          coin: fullWalletObj.currencyAbbreviation,
                          chain: fullWalletObj.chain || '',
                        }),
                      );
                      navigation.navigate(
                        ExternalServicesScreens.ROOT_BUY_AND_SELL,
                        {
                          context: 'sellCrypto',
                          fromWallet: fullWalletObj,
                        },
                      );
                    },
                  }}
                  swap={{
                    hide:
                      fullWalletObj.network === 'testnet' ||
                      !isCoinSupportedToSwap(
                        fullWalletObj.currencyAbbreviation,
                        fullWalletObj.chain,
                      ),
                    cta: () => {
                      dispatch(
                        Analytics.track('Clicked Swap Crypto', {
                          context: 'WalletDetails',
                          coin: fullWalletObj.currencyAbbreviation,
                          chain: fullWalletObj.chain || '',
                        }),
                      );
                      navigation.navigate('SwapCryptoRoot', {
                        selectedWallet: fullWalletObj,
                      });
                    },
                  }}
                  receive={{
                    cta: () => {
                      dispatch(
                        Analytics.track('Clicked Receive', {
                          context: 'WalletDetails',
                          coin: fullWalletObj.currencyAbbreviation,
                          chain: fullWalletObj.chain || '',
                        }),
                      );
                      setShowReceiveAddressBottomModal(true);
                    },
                  }}
                  send={{
                    hide: !fullWalletObj.balance.sat,
                    cta: () => {
                      dispatch(
                        Analytics.track('Clicked Send', {
                          context: 'WalletDetails',
                          coin: fullWalletObj.currencyAbbreviation,
                          chain: fullWalletObj.chain || '',
                        }),
                      );
                      navigation.navigate('SendTo', {
                        keyId: key.id,
                        walletId: fullWalletObj.id,
                        copayerId: fullWalletObj.credentials?.copayerId,
                      });
                    },
                  }}
                />
              ) : null}
            </HeaderContainer>
            {pendingTxps && pendingTxps[0] ? (
              <>
                <TransactionSectionHeaderContainer>
                  <H5>
                    {fullWalletObj.credentials.n > 1
                      ? t('Pending Proposals')
                      : t('Unsent Transactions')}
                  </H5>
                  <ProposalBadgeContainer onPress={onPressTxpBadge}>
                    <ProposalBadge>{pendingTxps.length}</ProposalBadge>
                  </ProposalBadgeContainer>
                </TransactionSectionHeaderContainer>
                {fullWalletObj.credentials.n > 1 &&
                needActionPendingTxps.length > 0
                  ? renderTxp(needActionPendingTxps)
                  : needActionUnsentTxps.length > 0
                  ? renderTxp(needActionUnsentTxps)
                  : null}
              </>
            ) : null}

            {Number(cryptoLockedBalance) > 0 ? (
              <LockedBalanceContainer
                onPress={() => setShowBalanceDetailsModal(true)}>
                <HeadContainer>
                  <Description numberOfLines={1} ellipsizeMode={'tail'}>
                    {t('Total Locked Balance')}
                  </Description>
                </HeadContainer>

                <TailContainer>
                  <Value>
                    {cryptoLockedBalance}{' '}
                    {formatCurrencyAbbreviation(currencyAbbreviation)}
                  </Value>
                  <Fiat>
                    {network === 'testnet'
                      ? t('Test Only - No Value')
                      : fiatLockedBalanceFormat}
                  </Fiat>
                </TailContainer>
              </LockedBalanceContainer>
            ) : null}
          </>
        }
        data={groupedHistory}
        keyExtractor={transactionKeyExtractor}
        renderItem={({item}) => {
          if (typeof item === 'string') {
            return (
              <TransactionSectionHeaderContainer>
                <H5>{item}</H5>
              </TransactionSectionHeaderContainer>
            );
          } else {
            return renderTransaction({item});
          }
        }}
        ItemSeparatorComponent={itemSeparatorComponent}
        ListFooterComponent={listFooterComponent}
        onMomentumScrollBegin={() => setIsScrolling(true)}
        onMomentumScrollEnd={() => setIsScrolling(false)}
        onEndReached={() => {
          if (isScrolling) {
            debouncedLoadHistory();
          }
        }}
        stickyHeaderIndices={
          groupedHistory
            .map((item, index) => {
              if (typeof item === 'string') {
                return index;
              } else {
                return null;
              }
            })
            .filter(item => item !== null) as number[]
        }
        getItemType={item =>
          typeof item === 'string' ? 'sectionHeader' : 'row'
        }
        onEndReachedThreshold={0.3}
        ListEmptyComponent={listEmptyComponent}
        estimatedItemSize={TRANSACTION_ROW_HEIGHT}
      />

      <OptionsSheet
        isVisible={showWalletOptions}
        closeModal={() => setShowWalletOptions(false)}
        title={t('WalletOptions')}
        options={getAssetOptions()}
      />

      {fullWalletObj ? (
        <BalanceDetailsModal
          isVisible={showBalanceDetailsModal}
          closeModal={() => setShowBalanceDetailsModal(false)}
          wallet={uiFormattedWallet}
        />
      ) : null}

      {fullWalletObj ? (
        <ReceiveAddress
          isVisible={showReceiveAddressBottomModal}
          closeModal={() => setShowReceiveAddressBottomModal(false)}
          wallet={fullWalletObj}
        />
      ) : null}
      {showArchaxBanner && <ArchaxFooter />}
    </WalletDetailsContainer>
  );
};

export default WalletDetails;
