import {type NavigationProp, useNavigation} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import {RefreshControl, ScrollView, View} from 'react-native';
import {Path, Svg} from 'react-native-svg';
import styled, {useTheme} from 'styled-components/native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {
  ActiveOpacity,
  CardContainer,
  ScreenGutter,
} from '../../../../components/styled/Containers';
import {BaseText, H2, H5, Link} from '../../../../components/styled/Text';
import ChartChangeRow from '../../../../components/charts/ChartChangeRow';
import LinkingButtons from '../../../tabs/home/components/LinkingButtons';
import {
  CharcoalBlack,
  LightBlack,
  LuckySevens,
  Slate,
  Slate10,
  Slate30,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {Network} from '../../../../constants';
import {
  sendCrypto,
  receiveCrypto,
} from '../../../../store/wallet/effects/send/send';
import {ExternalServicesScreens} from '../../../services/ExternalServicesGroup';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {useAppDispatch} from '../../../../utils/hooks';
import type {ExchangeRateSharedModel} from './useExchangeRateSharedModel';

const ScreenContainer = styled.SafeAreaView`
  flex: 1;
`;

const TopSection = styled.View`
  margin-top: 10px;
  align-items: center;
  padding: 0 16px;
`;

const AbbreviationLabel = styled(BaseText)`
  font-size: 13px;
  line-height: 18px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  font-weight: 400;
  margin-bottom: 2px;
`;

const PriceText = styled(H2)<{isLargeNumber?: boolean}>`
  font-size: ${({isLargeNumber}) => (isLargeNumber ? '32px' : '40px')};
  line-height: ${({isLargeNumber}) => (isLargeNumber ? '38px' : '50px')};
  margin-bottom: 5px;
`;

const ActionsContainer = styled.View`
  margin-top: 20px;
  margin-bottom: 20px;
`;

const SectionTitle = styled(H5)`
  font-size: 20px;
  font-style: normal;
  font-weight: 700;
  line-height: 30px;
  margin: 18px ${ScreenGutter} 3px;
`;

const WalletCard = styled(TouchableOpacity)`
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : Slate10)};
  background-color: ${({theme: {dark}}) => (dark ? CharcoalBlack : Slate10)};
  border-radius: 12px;
  margin: 8px ${ScreenGutter};
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  height: 75px;
`;

const WalletLeft = styled.View`
  flex: 1;
  padding-right: 10px;
`;

const WalletName = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 18px;
  color: ${({theme}) => theme.colors.text};
`;

const WalletSub = styled(BaseText)`
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
  margin-top: 4px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : LuckySevens)};
`;

const WalletRight = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
`;

const WalletAmount = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 24px;
  color: ${({theme}) => theme.colors.text};
`;

const MarketCardContainer = styled.View`
  margin: 20px ${ScreenGutter} 20px;
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  border-radius: 12px;
`;

const MarketHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
`;

const MarketHeaderLeft = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
`;

const MarketTitle = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px;
  color: ${({theme}) => theme.colors.text};
`;

const MarketPrice = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 700;
  line-height: 24px;
  color: ${({theme}) => theme.colors.text};
`;

const Divider = styled.View`
  height: 1px;
  background-color: ${({theme}) => (theme.dark ? LightBlack : Slate30)};
`;

const MarketBody = styled.View`
  padding: 14px;
  background-color: ${({theme: {dark}}) => (dark ? CharcoalBlack : Slate10)};
`;

const SubSectionTitle = styled(BaseText)`
  font-size: 13px;
  font-style: normal;
  font-weight: 600;
  line-height: 20px;
  color: ${({theme}) => theme.colors.text};
  margin-bottom: 10px;
`;

const StatsGridRow = styled.View`
  flex-direction: row;
`;

const StatBlock = styled.View`
  flex: 1;
  flex-basis: 0px;
`;

const StatLabel = styled(BaseText)`
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 15px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  margin-bottom: 4px;
`;

const StatValue = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 24px;
  color: ${({theme}) => theme.colors.text};
`;

