import {
  NavigationProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import React, {ReactElement, useCallback, useMemo, useRef} from 'react';
import Carousel from 'react-native-reanimated-carousel';
import {useTheme} from '../../../../contexts';
import {
  ActiveOpacity,
  Column,
  WIDTH,
} from '../../../../components/styled/Containers';
import {Key} from '../../../../store/wallet/wallet.models';
import ConnectCoinbase from './cards/ConnectCoinbase';
import CreateWallet from './cards/CreateWallet';
import WalletCardComponent from './Wallet';
import {BottomNotificationConfig} from '../../../../components/modal/bottom-notification/BottomNotification';
import {
  dismissDecryptPasswordModal,
  showBottomNotificationModal,
  showDecryptPasswordModal,
} from '../../../../store/app/app.actions';
import {selectShowPortfolioValue} from '../../../../store/app/app.selectors';
import {selectHasCompletedFullPortfolioPopulate} from '../../../../store/portfolio/portfolio.selectors';
import {
  checkEncryptedKeysForEddsaMigration,
  getLastDayTimestampStartOfHourMs,
  getMnemonic,
  sleep,
} from '../../../../utils/helper-methods';
import _ from 'lodash';
import {
  AppDispatch,
  useAppDispatch,
  useAppSelector,
} from '../../../../utils/hooks';
import {
  HomeCarouselConfig,
  HomeCarouselLayoutType,
} from '../../../../store/app/app.models';
import type {PortfolioPopulateStatus} from '../../../../store/portfolio/portfolio.models';
import type {Rates} from '../../../../store/rate/rate.models';
import {
  CarouselItemContainer,
  HomeSectionTitle,
  SectionHeaderContainer,
} from './Styled';
import {StyleSheet, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import CustomizeSvg from './CustomizeSvg';
import haptic from '../../../../components/haptic-feedback/haptic';
import Button from '../../../../components/button/Button';
import CoinbaseBalanceCard from '../../../coinbase/components/CoinbaseBalanceCard';
import {
  HOME_CARD_HEIGHT,
  HOME_CARD_WIDTH,
} from '../../../../components/home-card/HomeCard';
import {
  buildLegacyLastDayRateRequestsForWallets,
  getLegacyLastDayPnlForWallets,
  getLegacyPercentageDifferenceFromTotals,
  getKeyLastDayPercentageDifference,
  getVisibleWalletsForKey,
  isPopulateLoadingForWallets,
} from '../../../../utils/portfolio/assets';
import usePortfolioKeyPercentages from '../../../../portfolio/ui/hooks/usePortfolioKeyPercentages';
import useRuntimeFiatRateSeriesCache from '../../../../portfolio/ui/hooks/useRuntimeFiatRateSeriesCache';
import {HISTORIC_RATES_CACHE_DURATION} from '../../../../constants/wallet';
import {COINBASE_ENV} from '../../../../api/coinbase/coinbase.constants';
import {WrongPasswordError} from '../../../wallet/components/ErrorMessages';
import {useTranslation} from 'react-i18next';
import {t} from 'i18next';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import AddSvg from './AddSvg';
import {isTSSKey} from '../../../../store/wallet/effects/tss-send/tss-send';
import {IsShared} from '../../../../store/wallet/effects/transactions/transactions';
import {logManager} from '../../../../managers/LogManager';
import {WalletScreens} from '../../../../navigation/wallet/WalletGroup';
import {IsSVMChain, IsVMChain} from '../../../../store/wallet/utils/currency';
import {scheduleAfterTransitionAndIdle} from '../../../../utils/scheduleAfterInteractionsAndFrames';
import {performanceLog} from '../../../../utils/performanceDebug';
import {getSinglePreloadCandidate} from '../../../../utils/navigationPreload';
//import {ConnectLedgerNanoXCard} from './cards/ConnectLedgerNanoX';

const styles = StyleSheet.create({
  cryptoContainer: {
    paddingTop: 5,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  },
  carouselContainer: {
    marginTop: 28,
  },
  row: {
    flexDirection: 'row',
  },
  listViewContainer: {
    paddingTop: 20,
    paddingRight: 0,
    paddingBottom: 12,
    paddingLeft: 0,
  },
  buttonContainer: {
    paddingVertical: 20,
    paddingHorizontal: 0,
  },
  noKeysSectionHeaderContainer: {
    marginBottom: 0,
  },
  noKeysButtonWrapper: {
    marginBottom: 15,
  },
  cryptoSectionHeaderContainer: {
    marginBottom: -15,
    marginTop: 0,
  },
  cryptoHeaderRow: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 0,
  },
  cryptoHeaderTitle: {
    flexGrow: 1,
  },
  cryptoHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
});

const EMPTY_BACKGROUND_RATES: Rates = {};
const EMPTY_BACKGROUND_KEYS: Record<string, Key> = {};

const canPreloadWalletDestination = (key: Key): boolean =>
  !!key.backupComplete &&
  !!key.wallets?.[0] &&
  !key.wallets[0].pendingTssSession;

const CryptoContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.cryptoContainer,
        {backgroundColor: theme.colors.background},
      ]}>
      {children}
    </View>
  );
};

const CarouselContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.carouselContainer}>{children}</View>;

const ListViewContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.listViewContainer}>{children}</View>;

const ButtonContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.buttonContainer}>{children}</View>;

const NoKeysSectionHeaderContainer: React.FC<
  React.ComponentProps<typeof SectionHeaderContainer>
> = ({style, ...rest}) => (
  <SectionHeaderContainer
    style={[styles.noKeysSectionHeaderContainer, style]}
    {...rest}
  />
);

const NoKeysButtonWrapper: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.noKeysButtonWrapper}>{children}</View>;

const CryptoSectionHeaderContainer: React.FC<
  React.ComponentProps<typeof SectionHeaderContainer>
> = ({style, ...rest}) => (
  <SectionHeaderContainer
    style={[styles.cryptoSectionHeaderContainer, style]}
    {...rest}
  />
);

const CryptoHeaderRow: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={[styles.row, styles.cryptoHeaderRow]}>{children}</View>;

const CryptoHeaderTitle: React.FC<
  React.ComponentProps<typeof HomeSectionTitle>
> = ({style, ...rest}) => (
  <HomeSectionTitle style={[styles.cryptoHeaderTitle, style]} {...rest} />
);

const CryptoHeaderActions: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.cryptoHeaderActions}>{children}</View>;

const _renderItem = ({item}: {item: {id: string; component: ReactElement}}) => {
  return <CarouselItemContainer>{item.component}</CarouselItemContainer>;
};

export const keyBackupRequired = (
  key: Key,
  navigation: NavigationProp<any>,
  dispatch: AppDispatch,
  context?: string,
): BottomNotificationConfig => {
  return {
    type: 'error',
    title: t('Key backup required'),
    message: t('To continue you will need to back up your key.'),
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('Back up Key'),
        action: async () => {
          if (key.properties!.mnemonicEncrypted) {
            await sleep(500);
            dispatch(
              showDecryptPasswordModal({
                onSubmitHandler: async (encryptPassword: string) => {
                  try {
                    dispatch(
                      checkEncryptedKeysForEddsaMigration(key, encryptPassword),
                    );
                    const decryptedKey = key.methods!.get(encryptPassword);
                    await dispatch(dismissDecryptPasswordModal());
                    await sleep(300);
                    if (isTSSKey(key)) {
                      navigation.navigate(WalletScreens.EXPORT_TSS_WALLET, {
                        keyId: key.id,
                        decryptPassword: encryptPassword,
                        context: 'backupExistingTSSKey',
                      });
                      return;
                    }
                    navigation.navigate('RecoveryPhrase', {
                      keyId: key.id,
                      words: decryptedKey.mnemonic.trim().split(' '),
                      key,
                      context,
                    });
                  } catch (e) {
                    const eStr =
                      e instanceof Error ? e.message : JSON.stringify(e);
                    logManager.error(`Decrypt Error: ${eStr}`);
                    await dispatch(dismissDecryptPasswordModal());
                    await sleep(1000); // Wait to close Decrypt Password modal
                    dispatch(showBottomNotificationModal(WrongPasswordError()));
                  }
                },
              }),
            );
          } else if (isTSSKey(key)) {
            navigation.navigate(WalletScreens.EXPORT_TSS_WALLET, {
              keyId: key.id,
              context: 'backupExistingTSSKey',
            });
            return;
          } else {
            navigation.navigate('RecoveryPhrase', {
              keyId: key.id,
              words: getMnemonic(key),
              key,
              context,
            });
          }
        },
        primary: true,
      },
      {
        text: t('maybe later'),
        action: () => {},
        primary: false,
      },
    ],
  };
};

