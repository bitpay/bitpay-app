import React, {useEffect} from 'react';
import {Image, TouchableOpacity} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation, useTheme} from '@react-navigation/native';
import {RootState} from '../../../store';
import {PriceHistory} from '../../../store/wallet/wallet.models';

import styled from 'styled-components/native';
import {BaseText} from '../../../components/styled/Text';
import {SlateDark, White, Action} from '../../../styles/colors';

import haptic from '../../../components/haptic-feedback/haptic';
import PortfolioBalance from './components/PortfolioBalance';
import CardsCarousel from './components/CardsCarousel';
import LinkingButtons from './components/LinkingButtons';
import {AssetSelectionOptions} from '../../../constants/AssetSelectionOptions';
import ExchangeRatesSlides, {
  ExchangeRateProps,
} from '../../../components/exchange-rate/ExchangeRatesSlides';
import QuickLinksSlides from '../../../components/quick-links/QuickLinksSlides';
import OffersSlides from '../../../components/offer/OfferSlides';
import {ScreenGutter} from '../../../components/styled/Containers';
import AdvertisementCard from '../../../components/advertisement/AdvertisementCard';
import {AdvertisementList} from '../../../components/advertisement/advertisement';
import {OfferItems} from '../../../components/offer/offer';
import {AppActions} from '../../../store/app';
import OnboardingFinishModal from '../../onboarding/components/OnboardingFinishModal';

const HomeContainer = styled.SafeAreaView`
  flex: 1;
`;

const Home = styled.ScrollView`
  margin-top: 20px;
`;

const HomeLink = styled(BaseText)<{isDark: boolean}>`
  font-weight: 500;
  font-size: 14px;
  color: ${({isDark}) => (isDark ? White : Action)};
  text-decoration: ${({isDark}) => (isDark ? 'underline' : 'none')};
  text-decoration-color: ${White};
`;

const Title = styled(BaseText)<{isDark: boolean}>`
  font-size: 14px;
  color: ${({isDark}) => (isDark ? White : SlateDark)};
`;

const SectionHeaderContainer = styled.View<{justifyContent?: string}>`
  flex-direction: row;
  margin: 10px ${ScreenGutter} 0;
  justify-content: ${({justifyContent}) => justifyContent || 'flex-start'};
`;

const HomeRoot = () => {
  const dispatch = useDispatch();
  const onboardingCompleted = useSelector(
    ({APP}: RootState) => APP.onboardingCompleted,
  );

  useEffect(() => {
    if (!onboardingCompleted) {
      dispatch(AppActions.showOnboardingFinishModal());
    }
  }, []);

  const theme = useTheme();
  const navigation = useNavigation();

  // Exchange Rates
  const priceHistory = useSelector(
    ({WALLET}: RootState) => WALLET.priceHistory,
  );
  const exchangeRatesItems: Array<ExchangeRateProps> = [];
  priceHistory.forEach((ph: PriceHistory, index: number) => {
    const currencyInfo = AssetSelectionOptions.find(
      ({id}: {id: string | number}) => id === ph.coin,
    );
    exchangeRatesItems.push({
      id: index,
      img: currencyInfo?.roundIcon(20),
      coinName: currencyInfo?.assetName,
      average: +ph.percentChange,
      theme,
    });
  });

  // Quick Links
  const quickLinksItems = [
    {
      id: '1',
      title: 'Leave Feedback',
      description: "Let us know how we're doing",
      img: (
        <Image
          source={require('../../../../assets/img/home/quick-links/icon-chat.png')}
        />
      ),
      onPress: () => {},
      theme,
    },
  ];

  return (
    <HomeContainer>
      <OnboardingFinishModal />
      <Home>
        <PortfolioBalance />

        <SectionHeaderContainer justifyContent={'flex-end'}>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('GeneralSettings', {
                screen: 'CustomizeHome',
              });
            }}>
            <HomeLink isDark={theme.dark}>Customize</HomeLink>
          </TouchableOpacity>
        </SectionHeaderContainer>

        <CardsCarousel />

        <LinkingButtons receiveCta={() => null} sendCta={() => null} />

        <SectionHeaderContainer justifyContent={'space-between'}>
          <Title isDark={theme.dark}>Limited Time Offers</Title>
          <TouchableOpacity onPress={() => console.log('offers')}>
            <HomeLink isDark={theme.dark}> See all</HomeLink>
          </TouchableOpacity>
        </SectionHeaderContainer>

        <OffersSlides items={OfferItems} />

        <SectionHeaderContainer>
          <Title isDark={theme.dark}>Do More</Title>
        </SectionHeaderContainer>

        <AdvertisementCard items={AdvertisementList} />

        {exchangeRatesItems.length > 0 && (
          <>
            <SectionHeaderContainer>
              <Title isDark={theme.dark}>Exchange Rates</Title>
            </SectionHeaderContainer>

            <ExchangeRatesSlides items={exchangeRatesItems} />
          </>
        )}

        <SectionHeaderContainer>
          <Title isDark={theme.dark}>Quick Links</Title>
        </SectionHeaderContainer>

        <QuickLinksSlides items={quickLinksItems} />
      </Home>
    </HomeContainer>
  );
};

export default HomeRoot;
