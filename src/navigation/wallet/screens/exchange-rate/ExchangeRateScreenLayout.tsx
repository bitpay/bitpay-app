import {type NavigationProp, useNavigation} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {Path, Svg} from 'react-native-svg';
import {useTheme} from '../../../../contexts';
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
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import type {ExchangeRateSharedModel} from './useExchangeRateSharedModel';
import {
  resolveExchangeRateTopChangeRow,
  type ExchangeRateChangeRow,
} from './exchangeRateTopChangeRow';
import ArchaxFooter from '../../../../components/archax/archax-footer';

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  topSection: {
    marginTop: 10,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  abbreviationLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    marginBottom: 2,
  },
  priceTextLarge: {
    fontSize: 32,
    lineHeight: 38,
    marginBottom: 5,
  },
  priceTextNormal: {
    fontSize: 40,
    lineHeight: 50,
    marginBottom: 5,
  },
  actionsContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontStyle: 'normal',
    fontWeight: '700',
    lineHeight: 30,
    marginTop: 18,
    marginHorizontal: gutter,
    marginBottom: 3,
  },
  walletCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    height: 75,
  },
  walletLeft: {
    flex: 1,
    paddingRight: 10,
  },
  walletName: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 18,
  },
  walletSub: {
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 20,
    marginTop: 4,
  },
  walletRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletAmount: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 24,
  },
  marketCardContainer: {
    marginVertical: 20,
    marginHorizontal: gutter,
    borderWidth: 1,
    borderRadius: 12,
  },
  marketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  marketHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  marketTitle: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '500',
    lineHeight: 24,
  },
  marketPrice: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '700',
    lineHeight: 24,
  },
  divider: {
    height: 1,
  },
  marketBody: {
    padding: 14,
  },
  subSectionTitle: {
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 10,
  },
  statsGridRow: {
    flexDirection: 'row',
  },
  statBlock: {
    flex: 1,
    flexBasis: 0,
  },
  statLabel: {
    fontSize: 12,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 15,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 24,
  },
  aboutText: {
    fontSize: 12,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 15,
  },
});

const ScreenContainer: React.FC<React.ComponentProps<typeof SafeAreaView>> = ({
  style,
  ...rest
}) => <SafeAreaView style={[styles.screenContainer, style]} {...rest} />;

const TopSection: React.FC<React.ComponentProps<typeof TouchableOpacity>> = ({
  style,
  ...rest
}) => <TouchableOpacity style={[styles.topSection, style]} {...rest} />;

const AbbreviationLabel: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.abbreviationLabel,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const PriceText: React.FC<
  React.ComponentProps<typeof H2> & {isLargeNumber?: boolean}
> = ({isLargeNumber, style, ...rest}) => (
  <H2
    style={[
      isLargeNumber ? styles.priceTextLarge : styles.priceTextNormal,
      style,
    ]}
    {...rest}
  />
);

const ActionsContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.actionsContainer, style]} {...rest} />;

const SectionTitle: React.FC<React.ComponentProps<typeof H5>> = ({
  style,
  ...rest
}) => <H5 style={[styles.sectionTitle, style]} {...rest} />;

const WalletCard: React.FC<React.ComponentProps<typeof TouchableOpacity>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.walletCard,
        {
          borderColor: theme.dark ? LightBlack : Slate10,
          backgroundColor: theme.dark ? CharcoalBlack : Slate10,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const WalletLeft: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.walletLeft, style]} {...rest} />;

const WalletName: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.walletName, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
};

const WalletSub: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.walletSub,
        {color: theme.dark ? Slate30 : LuckySevens},
        style,
      ]}
      {...rest}
    />
  );
};

const WalletRight: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.walletRight, style]} {...rest} />;

const WalletAmount: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.walletAmount, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
};

const MarketCardContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.marketCardContainer,
        {borderColor: theme.dark ? LightBlack : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const MarketHeader: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.marketHeader, style]} {...rest} />;

const MarketHeaderLeft: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.marketHeaderLeft, style]} {...rest} />;

const MarketTitle: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.marketTitle, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
};

const MarketPrice: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.marketPrice, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
};

const Divider: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.divider,
        {backgroundColor: theme.dark ? LightBlack : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const MarketBody: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.marketBody,
        {backgroundColor: theme.dark ? CharcoalBlack : Slate10},
        style,
      ]}
      {...rest}
    />
  );
};

const SubSectionTitle: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.subSectionTitle, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
};

const StatsGridRow: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.statsGridRow, style]} {...rest} />;

const StatBlock: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.statBlock, style]} {...rest} />;

const StatLabel: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.statLabel,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const StatValue: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.statValue, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
};

const AboutText: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.aboutText,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

type ExchangeRateScreenLayoutProps = {
  chartSection: React.ReactNode;
  changeRow?: ExchangeRateChangeRow;
  isRefreshing: boolean;
  marketPriceDisplay: string;
  onRefresh: () => void;
  reserveChangeRowSpace?: boolean;
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
  reserveChangeRowSpace = false,
  shared,
  topValue,
  topValueIsLarge,
}: ExchangeRateScreenLayoutProps) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const navigation = useNavigation<NavigationProp<any>>();
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);

  useEffect(() => {
    setIsAboutExpanded(false);
  }, [
    shared.assetContext.chain,
    shared.assetContext.currencyAbbreviation,
    shared.assetContext.tokenAddress,
  ]);

  const resolvedTopChangeRow = resolveExchangeRateTopChangeRow({
    changeRow,
    reserveSpace: reserveChangeRowSpace,
  });

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
        <TopSection activeOpacity={1}>
          <AbbreviationLabel>{shared.currencyAbbreviation}</AbbreviationLabel>
          <PriceText isLargeNumber={topValueIsLarge}>{topValue}</PriceText>
          {resolvedTopChangeRow ? (
            <ChartChangeRow
              percent={resolvedTopChangeRow.percent}
              deltaFiatFormatted={resolvedTopChangeRow.deltaFiatFormatted}
              rangeLabel={resolvedTopChangeRow.rangeLabel}
              style={resolvedTopChangeRow.hidden ? {opacity: 0} : undefined}
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

        {showArchaxBanner && <ArchaxFooter />}
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
