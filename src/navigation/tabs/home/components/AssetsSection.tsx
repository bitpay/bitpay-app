import React, {useMemo, useState} from 'react';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import styled, {useTheme} from 'styled-components/native';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import type {RootStackParamList} from '../../../../Root';
import {ScreenGutter} from '../../../../components/styled/Containers';
import Button from '../../../../components/button/Button';
import {HomeSectionTitle} from './Styled';
import AssetsList from './AssetsList';
import {
  AssetRowItem,
  GainLossMode,
  buildLegacyLastDayRateRequestsForAssetRows,
  buildAssetPreviewRowItemsFromWallets,
  getVisibleWalletsFromKeys,
  walletsHaveNonZeroLiveBalance,
} from '../../../../utils/portfolio/assets';
import AssetsGainLossDropdown from './AssetsGainLossDropdown';
import {useAppSelector} from '../../../../utils/hooks';
import {selectShowPortfolioValue} from '../../../../store/app/app.selectors';
import {
  CharcoalBlack,
  GhostWhite,
  LightBlack,
  NeutralSlate,
} from '../../../../styles/colors';
import usePortfolioAssetRows from '../../../../portfolio/ui/hooks/usePortfolioAssetRows';
import useScreenFocusRefreshToken from '../hooks/useScreenFocusRefreshToken';
import {
  buildAllocationDataFromWalletRows,
  toAllocationWallet,
} from '../../../../utils/portfolio/allocation';
import type {Key} from '../../../../store/wallet/wallet.models';
import useRuntimeFiatRateSeriesCache from '../../../../portfolio/ui/hooks/useRuntimeFiatRateSeriesCache';
import {HISTORIC_RATES_CACHE_DURATION} from '../../../../constants/wallet';
import {getLastDayTimestampStartOfHourMs} from '../../../../utils/helper-methods';

const Container = styled.View`
  margin-top: 5px;
  margin-bottom: 25px;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 0 ${ScreenGutter} 0 16px;
`;

const ButtonContainer = styled.View`
  margin: 0px ${ScreenGutter} 0;
`;

const PlaceholderButtonContainer = styled.View`
  margin: 0px ${ScreenGutter} 0;
`;

const PlaceholderButtonShell = styled.View`
  height: 50px;
  border-radius: 999px;
`;

const SKELETON_ASSET_ITEMS: AssetRowItem[] = Array.from(
  {length: 4},
  (_value, index) => ({
    key: `asset-skeleton-${index}`,
    currencyAbbreviation: 'btc',
    chain: 'btc',
    name: 'Loading',
    cryptoAmount: '',
    fiatAmount: '',
    deltaFiat: '',
    deltaPercent: '',
    isPositive: true,
    hasRate: true,
    hasPnl: true,
  }),
);

type AssetsSectionProps = {
  enabled?: boolean;
};