const getLegacyPercentageDifferenceForKey = (args: {
  key: Key;
  legacyPercentageDifferenceByKey?: Record<string, number | null | undefined>;
}): number | null => {
  const {key, legacyPercentageDifferenceByKey} = args;
  if (
    legacyPercentageDifferenceByKey &&
    Object.prototype.hasOwnProperty.call(
      legacyPercentageDifferenceByKey,
      key.id,
    )
  ) {
    return legacyPercentageDifferenceByKey[key.id] ?? null;
  }

  return getLegacyPercentageDifferenceFromTotals({
    totalBalance: key.totalBalance || 0,
    totalBalanceLastDay: key.totalBalanceLastDay || 0,
  });
};

export const createHomeCardList = ({
  navigation,
  keys,
  dispatch,
  linkedCoinbase,
  homeCarouselConfig,
  homeCarouselLayoutType,
  hideKeyBalance,
  legacyPercentageDifferenceByKey,
  portfolioPercentageDifferenceByKey,
  populateStatus,
  context,
  onPress,
  onDestinationPress,
  currency,
}: {
  navigation: any;
  keys: Key[];
  dispatch: AppDispatch;
  linkedCoinbase: boolean;
  homeCarouselConfig: HomeCarouselConfig[];
  homeCarouselLayoutType: HomeCarouselLayoutType;
  hideKeyBalance: boolean;
  legacyPercentageDifferenceByKey?: Record<string, number | null | undefined>;
  portfolioPercentageDifferenceByKey?: Record<
    string,
    number | null | undefined
  >;
  populateStatus?: PortfolioPopulateStatus;
  context?: 'keySelector';
  onPress?: (currency: any, selectedKey: Key) => any;
  onDestinationPress?: (key: Key) => void;
  currency?: any;
}) => {
  let list: {id: string; component: ReactElement}[] = [];
  const defaults: {id: string; component: ReactElement}[] = [];
  const hasKeys = keys.length;
  const hasGiftCards = false;
  const hasCoinbase = linkedCoinbase;

  if (hasKeys) {
    const walletCards = keys.map(key => {
      let {wallets, totalBalance = 0, backupComplete} = key;

      wallets = getVisibleWalletsForKey(key);

      const isKeyPopulateLoading = isPopulateLoadingForWallets({
        populateStatus,
        wallets,
      });

      const legacyPercentageDifference = getLegacyPercentageDifferenceForKey({
        key,
        legacyPercentageDifferenceByKey,
      });

      const portfolioPercentageDifference =
        portfolioPercentageDifferenceByKey?.[key.id] ?? null;

      const rawPercentageDifference = getKeyLastDayPercentageDifference({
        totalBalance,
        hasSnapshots: portfolioPercentageDifference !== null,
        hasSnapshotsBeforePopulateStarted:
          portfolioPercentageDifference !== null,
        isPopulateLoading: isKeyPopulateLoading,
        legacyPercentageDifference,
        portfolioPercentageDifference,
      });
      const percentageDifference =
        totalBalance > 0 ? rawPercentageDifference : null;

      const fullWalletObj = key?.wallets?.[0];
      const hasPendingTssSession = fullWalletObj?.pendingTssSession;
      const tssMetadata = key.wallets?.find(w => w.tssKeyId)?.tssMetadata;
      const isMultisig = !!key.wallets?.some(w => IsShared(w));

      return {
        id: key.id,
        component: (
          <WalletCardComponent
            layout={homeCarouselLayoutType}
            keyName={key.keyName}
            hideKeyBalance={hideKeyBalance}
            wallets={wallets}
            totalBalance={totalBalance}
            percentageDifference={percentageDifference}
            needsBackup={!backupComplete}
            context={context}
            pendingTssSession={hasPendingTssSession}
            tssMetadata={tssMetadata}
            isMultisig={isMultisig}
            onPress={
              onPress
                ? () => {
                    haptic('soft');
                    onPress(currency, key);
                  }
                : () => {
                    haptic('soft');
                    onDestinationPress?.(key);
                    if (backupComplete || hasPendingTssSession) {
                      if (hasPendingTssSession && key?.tssSession) {
                        const {isCreator} = key.tssSession;
                        if (isCreator) {
                          navigation.navigate(WalletScreens.INVITE_COSIGNERS, {
                            keyId: key.id,
                          });
                        } else {
                          navigation.navigate(WalletScreens.JOIN_TSS_WALLET, {
                            keyId: key.id,
                          });
                        }
                      } else if (isTSSKey(key)) {
                        if (IsVMChain(fullWalletObj.credentials.chain)) {
                          navigation.navigate(WalletScreens.ACCOUNT_DETAILS, {
                            keyId: key.id,
                            selectedAccountAddress:
                              fullWalletObj.receiveAddress,
                            isSvmAccount: IsSVMChain(
                              fullWalletObj.credentials.chain,
                            ),
                          });
                        } else {
                          navigation.navigate(WalletScreens.WALLET_DETAILS, {
                            walletId: fullWalletObj.credentials.walletId,
                            copayerId: fullWalletObj.credentials.copayerId,
                          });
                        }
                      } else {
                        navigation.navigate(WalletScreens.KEY_OVERVIEW, {
                          id: key.id,
                        });
                      }
                    } else {
                      dispatch(
                        showBottomNotificationModal(
                          keyBackupRequired(key, navigation, dispatch),
                        ),
                      );
                    }
                  }
            }
          />
        ),
      };
    });

    list.push(...walletCards);
  }

  defaults.push({id: 'createWallet', component: <CreateWallet />});

  // defaults.push({id: 'connectLedger', component: <ConnectLedgerNanoXCard />});

  if (hasCoinbase) {
    list.push({
      id: 'coinbaseBalanceCard',
      component: <CoinbaseBalanceCard layout={homeCarouselLayoutType} />,
    });
  } else {
    defaults.push({id: 'connectToCoinbase', component: <ConnectCoinbase />});
  }

  if (hasGiftCards) {
    // TODO
  }

  list = list.filter(
    item =>
      homeCarouselConfig.find(configItem => configItem.id === item.id)?.show,
  );

  const order = homeCarouselConfig.map(item => item.id);

  return {
    list: [..._.sortBy(list, item => _.indexOf(order, item.id))],
    defaults,
  };
};

