import React, {useEffect} from 'react';
import {Image, ScrollView, TouchableOpacity} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
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
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../components/styled/Containers';
import AdvertisementCard from '../../../components/advertisement/AdvertisementCard';
import {AdvertisementList} from '../../../components/advertisement/advertisement';
import {OfferItems} from '../../../components/offer/offer';
import {AppActions} from '../../../store/app';
import OnboardingFinishModal from '../../onboarding/components/OnboardingFinishModal';
import ScanSvg from '../../../../assets/img/home/scan.svg';
import ProfileSvg from '../../../../assets/img/home/profile.svg';

const HeaderContainer = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  margin: 10px ${ScreenGutter};
`;

const ScanImg = styled.View`
  margin-right: ${ScreenGutter};
`;

const HomeContainer = styled.SafeAreaView`
  flex: 1;
`;

const HomeLink = styled(BaseText)`
  font-weight: 500;
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? White : Action)};
  text-decoration: ${({theme: {dark}}) => (dark ? 'underline' : 'none')};
  text-decoration-color: ${White};
`;

const Title = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const SectionHeaderContainer = styled.View<{justifyContent?: string}>`
  flex-direction: row;
  margin: 10px ${ScreenGutter} 0;
  justify-content: ${({justifyContent}) => justifyContent || 'flex-start'};
`;

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
  },
];

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
    });
  });

  return (
    <HomeContainer>
      <ScrollView>
        <HeaderContainer>
          <ScanImg>
            <TouchableOpacity
              onPress={() => navigation.navigate('Scan', {screen: 'Root'})}>
              <ScanSvg />
            </TouchableOpacity>
          </ScanImg>
          <ProfileSvg />
        </HeaderContainer>
        {/* ////////////////////////////// PORTFOLIO BALANCE */}
        <PortfolioBalance />

        {/* ////////////////////////////// CARDS CAROUSEL */}
        <SectionHeaderContainer justifyContent={'flex-end'}>
          <TouchableOpacity
            activeOpacity={ActiveOpacity}
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('GeneralSettings', {
                screen: 'CustomizeHome',
              });
            }}>
            <HomeLink>Customize</HomeLink>
          </TouchableOpacity>
        </SectionHeaderContainer>
        <CardsCarousel />

        {/* ////////////////////////////// CTA BUY SWAP RECEIVE SEND BUTTONS */}
        <LinkingButtons receiveCta={() => null} sendCta={() => null} />

        {/* ////////////////////////////// LIMITED TIME OFFERS */}
        <SectionHeaderContainer justifyContent={'space-between'}>
          <Title>Limited Time Offers</Title>
          <TouchableOpacity
            activeOpacity={ActiveOpacity}
            onPress={() => console.log('offers')}>
            <HomeLink> See all</HomeLink>
          </TouchableOpacity>
        </SectionHeaderContainer>
        <OffersSlides items={OfferItems} />

        {/* ////////////////////////////// ADVERTISEMENTS */}
        <SectionHeaderContainer>
          <Title>Do More</Title>
        </SectionHeaderContainer>

        <AdvertisementCard items={AdvertisementList} />

        {/* ////////////////////////////// EXCHANGE RATES */}
        {exchangeRatesItems.length > 0 && (
          <>
            <SectionHeaderContainer>
              <Title>Exchange Rates</Title>
            </SectionHeaderContainer>
            <ExchangeRatesSlides items={exchangeRatesItems} />
          </>
        )}

        {/* ////////////////////////////// QUICK LINKS - Leave feedback etc */}
        <SectionHeaderContainer>
          <Title>Quick Links</Title>
        </SectionHeaderContainer>
        <QuickLinksSlides items={quickLinksItems} />
      </ScrollView>
      <OnboardingFinishModal />
    </HomeContainer>
  );
};

export default HomeRoot;
