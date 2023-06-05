import {
  useNavigation,
  useScrollToTop,
  useTheme,
} from '@react-navigation/native';
import {each} from 'lodash';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {RefreshControl, ScrollView} from 'react-native';
import {SupportedCoinsOptions} from '../../../constants/SupportedCurrencyOptions';
import {
  setShowKeyMigrationFailureModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {requestBrazeContentRefresh} from '../../../store/app/app.effects';
import {getPriceHistory, startGetRates} from '../../../store/wallet/effects';
import {startUpdateAllKeyAndWalletStatus} from '../../../store/wallet/effects/status/status';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {SlateDark, White} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';
import {
  useAppDispatch,
  useAppSelector,
} from '../../../utils/hooks';
import {BalanceUpdateError} from '../../wallet/components/ErrorMessages';
import Crypto from './components/Crypto';
import ExchangeRatesList, {
  ExchangeRateItemProps,
} from './components/exchange-rates/ExchangeRatesList';
import ProfileButton from './components/HeaderProfileButton';
import ScanButton from './components/HeaderScanButton';
import HomeSection from './components/HomeSection';
import LinkingButtons from './components/LinkingButtons';
import PortfolioBalance from './components/PortfolioBalance';
import {HeaderContainer, HomeContainer} from './components/Styled';
import KeyMigrationFailureModal from './components/KeyMigrationFailureModal';
import {ProposalBadgeContainer} from '../../../components/styled/Containers';
import {ProposalBadge} from '../../../components/styled/Text';
import {
  receiveCrypto,
  sendCrypto,
} from '../../../store/wallet/effects/send/send';

const HomeRoot = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const wallets = Object.values(keys).flatMap(k => k.wallets);
  let pendingTxps: any = [];
  each(wallets, x => {
    if (x.pendingTxps) {
      pendingTxps = pendingTxps.concat(x.pendingTxps);
    }
  });
  const {
    appIsLoading,
    defaultAltCurrency,
    keyMigrationFailure,
    keyMigrationFailureModalHasBeenShown,
    showPortfolioValue,
  } = useAppSelector(({APP}) => APP);
  const hasKeys = Object.values(keys).length;

  // Exchange Rates
  const priceHistory = useAppSelector(({RATE}) => RATE.priceHistory);
  const memoizedExchangeRates: Array<ExchangeRateItemProps> = useMemo(
    () =>
      priceHistory.reduce((ratesList, history) => {
        const option = SupportedCoinsOptions.find(
          ({currencyAbbreviation}) => currencyAbbreviation === history.coin,
        );

        if (option) {
          const {id, img, currencyName, currencyAbbreviation} = option;

          ratesList.push({
            id,
            img,
            currencyName,
            currencyAbbreviation,
            chain: currencyAbbreviation.toLowerCase(), // currencyAbbreviation same as chain for rates coins
            average: +history.percentChange,
            currentPrice: +history.prices[history.prices.length - 1].price,
            priceDisplay: history.priceDisplay,
          });
        }

        return ratesList;
      }, [] as ExchangeRateItemProps[]),
    [priceHistory],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      dispatch(getPriceHistory(defaultAltCurrency.isoCode));
      await dispatch(startGetRates({force: true}));
      await Promise.all([
        dispatch(startUpdateAllKeyAndWalletStatus({force: true})),
        dispatch(requestBrazeContentRefresh()),
        sleep(1000),
      ]);
      dispatch(updatePortfolioBalance());
    } catch (err) {
      dispatch(showBottomNotificationModal(BalanceUpdateError()));
    }
    setRefreshing(false);
  };

  const onPressTxpBadge = useMemo(
    () => () => {
      navigation.navigate('Wallet', {
        screen: 'TransactionProposalNotifications',
        params: {},
      });
    },
    [],
  );

  useEffect(() => {
    if (keyMigrationFailure && !keyMigrationFailureModalHasBeenShown) {
      dispatch(setShowKeyMigrationFailureModal(true));
    }
  }, [dispatch, keyMigrationFailure, keyMigrationFailureModalHasBeenShown]);

  const scrollViewRef = useRef<ScrollView>(null);
  useScrollToTop(scrollViewRef);

  return (
    <HomeContainer>
      {appIsLoading ? null : (
        <ScrollView
          ref={scrollViewRef}
          refreshControl={
            <RefreshControl
              tintColor={theme.dark ? White : SlateDark}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }>
          <HeaderContainer>
            {pendingTxps.length ? (
              <ProposalBadgeContainer onPress={onPressTxpBadge}>
                <ProposalBadge>{pendingTxps.length}</ProposalBadge>
              </ProposalBadgeContainer>
            ) : null}
          </HeaderContainer>

          {/* ////////////////////////////// PORTFOLIO BALANCE */}
          {showPortfolioValue ? (
            <HomeSection style={{marginTop: 5}} slimContainer={true}>
              <PortfolioBalance />
            </HomeSection>
          ) : null}

          {/* ////////////////////////////// CTA BUY SWAP RECEIVE SEND BUTTONS */}
          {hasKeys ? (
            <HomeSection style={{marginBottom: 25}}>
              <LinkingButtons
                receive={{
                  cta: () => dispatch(receiveCrypto(navigation, 'HomeRoot')),
                }}
                send={{
                  cta: () => dispatch(sendCrypto('HomeRoot')),
                }}
              />
            </HomeSection>
          ) : null}

          {/* ////////////////////////////// CRYPTO */}
          <HomeSection slimContainer={true}>
            <Crypto />
          </HomeSection>

          {/* ////////////////////////////// EXCHANGE RATES */}
          {memoizedExchangeRates.length ? (
            <HomeSection title={t('Exchange Rates')} label="1D">
              <ExchangeRatesList
                items={memoizedExchangeRates}
                defaultAltCurrencyIsoCode={defaultAltCurrency.isoCode}
              />
            </HomeSection>
          ) : null}

        </ScrollView>
      )}
      <KeyMigrationFailureModal />
    </HomeContainer>
  );
};

export default HomeRoot;
