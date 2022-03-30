import {useNavigation, useTheme} from '@react-navigation/native';
import React, {useEffect, useMemo, useState} from 'react';
import {RefreshControl, ScrollView} from 'react-native';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {startGetRates} from '../../../store/wallet/effects';
import {startUpdateAllKeyAndWalletStatus} from '../../../store/wallet/effects/status/status';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {SlateDark, White} from '../../../styles/colors';
import {isDoMore, isFeaturedMerchant, isQuickLink} from '../../../utils/braze';
import {sleep} from '../../../utils/helper-methods';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import OnboardingFinishModal from '../../onboarding/components/OnboardingFinishModal';
import {BalanceUpdateError} from '../../wallet/components/ErrorMessages';
import AdvertisementsList from './components/advertisements/AdvertisementsList';
import MockAdvertisements from './components/advertisements/MockAdvertisements';
import CardsCarousel from './components/CardsCarousel';
import ExchangeRatesList, {
  ExchangeRateItemProps,
} from './components/exchange-rates/ExchangeRatesList';
import ProfileButton from './components/HeaderProfileButton';
import ScanButton from './components/HeaderScanButton';
import HomeRow from './components/HomeRow';
import LinkingButtons from './components/LinkingButtons';
import MockOffers from './components/offers/MockOffers';
import OffersCarousel from './components/offers/OffersCarousel';
import PortfolioBalance from './components/PortfolioBalance';
import MockQuickLinks from './components/quick-links/MockQuickLinks';
import QuickLinksCarousel from './components/quick-links/QuickLinksCarousel';
import {BaseText} from '../../../components/styled/Text';
import {STATIC_CONTENT_CARDS_ENABLED} from '../../../constants/config';

const HeaderContainer = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  margin: 10px ${ScreenGutter};
`;

export const HeaderButtonContainer = styled.View`
  margin-left: ${ScreenGutter};
`;

const HomeContainer = styled.SafeAreaView`
  flex: 1;
`;

export const HomeLink = styled(BaseText)`
  font-weight: 500;
  font-size: 14px;
  color: ${({theme}) => theme.colors.link};
  text-decoration: ${({theme: {dark}}) => (dark ? 'underline' : 'none')};
  text-decoration-color: ${White};
`;

export const SectionHeaderContainer = styled.View<{justifyContent?: string}>`
  flex-direction: row;
  margin: 10px ${ScreenGutter} 0;
  justify-content: ${({justifyContent}) => justifyContent || 'flex-start'};
`;

const HomeRoot = () => {
  const dispatch = useAppDispatch();
  // const onboardingCompleted = useAppSelector(
  //   ({APP}: RootState) => APP.onboardingCompleted,
  // );
  // const showOnboardingFinishModal = async () => {
  //   await sleep(300);
  //   dispatch(AppActions.showOnboardingFinishModal());
  // };
  // useEffect(() => {
  //   if (!onboardingCompleted) {
  //     showOnboardingFinishModal();
  //   }
  // }, []);

  const navigation = useNavigation();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const allContentCards = useAppSelector(({APP}) => APP.brazeContentCards);

  // Featured Merchants ("Offers")
  const memoizedOffers = useMemo(() => {
    const featuredMerchants = allContentCards.filter(isFeaturedMerchant);

    if (STATIC_CONTENT_CARDS_ENABLED && !featuredMerchants.length) {
      return MockOffers;
    }

    return featuredMerchants;
  }, [allContentCards]);

  // Advertisements ("Do More")
  const memoizedAdvertisements = useMemo(() => {
    const advertisements = allContentCards.filter(isDoMore);

    if (STATIC_CONTENT_CARDS_ENABLED && !advertisements.length) {
      return MockAdvertisements;
    }

    return advertisements;
  }, [allContentCards]);

  // Exchange Rates
  const priceHistory = useAppSelector(({WALLET}) => WALLET.priceHistory);
  const memoizedExchangeRates: Array<ExchangeRateItemProps> = useMemo(
    () =>
      priceHistory.reduce((ratesList, history) => {
        const option = SupportedCurrencyOptions.find(
          ({id}) => id === history.coin,
        );

        if (option) {
          const {id, img, currencyName, currencyAbbreviation} = option;

          ratesList.push({
            id,
            img,
            currencyName,
            currencyAbbreviation,
            average: +history.percentChange,
            currentPrice: +history.prices[0].price,
            priceDisplay: history.priceDisplay,
          });
        }

        return ratesList;
      }, [] as ExchangeRateItemProps[]),
    [priceHistory],
  );

  // Quick Links
  const memoizedQuickLinks = useMemo(() => {
    const quickLinks = allContentCards.filter(isQuickLink);

    if (STATIC_CONTENT_CARDS_ENABLED && !quickLinks.length) {
      return MockQuickLinks;
    }

    return quickLinks;
  }, [allContentCards]);

  const showPortfolioValue = useAppSelector(({APP}) => APP.showPortfolioValue);

  useEffect(() => {
    return navigation.addListener('focus', () => {
      dispatch(updatePortfolioBalance());
    });
  }, [dispatch, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(startGetRates());
      await Promise.all([
        dispatch(startUpdateAllKeyAndWalletStatus()),
        sleep(1000),
      ]);
      dispatch(updatePortfolioBalance());
    } catch (err) {
      dispatch(showBottomNotificationModal(BalanceUpdateError));
    }
    setRefreshing(false);
  };

  return (
    <HomeContainer>
      <ScrollView
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }>
        <HeaderContainer>
          <ScanButton />
          <ProfileButton />
        </HeaderContainer>

        {/* ////////////////////////////// PORTFOLIO BALANCE */}
        {showPortfolioValue ? (
          <HomeRow title="Portfolio Balance" slimHeader>
            <PortfolioBalance />
          </HomeRow>
        ) : null}

        {/* ////////////////////////////// CARDS CAROUSEL */}
        <CardsCarousel />

        {/* ////////////////////////////// CTA BUY SWAP RECEIVE SEND BUTTONS */}
        <HomeRow>
          <LinkingButtons
            receive={{
              cta: () =>
                navigation.navigate('Wallet', {
                  screen: 'GlobalSelect',
                  params: {context: 'receive'},
                }),
            }}
            send={{
              cta: () =>
                navigation.navigate('Wallet', {
                  screen: 'GlobalSelect',
                  params: {context: 'send'},
                }),
            }}
          />
        </HomeRow>

        {/* ////////////////////////////// LIMITED TIME OFFERS */}
        {memoizedOffers.length ? (
          <HomeRow
            title="Limited Time Offers"
            action="See all"
            onActionPress={() => console.log('TODO: see all offers')}>
            <OffersCarousel contentCards={memoizedOffers} />
          </HomeRow>
        ) : null}

        {/* ////////////////////////////// ADVERTISEMENTS */}
        {memoizedAdvertisements.length ? (
          <HomeRow title="Do More">
            <AdvertisementsList contentCards={memoizedAdvertisements} />
          </HomeRow>
        ) : null}

        {/* ////////////////////////////// EXCHANGE RATES */}
        {memoizedExchangeRates.length ? (
          <HomeRow title="Exchange Rates">
            <ExchangeRatesList items={memoizedExchangeRates} />
          </HomeRow>
        ) : null}

        {/* ////////////////////////////// QUICK LINKS - Leave feedback etc */}
        {memoizedQuickLinks.length ? (
          <HomeRow title="Quick Links">
            <QuickLinksCarousel contentCards={memoizedQuickLinks} />
          </HomeRow>
        ) : null}
      </ScrollView>

      <OnboardingFinishModal />
    </HomeContainer>
  );
};

export default HomeRoot;
