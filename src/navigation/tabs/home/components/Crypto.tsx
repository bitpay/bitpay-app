import {NavigationProp, useNavigation} from '@react-navigation/native';
import React, {ReactElement, useEffect, useState} from 'react';
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
import {View} from 'react-native';
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
import {WalletScreens} from '../../../../navigation/wallet/WalletGroup';
import {IsVMChain} from '../../../../store/wallet/utils/currency';
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
                    navigation.navigate('RecoveryPhrase', {
                      keyId: key.id,
                      words: decryptedKey.mnemonic.trim().split(' '),
                      key,
                      context,
                    });
                  } catch (e) {
                    console.log(`Decrypt Error: ${e}`);
                    await dispatch(dismissDecryptPasswordModal());
                    await sleep(1000); // Wait to close Decrypt Password modal
                    dispatch(showBottomNotificationModal(WrongPasswordError()));
                  }
                },
              }),
            );
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
            onPress={
              onPress
                ? () => {
                    haptic('soft');
                    onPress(currency, key);
                  }
                : () => {
                    haptic('soft');
                    if (backupComplete) {
                      const fullWalletObj = key?.wallets?.[0];
                      if (fullWalletObj?.pendingTssSession && key?.tssSession) {
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

const Crypto = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
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
  const hasKeys = Object.values(keys).length;
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
  ]);

  if (!hasKeys && !linkedCoinbase) {
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
              onPress={() => {
                haptic('soft');
                navigation.navigate('CreationOptions');
              }}>
              <AddSvg width={40} height={40} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={ActiveOpacity}
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

export default Crypto;