const AboutText = styled(BaseText)`
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 15px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

type ExchangeRateChangeRowProps = {
  percent: number;
  deltaFiatFormatted?: string;
  rangeLabel?: string;
};

type ExchangeRateScreenLayoutProps = {
  chartSection: React.ReactNode;
  changeRow?: ExchangeRateChangeRowProps;
  isRefreshing: boolean;
  marketPriceDisplay: string;
  onRefresh: () => void;
  shared: ExchangeRateSharedModel;
  topValue: string;
  topValueIsLarge: boolean;
};

const ExchangeRateScreenLayout = ({
  chartSection,
  changeRow,
  isRefreshing,
  marketPriceDisplay,
  onRefresh,
  shared,
  topValue,
  topValueIsLarge,
}: ExchangeRateScreenLayoutProps) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp<any>>();
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);

  useEffect(() => {
    setIsAboutExpanded(false);
  }, [
    shared.assetContext.chain,
    shared.assetContext.currencyAbbreviation,
    shared.assetContext.tokenAddress,
  ]);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{paddingBottom: 30}}
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            progressBackgroundColor={theme.dark ? SlateDark : White}
            refreshing={isRefreshing}
            onRefresh={onRefresh}
          />
        }>
        <TopSection>
          <AbbreviationLabel>{shared.currencyAbbreviation}</AbbreviationLabel>
          <PriceText isLargeNumber={topValueIsLarge}>{topValue}</PriceText>
          {changeRow ? (
            <ChartChangeRow
              percent={changeRow.percent}
              deltaFiatFormatted={changeRow.deltaFiatFormatted}
              rangeLabel={changeRow.rangeLabel}
            />
          ) : null}
        </TopSection>

        {chartSection}

        <ActionsContainer>
          <LinkingButtons
            maxWidth={500}
            buy={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Buy Crypto', {
                    context: 'PriceChart',
                    coin: shared.assetContext.currencyAbbreviation || '',
                    chain: shared.assetContext.chain || '',
                  }),
                );
                navigation.navigate(ExternalServicesScreens.ROOT_BUY_AND_SELL, {
                  context: 'buyCrypto',
                  currencyAbbreviation:
                    shared.assetContext.currencyAbbreviation,
                  chain: shared.assetContext.chain,
                });
              },
            }}
            sell={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Sell Crypto', {
                    context: 'PriceChart',
                    coin: shared.assetContext.currencyAbbreviation || '',
                    chain: shared.assetContext.chain || '',
                  }),
                );
                navigation.navigate(ExternalServicesScreens.ROOT_BUY_AND_SELL, {
                  context: 'sellCrypto',
                  currencyAbbreviation:
                    shared.assetContext.currencyAbbreviation,
                  chain: shared.assetContext.chain,
                });
              },
            }}
            swap={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Swap Crypto', {
                    context: 'PriceChart',
                    coin: shared.assetContext.currencyAbbreviation || '',
                    chain: shared.assetContext.chain || '',
                  }),
                );
                navigation.navigate('GlobalSelect', {
                  context: 'swapFrom',
                  assetContext: shared.assetContext,
                });
              },
            }}
            receive={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Receive Crypto', {
                    context: 'PriceChart',
                    coin: shared.assetContext.currencyAbbreviation || '',
                    chain: shared.assetContext.chain || '',
                  }),
                );
                dispatch(
                  receiveCrypto(
                    navigation,
                    'ExchangeRate',
                    shared.assetContext,
                  ),
                );
              },
            }}
            send={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Send Crypto', {
                    context: 'PriceChart',
                    coin: shared.assetContext.currencyAbbreviation || '',
                    chain: shared.assetContext.chain || '',
                  }),
                );
                dispatch(sendCrypto('ExchangeRate', shared.assetContext));
              },
            }}
          />
        </ActionsContainer>

        {shared.walletsForAsset.length ? (
          <>
            <SectionTitle>{`Your Wallets with ${shared.currencyAbbreviation}`}</SectionTitle>

            {shared.walletsForAsset.map(({wallet, ui}) => (
              <WalletCard
                key={ui.id}
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  navigation.navigate('WalletDetails', {
                    walletId: wallet.credentials?.walletId || wallet.id,
                    key: shared.keys[wallet.keyId],
                    copayerId: wallet.credentials?.copayerId,
                  });
                }}>
                <WalletLeft>
                  <WalletName numberOfLines={1} ellipsizeMode="tail">
                    {ui.walletName}
                  </WalletName>
                  <WalletSub numberOfLines={1} ellipsizeMode="tail">
                    {shared.hideAllBalances ? '****' : ui.cryptoBalance ?? ''}
                  </WalletSub>
                </WalletLeft>
                <WalletRight>
                  <WalletAmount>
                    {shared.hideAllBalances
                      ? '****'
                      : ui.network === Network.testnet
                      ? 'Test - No Value'
                      : ui.fiatBalanceFormat || '$0.00'}
                  </WalletAmount>
                  <RightChevron />
                </WalletRight>
              </WalletCard>
            ))}
          </>
        ) : null}

        <MarketCardContainer>
          <CardContainer style={{backgroundColor: 'transparent'}}>
            <MarketHeader>
              <MarketHeaderLeft>
                <View style={{width: 26, height: 26}}>
                  <CurrencyImage img={shared.currencyImageSource} size={26} />
                </View>
                <MarketTitle>{`${shared.currencyAbbreviation} Market Price`}</MarketTitle>
              </MarketHeaderLeft>
              <MarketPrice>{marketPriceDisplay}</MarketPrice>
            </MarketHeader>
            <Divider />
            <MarketBody>
              <SubSectionTitle>{`${shared.currencyName} Stats`}</SubSectionTitle>

              <StatsGridRow>
                <StatBlock style={{paddingRight: 8}}>
                  <StatLabel>52wk high</StatLabel>
                  <StatValue>{shared.marketHigh52wToDisplay}</StatValue>
                </StatBlock>
                <View>
                  <StatBlock>
                    <StatLabel>52wk low</StatLabel>
                    <StatValue>{shared.marketLow52wToDisplay}</StatValue>
                  </StatBlock>
                </View>
                <StatBlock style={{alignItems: 'flex-end'}}>
                  <StatLabel>24h volume</StatLabel>
                  <StatValue>{shared.marketVolume24hToDisplay}</StatValue>
                </StatBlock>
              </StatsGridRow>

              <View style={{marginTop: 14}} />
              <Divider />
              <View style={{marginTop: 14}} />

              <StatsGridRow>
                <StatBlock style={{paddingRight: 8}}>
                  <StatLabel>Circulating supply</StatLabel>
                  <StatValue>{shared.circulatingSupplyToDisplay}</StatValue>
                </StatBlock>
                <StatBlock style={{alignItems: 'flex-end'}}>
                  <StatLabel>Market cap</StatLabel>
                  <StatValue>{shared.marketCapToDisplay}</StatValue>
                </StatBlock>
              </StatsGridRow>

              <View style={{marginTop: 16}} />
              <Divider />

              <View style={{marginTop: 14}}>
                <SubSectionTitle style={{fontWeight: '400', marginBottom: 6}}>
                  About
                </SubSectionTitle>
                <AboutText
                  numberOfLines={isAboutExpanded ? undefined : 3}
                  ellipsizeMode={isAboutExpanded ? undefined : 'tail'}>
                  {shared.aboutToDisplay || '--'}
                </AboutText>
                <View style={{marginTop: 15}}>
                  {shared.aboutToDisplay ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                      onPress={() => setIsAboutExpanded(prev => !prev)}>
                      <Link style={{fontSize: 13}}>
                        {isAboutExpanded ? 'Show less' : 'Show more'}
                      </Link>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </MarketBody>
          </CardContainer>
        </MarketCardContainer>
      </ScrollView>
    </ScreenContainer>
  );
};

const RightChevron = () => {
  const theme = useTheme();
  const stroke = theme.dark ? Slate : SlateDark;
  return (
    <Svg width={7} height={13} viewBox="0 0 10 16" fill="none">
      <Path
        d="M1 1L8 8L1 15"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default ExchangeRateScreenLayout;
