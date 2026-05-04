import {
  NavigationProp,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import React, {ReactElement, useEffect, useRef, useState} from 'react';
import Carousel from 'react-native-reanimated-carousel';
import styled from 'styled-components/native';
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
  setImportProgress,
  setPendingImport,
  showBottomNotificationModal,
  showDecryptPasswordModal,
} from '../../../../store/app/app.actions';
import {
  checkEncryptedKeysForEddsaMigration,
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
import type {
  BalanceSnapshot,
  PortfolioPopulateStatus,
} from '../../../../store/portfolio/portfolio.models';
import type {
  FiatRateSeriesCache,
  Rates,
} from '../../../../store/rate/rate.models';
import {
  CarouselItemContainer,
  HomeSectionTitle,
  SectionHeaderContainer,
} from './Styled';
import {Animated, ScrollView, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import CustomizeSvg from './CustomizeSvg';
import haptic from '../../../../components/haptic-feedback/haptic';
import Button from '../../../../components/button/Button';
import CoinbaseBalanceCard from '../../../coinbase/components/CoinbaseBalanceCard';
import {
  HOME_CARD_HEIGHT,
  HOME_CARD_WIDTH,
  IMPORT_CARD_HEIGHT,
} from '../../../../components/home-card/HomeCard';
import {
  getPortfolioPnlChangeForTimeframeFromPortfolioSnapshots,
  getLegacyPercentageDifferenceFromTotals,
  getKeyLastDayPercentageDifference,
  getPercentageDifferenceFromPercentRatio,
  getQuoteCurrency,
  hasSnapshotsBeforeMsForWallets,
  hasSnapshotsForWallets,
  isPopulateLoadingForWallets,
} from '../../../../utils/portfolio/assets';
import {COINBASE_ENV} from '../../../../api/coinbase/coinbase.constants';
import {WrongPasswordError} from '../../../wallet/components/ErrorMessages';
import {useTranslation} from 'react-i18next';
import {t} from 'i18next';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import AddSvg from './AddSvg';
import {isTSSKey} from '../../../../store/wallet/effects/tss-send/tss-send';
import {logManager} from '../../../../managers/LogManager';
import {WalletScreens} from '../../../../navigation/wallet/WalletGroup';
import {IsVMChain} from '../../../../store/wallet/utils/currency';
import ListKeySkeleton from './cards/ListKeySkeleton';
import CarouselKeySkeleton from './cards/CarouselKeySkeleton';
//import {ConnectLedgerNanoXCard} from './cards/ConnectLedgerNanoX';

const CryptoContainer = styled.View`
  background: ${({theme}) => theme.colors.background};
  padding: 5px 0 0px;
`;

const CarouselContainer = styled.View`
  margin-top: 28px;
`;

const Row = styled.View`
  flex-direction: row;
`;

const ListViewContainer = styled.View`
  padding: 20px 0 12px 0;
`;

const ButtonContainer = styled.View`
  padding: 20px 0;
`;

const NoKeysSectionHeaderContainer = styled(SectionHeaderContainer)`
  margin-bottom: 0px;
`;

const MountFade = ({children}: {children: React.ReactNode}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [opacity]);
  return <Animated.View style={{opacity}}>{children}</Animated.View>;
};

const NoKeysButtonWrapper = styled.View`
  margin-bottom: 15px;
`;

const CryptoSectionHeaderContainer = styled(SectionHeaderContainer)`
  margin-bottom: -15px;
  margin-top: 0px;
`;

const CryptoHeaderRow = styled(Row)`
  align-items: center;
  width: 100%;
  margin-bottom: 0px;
`;

const CryptoHeaderTitle = styled(HomeSectionTitle)`
  flex-grow: 1;
`;

const CryptoHeaderActions = styled.View`
  flex-direction: row;
  gap: 8px;
`;

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

export const createHomeCardList = ({
  navigation,
  keys,
  dispatch,
  linkedCoinbase,
  homeCarouselConfig,
  homeCarouselLayoutType,
  hideKeyBalance,
  portfolioSnapshotsByWalletId,
  portfolioQuoteCurrency,
  populateStatus,
  rates,
  lastDayRates,
  fiatRateSeriesCache,
  defaultAltCurrencyIsoCode,
  context,
  onPress,
  currency,
  cardHeight,
}: {
  navigation: any;
  keys: Key[];
  dispatch: AppDispatch;
  linkedCoinbase: boolean;
  homeCarouselConfig: HomeCarouselConfig[];
  homeCarouselLayoutType: HomeCarouselLayoutType;
  hideKeyBalance: boolean;
  portfolioSnapshotsByWalletId?: {
    [walletId: string]: BalanceSnapshot[] | undefined;
  };
  portfolioQuoteCurrency?: string;
  populateStatus?: PortfolioPopulateStatus;
  rates?: Rates;
  lastDayRates?: Rates;
  fiatRateSeriesCache?: FiatRateSeriesCache;
  defaultAltCurrencyIsoCode?: string;
  context?: 'keySelector';
  onPress?: (currency: any, selectedKey: Key) => any;
  currency?: any;
  cardHeight?: number;
}) => {
  let list: {id: string; component: ReactElement}[] = [];
  const defaults: {id: string; component: ReactElement}[] = [];
  const hasKeys = keys.length;
  const hasGiftCards = false;
  const hasCoinbase = linkedCoinbase;
  const quoteCurrency = getQuoteCurrency({
    portfolioQuoteCurrency,
    defaultAltCurrencyIsoCode,
  });

  if (hasKeys) {
    const walletCards = keys.map(key => {
      let {
        wallets,
        totalBalance = 0,
        totalBalanceLastDay = 0,
        backupComplete,
      } = key;

      wallets = wallets.filter(
        wallet => !wallet.hideWallet && !wallet.hideWalletByAccount,
      );

      const isKeyPopulateLoading = isPopulateLoadingForWallets({
        populateStatus,
        wallets,
      });

      const legacyPercentageDifference =
        getLegacyPercentageDifferenceFromTotals({
          totalBalance,
          totalBalanceLastDay,
        });

      const portfolioPercentageDifference = (() => {
        if (!portfolioSnapshotsByWalletId) {
          return null;
        }

        const pnl = getPortfolioPnlChangeForTimeframeFromPortfolioSnapshots({
          snapshotsByWalletId: portfolioSnapshotsByWalletId,
          wallets,
          quoteCurrency,
          timeframe: '1D',
          rates,
          lastDayRates,
          fiatRateSeriesCache,
        });

        if (!pnl.available) {
          return null;
        }

        return getPercentageDifferenceFromPercentRatio(pnl.percentRatio);
      })();

      const hasKeySnapshots = portfolioSnapshotsByWalletId
        ? hasSnapshotsForWallets({
            snapshotsByWalletId: portfolioSnapshotsByWalletId,
            wallets,
          })
        : false;

      const hasKeySnapshotsBeforePopulateStarted = (() => {
        const startedAt = populateStatus?.startedAt;
        if (!populateStatus?.inProgress || typeof startedAt !== 'number') {
          return true;
        }
        if (!portfolioSnapshotsByWalletId) {
          return false;
        }
        return hasSnapshotsBeforeMsForWallets({
          snapshotsByWalletId: portfolioSnapshotsByWalletId,
          wallets,
          cutoffMs: startedAt,
        });
      })();

      const rawPercentageDifference = getKeyLastDayPercentageDifference({
        totalBalance,
        hasSnapshots: hasKeySnapshots,
        hasSnapshotsBeforePopulateStarted: hasKeySnapshotsBeforePopulateStarted,
        isPopulateLoading: isKeyPopulateLoading,
        legacyPercentageDifference,
        portfolioPercentageDifference,
      });
      const percentageDifference =
        totalBalance > 0 ? rawPercentageDifference : null;

      const fullWalletObj = key?.wallets?.[0];
      const hasPendingTssSession = fullWalletObj?.pendingTssSession;

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
            cardHeight={cardHeight}
            onPress={
              onPress
                ? () => {
                    haptic('soft');
                    onPress(currency, key);
                  }
                : () => {
                    haptic('soft');
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
                          });
                        } else {
                          navigation.navigate(WalletScreens.WALLET_DETAILS, {
                            key,
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

interface CryptoProps {
  scrollRef?: React.RefObject<ScrollView | null>;
}

const Crypto = ({scrollRef}: CryptoProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const skeletonRef = useRef<View>(null);
  const dispatch = useAppDispatch();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const linkedCoinbase = useAppSelector(
    ({COINBASE}) => !!COINBASE.token[COINBASE_ENV],
  );
  const portfolio = useAppSelector(({PORTFOLIO}) => PORTFOLIO);
  const {rates, fiatRateSeriesCache} = useAppSelector(({RATE}) => RATE);
  const lastDayRates = useAppSelector(({RATE}) => RATE.lastDayRates);
  const homeCarouselLayoutType = useAppSelector(
    ({APP}) => APP.homeCarouselLayoutType,
  );
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const importMessage = useAppSelector(({APP}) => APP.importBannerMessage);
  const pendingImport = useAppSelector(({APP}) => APP.pendingImport);
  const importProgress = useAppSelector(({APP}) => APP.importProgress);
  const hasKeys = Object.values(keys).length;

  const skeletonOpacity = useRef(
    new Animated.Value(importMessage ? 1 : 0),
  ).current;
  const [skeletonVisible, setSkeletonVisible] = useState(!!importMessage);
  const prevImportMessage = useRef(importMessage);

  useEffect(() => {
    const wasShowing = !!prevImportMessage.current;
    const isShowing = !!importMessage;
    prevImportMessage.current = importMessage;

    if (!wasShowing && isShowing) {
      setSkeletonVisible(true);
      skeletonOpacity.setValue(0);
      Animated.timing(skeletonOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (wasShowing && !isShowing) {
      Animated.timing(skeletonOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setSkeletonVisible(false));
    }
  }, [importMessage, skeletonOpacity]);

  useEffect(() => {
    if (
      !isFocused ||
      (!skeletonVisible && !pendingImport) ||
      homeCarouselLayoutType !== 'listView' ||
      !scrollRef?.current ||
      !skeletonRef.current
    ) {
      return;
    }
    const timer = setTimeout(() => {
      if (!scrollRef.current || !skeletonRef.current) {
        return;
      }
      (scrollRef.current as any).measure(
        (_x: number, _y: number, _w: number, scrollViewHeight: number) => {
          skeletonRef.current?.measureLayout(
            scrollRef.current as any,
            (
              _sx: number,
              skeletonY: number,
              _sw: number,
              skeletonHeight: number,
            ) => {
              const scrollY =
                skeletonY + skeletonHeight - scrollViewHeight + 20;
              scrollRef.current?.scrollTo({
                y: Math.max(0, scrollY),
                animated: true,
              });
            },
            () => {},
          );
        },
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [
    isFocused,
    skeletonVisible,
    pendingImport,
    homeCarouselLayoutType,
    scrollRef,
  ]);
  const activeCardHeight =
    skeletonVisible || pendingImport ? IMPORT_CARD_HEIGHT : HOME_CARD_HEIGHT;

  const [cardsList, setCardsList] = useState(
    createHomeCardList({
      navigation,
      keys: Object.values(keys),
      dispatch,
      linkedCoinbase: false,
      homeCarouselConfig: homeCarouselConfig || [],
      homeCarouselLayoutType,
      hideKeyBalance: hideAllBalances,
      portfolioSnapshotsByWalletId: portfolio?.snapshotsByWalletId,
      portfolioQuoteCurrency: portfolio?.quoteCurrency,
      populateStatus: portfolio?.populateStatus,
      rates,
      lastDayRates,
      fiatRateSeriesCache,
      defaultAltCurrencyIsoCode: defaultAltCurrency?.isoCode,
      cardHeight: activeCardHeight,
    }),
  );

  useEffect(() => {
    setCardsList(
      createHomeCardList({
        navigation,
        keys: Object.values(keys),
        dispatch,
        linkedCoinbase,
        homeCarouselConfig: homeCarouselConfig || [],
        homeCarouselLayoutType,
        hideKeyBalance: hideAllBalances,
        portfolioSnapshotsByWalletId: portfolio?.snapshotsByWalletId,
        portfolioQuoteCurrency: portfolio?.quoteCurrency,
        populateStatus: portfolio?.populateStatus,
        rates,
        lastDayRates,
        fiatRateSeriesCache,
        defaultAltCurrencyIsoCode: defaultAltCurrency?.isoCode,
        cardHeight: activeCardHeight,
      }),
    );
  }, [
    navigation,
    keys,
    dispatch,
    linkedCoinbase,
    homeCarouselConfig,
    homeCarouselLayoutType,
    hideAllBalances,
    portfolio?.quoteCurrency,
    portfolio?.populateStatus,
    portfolio?.snapshotsByWalletId,
    rates,
    lastDayRates,
    fiatRateSeriesCache,
    defaultAltCurrency?.isoCode,
    activeCardHeight,
  ]);

  if (!hasKeys && !linkedCoinbase && !importMessage && !pendingImport) {
    return (
      <CryptoContainer>
        <NoKeysSectionHeaderContainer>
          <Column>
            <HomeSectionTitle>{t('Your Crypto')}</HomeSectionTitle>
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
                  {t('Create, import or join a shared wallet')}
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
                    : t('Connect your Coinbase account')}
                </Button>
              </NoKeysButtonWrapper>
              {/*<Button
                buttonStyle={'secondary'}
                onPress={() => {
                  dispatch(AppActions.importLedgerModalToggled(true));
                }}>
                {t('Connect your Ledger Nano X')}
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
          <CryptoHeaderTitle>{t('Your Crypto')}</CryptoHeaderTitle>
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
            key={`carousel-${skeletonVisible || !!pendingImport}`}
            loop={false}
            autoFillData={false}
            vertical={false}
            style={{width: WIDTH}}
            width={HOME_CARD_WIDTH + 16}
            height={activeCardHeight + 20}
            autoPlay={false}
            data={[
              ...(skeletonVisible
                ? [
                    {
                      id: '__import_skeleton__',
                      component: (
                        <Animated.View style={{opacity: skeletonOpacity}}>
                          <CarouselKeySkeleton
                            message={importMessage}
                            progress={importProgress}
                            cardHeight={activeCardHeight}
                          />
                        </Animated.View>
                      ),
                    },
                  ]
                : pendingImport
                ? [
                    {
                      id: '__import_skeleton__',
                      component: (
                        <CarouselKeySkeleton
                          failed
                          progress={importProgress}
                          cardHeight={activeCardHeight}
                          onRetry={() => {
                            dispatch(setPendingImport(false));
                            dispatch(setImportProgress(0));
                            navigation.navigate(WalletScreens.IMPORT, {});
                          }}
                        />
                      ),
                    },
                  ]
                : []),
              ...cardsList.list,
            ]}
            scrollAnimationDuration={0}
            renderItem={_renderItem}
            enabled={true}
          />
        </CarouselContainer>
      ) : (
        <ListViewContainer>
          {cardsList.list.map(data => {
            return <MountFade key={data.id}>{data.component}</MountFade>;
          })}
          {skeletonVisible || pendingImport ? (
            <View ref={skeletonRef}>
              {skeletonVisible ? (
                <Animated.View style={{opacity: skeletonOpacity}}>
                  <ListKeySkeleton
                    message={importMessage}
                    progress={importProgress}
                  />
                </Animated.View>
              ) : (
                <ListKeySkeleton
                  failed
                  progress={importProgress}
                  onRetry={() => {
                    dispatch(setPendingImport(false));
                    dispatch(setImportProgress(0));
                    navigation.navigate(WalletScreens.IMPORT, {});
                  }}
                />
              )}
            </View>
          ) : null}
        </ListViewContainer>
      )}
    </CryptoContainer>
  );
};

export default Crypto;