const AssetsSection: React.FC<AssetsSectionProps> = ({enabled = true}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [gainLossMode, setGainLossMode] = useState<GainLossMode>('1D');
  // Narrowed from `useAppSelector(({PORTFOLIO}) => PORTFOLIO)`. The whole slice
  // gets a new object identity on every populate-progress tick, which
  // re-rendered this component ~1-2x/second for the duration of every
  // portfolio populate.
  // Only the boolean is read here, so select the primitive: this component then
  // re-renders when populate starts/stops rather than on every progress tick.
  const populateInProgress = useAppSelector(
    ({PORTFOLIO}) => !!PORTFOLIO.populateStatus?.inProgress,
  );
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const showPortfolioValue = useAppSelector(selectShowPortfolioValue);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const keys = useAppSelector(({WALLET}) => WALLET.keys) as Record<string, Key>;
  const focusRefreshToken = useScreenFocusRefreshToken();
  const portfolioChartsEnabled = showPortfolioValue === true;
  const visibleWallets = useMemo(() => {
    return getVisibleWalletsFromKeys(keys, homeCarouselConfig);
  }, [homeCarouselConfig, keys]);
  const hasAnyVisibleWalletBalance = useMemo(() => {
    return walletsHaveNonZeroLiveBalance(visibleWallets);
  }, [visibleWallets]);
  const topAssetKeys = useMemo(() => {
    const allocationData = buildAllocationDataFromWalletRows(
      visibleWallets.map(toAllocationWallet),
      defaultAltCurrency.isoCode,
    );

    return allocationData.rows.slice(0, 4).map(row => row.key);
  }, [defaultAltCurrency.isoCode, visibleWallets]);
  const legacyAssetRowsEnabled = !portfolioChartsEnabled;
  const legacyAssetRateRequests = useMemo(() => {
    if (!legacyAssetRowsEnabled) {
      return [];
    }

    return buildLegacyLastDayRateRequestsForAssetRows({
      wallets: visibleWallets,
      orderedAssetKeys: topAssetKeys,
    });
  }, [legacyAssetRowsEnabled, topAssetKeys, visibleWallets]);
  const legacyAssetBaselineTimestampMs = useMemo(
    () => getLastDayTimestampStartOfHourMs(),
    [defaultAltCurrency.isoCode, focusRefreshToken],
  );
  const {cache: legacyAssetFiatRateSeriesCache} = useRuntimeFiatRateSeriesCache(
    {
      quoteCurrency: defaultAltCurrency.isoCode,
      requests: legacyAssetRateRequests,
      maxAgeMs: HISTORIC_RATES_CACHE_DURATION * 1000,
      enabled: legacyAssetRowsEnabled && legacyAssetRateRequests.length > 0,
      clearOnRequestChange: true,
    },
  );
  const previewItems = useMemo(() => {
    return buildAssetPreviewRowItemsFromWallets({
      wallets: visibleWallets,
      quoteCurrency: defaultAltCurrency.isoCode,
      orderedAssetKeys: topAssetKeys,
      showScopedPnlLoading: portfolioChartsEnabled && topAssetKeys.length > 0,
      includeLegacyLastDayPnl: !portfolioChartsEnabled,
      rates,
      fiatRateSeriesCache: legacyAssetFiatRateSeriesCache,
      baselineTimestampMs: legacyAssetBaselineTimestampMs,
    });
  }, [
    defaultAltCurrency.isoCode,
    legacyAssetBaselineTimestampMs,
    legacyAssetFiatRateSeriesCache,
    portfolioChartsEnabled,
    rates,
    topAssetKeys,
    visibleWallets,
  ]);
  const {
    visibleItems,
    isFiatLoading: isPnlLoading,
    isPopulateLoadingByKey,
    hasAnyPortfolioData,
    presentationResetToken,
  } = usePortfolioAssetRows({
    gainLossMode,
    enabled: enabled && portfolioChartsEnabled,
    assetKeys: topAssetKeys,
    externalRefreshToken: focusRefreshToken,
  });

  const items = useMemo(() => {
    if (!previewItems.length) {
      return visibleItems.slice(0, 4);
    }

    const previewItemsByKey = new Map(
      previewItems.map(item => [item.key, item]),
    );
    const visibleItemsByKey = new Map(
      visibleItems.map(item => [item.key, item]),
    );
    const nextItems: AssetRowItem[] = [];
    const seenKeys = new Set<string>();
    const shouldUsePreviewFallback =
      !portfolioChartsEnabled ||
      !enabled ||
      !!isPnlLoading ||
      !visibleItems.length;
    const resolveDisplayItem = (key: string): AssetRowItem | undefined => {
      const previewItem = previewItemsByKey.get(key);
      const visibleItem = visibleItemsByKey.get(key);

      if (!visibleItem) {
        return shouldUsePreviewFallback ? previewItem : undefined;
      }

      // Keep the wallet-derived preview row on screen if the scoped portfolio
      // analysis only has a placeholder row for this asset so we do not flicker
      // from a stable preview into a weaker intermediate presentation.
      const shouldPreferPreviewItem =
        !!previewItem &&
        (visibleItem.showPnlPlaceholder ||
          (!visibleItem.hasRate &&
            !visibleItem.hasPnl &&
            !visibleItem.showScopedPnlLoading));

      return shouldPreferPreviewItem ? previewItem : visibleItem;
    };

    for (const key of topAssetKeys) {
      const item = resolveDisplayItem(key);
      if (!item) {
        continue;
      }

      nextItems.push(item);
      seenKeys.add(key);
    }

    for (const item of visibleItems) {
      if (seenKeys.has(item.key)) {
        continue;
      }

      nextItems.push(item);
      if (nextItems.length >= 4) {
        break;
      }
    }

    return nextItems.slice(0, 4);
  }, [
    enabled,
    isPnlLoading,
    portfolioChartsEnabled,
    previewItems,
    topAssetKeys,
    visibleItems,
  ]);
  const shouldShowActivationPlaceholder =
    portfolioChartsEnabled &&
    hasAnyVisibleWalletBalance &&
    !items.length &&
    (!!visibleWallets.length || populateInProgress);

  if (shouldShowActivationPlaceholder) {
    return (
      <Container>
        <Header>
          <HomeSectionTitle>{t('Assets')}</HomeSectionTitle>
          {portfolioChartsEnabled ? (
            <AssetsGainLossDropdown
              value={gainLossMode}
              onChange={setGainLossMode}
            />
          ) : null}
        </Header>

        <AssetsList items={SKELETON_ASSET_ITEMS} forceSkeleton />

        <PlaceholderButtonContainer>
          <SkeletonPlaceholder
            backgroundColor={theme.dark ? CharcoalBlack : NeutralSlate}
            highlightColor={theme.dark ? LightBlack : GhostWhite}>
            <PlaceholderButtonShell />
          </SkeletonPlaceholder>
        </PlaceholderButtonContainer>
      </Container>
    );
  }

  if (!populateInProgress && !hasAnyPortfolioData && !previewItems.length) {
    return null;
  }

  if (!items.length) {
    return null;
  }

  return (
    <Container>
      <Header>
        <HomeSectionTitle>{t('Assets')}</HomeSectionTitle>
        {portfolioChartsEnabled ? (
          <AssetsGainLossDropdown
            value={gainLossMode}
            onChange={setGainLossMode}
          />
        ) : null}
      </Header>

      <AssetsList
        items={items}
        isPnlLoading={isPnlLoading}
        populateInProgress={portfolioChartsEnabled && populateInProgress}
        isPopulateLoadingByKey={isPopulateLoadingByKey}
        presentationResetToken={presentationResetToken}
      />

      <ButtonContainer>
        <Button
          buttonStyle="secondary"
          height={50}
          buttonOutline
          testID="home-see-all-assets-button"
          accessibilityLabel="See all assets"
          onPress={() => navigation.navigate('AllAssets')}>
          {t('See All Assets')}
        </Button>
      </ButtonContainer>
    </Container>
  );
};

export default React.memo(AssetsSection);