type CryptoProps = {
  active?: boolean;
};

const Crypto = ({active = true}: CryptoProps) => {
  const {t: translate} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const subscribedKeys = useAppSelector(({WALLET}) =>
    active ? WALLET.keys : EMPTY_BACKGROUND_KEYS,
  ) as Record<string, Key>;
  const lastActiveKeysRef = useRef(subscribedKeys);
  if (active) {
    lastActiveKeysRef.current = subscribedKeys;
  }
  const keys = lastActiveKeysRef.current;
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const linkedCoinbase = useAppSelector(
    ({COINBASE}) => !!COINBASE.token[COINBASE_ENV],
  );
  const subscribedPopulateStatus = useAppSelector(({PORTFOLIO}) =>
    active ? PORTFOLIO.populateStatus : undefined,
  );
  const lastActivePopulateStatusRef = useRef(subscribedPopulateStatus);
  if (active) {
    lastActivePopulateStatusRef.current = subscribedPopulateStatus;
  }
  const populateStatus = lastActivePopulateStatusRef.current;
  const homeCarouselLayoutType = useAppSelector(
    ({APP}) => APP.homeCarouselLayoutType,
  );
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const showPortfolioValue = useAppSelector(selectShowPortfolioValue);
  const subscribedRates = useAppSelector(({RATE}) =>
    active ? RATE.rates : EMPTY_BACKGROUND_RATES,
  );
  const lastActiveRatesRef = useRef<Rates>(subscribedRates);
  if (active) {
    lastActiveRatesRef.current = subscribedRates;
  }
  const rates = lastActiveRatesRef.current;
  const subscribedHasCompletedFullPortfolioPopulate = useAppSelector(state =>
    active ? selectHasCompletedFullPortfolioPopulate(state) : false,
  );
  const lastActiveHasCompletedFullPortfolioPopulateRef = useRef(
    subscribedHasCompletedFullPortfolioPopulate,
  );
  if (active) {
    lastActiveHasCompletedFullPortfolioPopulateRef.current =
      subscribedHasCompletedFullPortfolioPopulate;
  }
  const hasCompletedFullPortfolioPopulate =
    lastActiveHasCompletedFullPortfolioPopulateRef.current;
  const portfolioChartsRequested = showPortfolioValue === true;
  const portfolioChartsEnabled =
    active && portfolioChartsRequested && hasCompletedFullPortfolioPopulate;
  const keyList = useMemo(() => Object.values(keys), [keys]);
  const hasKeys = keyList.length;
  const legacyKeyPercentagesEnabled =
    active && !portfolioChartsRequested && !hideAllBalances;
  const legacyKeyRateRequests = useMemo(() => {
    if (!legacyKeyPercentagesEnabled) {
      return [];
    }

    return buildLegacyLastDayRateRequestsForWallets({
      wallets: keyList.flatMap(key => getVisibleWalletsForKey(key)),
    });
  }, [keyList, legacyKeyPercentagesEnabled]);
  const legacyKeyBaselineTimestampRef = useRef({
    quoteCurrency: '',
    timestampMs: 0,
  });
  if (
    legacyKeyBaselineTimestampRef.current.quoteCurrency !==
    defaultAltCurrency.isoCode
  ) {
    legacyKeyBaselineTimestampRef.current = {
      quoteCurrency: defaultAltCurrency.isoCode,
      timestampMs: getLastDayTimestampStartOfHourMs(),
    };
  }
  const legacyKeyBaselineTimestampMs =
    legacyKeyBaselineTimestampRef.current.timestampMs;
  const {cache: legacyKeyFiatRateSeriesCache} = useRuntimeFiatRateSeriesCache({
    quoteCurrency: defaultAltCurrency.isoCode,
    requests: legacyKeyRateRequests,
    maxAgeMs: HISTORIC_RATES_CACHE_DURATION * 1000,
    enabled: legacyKeyPercentagesEnabled && legacyKeyRateRequests.length > 0,
    clearOnRequestChange: true,
  });
  const legacyPercentageDifferenceByKey = useMemo(() => {
    if (!legacyKeyPercentagesEnabled) {
      return undefined;
    }

    const out: Record<string, number | null> = {};
    for (const key of keyList) {
      if (!key?.id) {
        continue;
      }

      const legacyPnl = getLegacyLastDayPnlForWallets({
        wallets: getVisibleWalletsForKey(key),
        currentFiatBalance: key.totalBalance,
        rates,
        fiatRateSeriesCache: legacyKeyFiatRateSeriesCache,
        quoteCurrency: defaultAltCurrency.isoCode,
        baselineTimestampMs: legacyKeyBaselineTimestampMs,
      });
      out[key.id] = legacyPnl?.percent ?? null;
    }

    return out;
  }, [
    defaultAltCurrency.isoCode,
    keyList,
    legacyKeyBaselineTimestampMs,
    legacyKeyFiatRateSeriesCache,
    legacyKeyPercentagesEnabled,
    rates,
  ]);
  const portfolioPercentageDifferenceByKey = usePortfolioKeyPercentages({
    keys: keyList,
    enabled: portfolioChartsEnabled,
  });
  const lastLegacyPercentageDifferenceByKeyRef = useRef(
    legacyPercentageDifferenceByKey,
  );
  const lastPortfolioPercentageDifferenceByKeyRef = useRef(
    portfolioPercentageDifferenceByKey,
  );
  if (active) {
    lastLegacyPercentageDifferenceByKeyRef.current =
      legacyPercentageDifferenceByKey;
    lastPortfolioPercentageDifferenceByKeyRef.current =
      portfolioPercentageDifferenceByKey;
  }
  const visibleLegacyPercentageDifferenceByKey = active
    ? legacyPercentageDifferenceByKey
    : lastLegacyPercentageDifferenceByKeyRef.current;
  const visiblePortfolioPercentageDifferenceByKey = portfolioChartsRequested
    ? active
      ? portfolioPercentageDifferenceByKey
      : lastPortfolioPercentageDifferenceByKeyRef.current
    : undefined;
  const portfolioPopulateStatus =
    portfolioChartsRequested && hasCompletedFullPortfolioPopulate
      ? populateStatus
      : undefined;
  const preloadedDestinationRef = useRef<string | undefined>(undefined);
  const destinationPreloadTaskRef = useRef<
    ReturnType<typeof scheduleAfterTransitionAndIdle> | undefined
  >(undefined);
  const cancelDestinationPreload = useCallback(() => {
    destinationPreloadTaskRef.current?.cancel();
    destinationPreloadTaskRef.current = undefined;
  }, []);
  const preloadWalletDestination = useCallback(
    (key: Key) => {
      if (typeof (navigation as any).preload !== 'function') {
        return;
      }

      const fullWalletObj = key.wallets?.[0];
      if (!canPreloadWalletDestination(key) || !fullWalletObj) {
        return;
      }

      if (isTSSKey(key)) {
        if (IsVMChain(fullWalletObj.credentials.chain)) {
          if (!fullWalletObj.receiveAddress) {
            return;
          }

          const preloadIdentity = `account:${key.id}:${fullWalletObj.receiveAddress}`;
          if (preloadedDestinationRef.current === preloadIdentity) {
            return;
          }

          preloadedDestinationRef.current = preloadIdentity;
          performanceLog('[PERF-PRELOAD] AccountDetails start source:Home');
          (navigation as NavigationProp<any>).preload(
            WalletScreens.ACCOUNT_DETAILS,
            {
              keyId: key.id,
              selectedAccountAddress: fullWalletObj.receiveAddress,
              isSvmAccount: IsSVMChain(fullWalletObj.credentials.chain),
              _preloadContent: true,
            },
          );
          return;
        }

        const walletId = fullWalletObj.credentials.walletId;
        const copayerId = fullWalletObj.credentials.copayerId;
        const preloadIdentity = `wallet:${walletId}:${copayerId || ''}`;
        if (preloadedDestinationRef.current === preloadIdentity) {
          return;
        }

        preloadedDestinationRef.current = preloadIdentity;
        performanceLog('[PERF-PRELOAD] WalletDetails start source:Home');
        (navigation as NavigationProp<any>).preload(
          WalletScreens.WALLET_DETAILS,
          {
            walletId,
            copayerId,
            _preloadContent: true,
          },
        );
        return;
      }

      const preloadIdentity = `key:${key.id}`;
      if (preloadedDestinationRef.current === preloadIdentity) {
        return;
      }

      preloadedDestinationRef.current = preloadIdentity;
      performanceLog('[PERF-PRELOAD] KeyOverview start source:Home');
      (navigation as NavigationProp<any>).preload(WalletScreens.KEY_OVERVIEW, {
        id: key.id,
        _preloadContent: true,
      });
    },
    [navigation],
  );
  const keyListRef = useRef(keyList);
  keyListRef.current = keyList;
  const singlePreloadableKeyId = useMemo(
    () => getSinglePreloadCandidate(keyList, canPreloadWalletDestination)?.id,
    [keyList],
  );

  useFocusEffect(
    useCallback(() => {
      preloadedDestinationRef.current = undefined;

      if (!active || !singlePreloadableKeyId) {
        return;
      }

      const preloadTask = scheduleAfterTransitionAndIdle({
        navigation: navigation as any,
        transitionFallbackMs: 800,
        idleTimeoutMs: 1200,
        callback: signal => {
          const keyToPreload = keyListRef.current.find(
            key => key.id === singlePreloadableKeyId,
          );
          if (!signal.aborted && keyToPreload) {
            preloadWalletDestination(keyToPreload);
          }
        },
      });
      destinationPreloadTaskRef.current = preloadTask;

      return () => {
        preloadTask.cancel();
        if (destinationPreloadTaskRef.current === preloadTask) {
          destinationPreloadTaskRef.current = undefined;
        }
      };
    }, [active, navigation, preloadWalletDestination, singlePreloadableKeyId]),
  );

  const cardsList = useMemo(
    () =>
      createHomeCardList({
        navigation,
        keys: keyList,
        dispatch,
        linkedCoinbase,
        homeCarouselConfig: homeCarouselConfig || [],
        homeCarouselLayoutType,
        hideKeyBalance: hideAllBalances,
        legacyPercentageDifferenceByKey: visibleLegacyPercentageDifferenceByKey,
        portfolioPercentageDifferenceByKey:
          visiblePortfolioPercentageDifferenceByKey,
        populateStatus: portfolioPopulateStatus,
        onDestinationPress: cancelDestinationPreload,
      }),
    [
      navigation,
      dispatch,
      linkedCoinbase,
      homeCarouselConfig,
      homeCarouselLayoutType,
      hideAllBalances,
      keyList,
      cancelDestinationPreload,
      visibleLegacyPercentageDifferenceByKey,
      portfolioPopulateStatus,
      visiblePortfolioPercentageDifferenceByKey,
    ],
  );

  if (!hasKeys && !linkedCoinbase) {
    return (
      <CryptoContainer>
        <NoKeysSectionHeaderContainer>
          <Column>
            <HomeSectionTitle>{translate('Your Crypto')}</HomeSectionTitle>
            <ButtonContainer>
              <NoKeysButtonWrapper>
                <Button
                  onPress={() => {
                    dispatch(
                      Analytics.track('Clicked create, import or join', {
                        context: 'NoKeysCryptoContainer',
                      }),
                    );
                    navigation.navigate('CreationOptions');
                  }}>
                  {translate('Create, import or join a shared wallet')}
                </Button>
              </NoKeysButtonWrapper>
              <NoKeysButtonWrapper>
                <Button
                  buttonStyle={'secondary'}
                  onPress={() => {
                    dispatch(
                      Analytics.track('Clicked Connect Coinbase', {
                        context: 'NoKeysCryptoContainer',
                      }),
                    );
                    navigation.navigate('CoinbaseRoot');
                  }}>
                  {linkedCoinbase
                    ? 'Coinbase'
                    : translate('Connect your Coinbase account')}
                </Button>
              </NoKeysButtonWrapper>
              {/*<Button
                buttonStyle={'secondary'}
                onPress={() => {
                  dispatch(AppActions.importLedgerModalToggled(true));
                }}>
                {translate('Connect your Ledger Nano X')}
                </Button> */}
            </ButtonContainer>
          </Column>
        </NoKeysSectionHeaderContainer>
      </CryptoContainer>
    );
  }

  return (
    <CryptoContainer>
      <CryptoSectionHeaderContainer>
        <CryptoHeaderRow>
          <CryptoHeaderTitle>{translate('Your Crypto')}</CryptoHeaderTitle>
          <CryptoHeaderActions>
            <TouchableOpacity
              activeOpacity={ActiveOpacity}
              testID="my-crypto-add-button"
              accessibilityLabel="Add crypto wallet"
              onPress={() => {
                haptic('soft');
                navigation.navigate('CreationOptions');
              }}>
              <AddSvg width={40} height={40} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={ActiveOpacity}
              testID="my-crypto-customize-button"
              accessibilityLabel="Customize home"
              onPress={() => {
                haptic('soft');
                // Apply SettingsDetails config so that the custom header is used
                navigation.navigate('SettingsDetails', {
                  initialRoute: 'Customize Home',
                } as any);
              }}>
              <CustomizeSvg width={40} height={40} />
            </TouchableOpacity>
          </CryptoHeaderActions>
        </CryptoHeaderRow>
      </CryptoSectionHeaderContainer>
      {/* ////////////////////////////// CAROUSEL/LISTVIEW */}
      {homeCarouselLayoutType === 'carousel' ? (
        <CarouselContainer>
          <Carousel
            loop={false}
            autoFillData={false}
            vertical={false}
            style={{width: WIDTH}}
            width={HOME_CARD_WIDTH + 16}
            height={HOME_CARD_HEIGHT + 20}
            autoPlay={false}
            data={cardsList.list}
            scrollAnimationDuration={0}
            renderItem={_renderItem}
            enabled={true}
          />
        </CarouselContainer>
      ) : (
        <ListViewContainer>
          {cardsList.list.map(data => {
            return <View key={data.id}>{data.component}</View>;
          })}
        </ListViewContainer>
      )}
    </CryptoContainer>
  );
};

export default React.memo(Crypto);
