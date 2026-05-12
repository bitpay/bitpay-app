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
  buildAssetPreviewRowItemsFromWallets,
  getVisibleWalletsFromKeys,
  walletsHaveNonZeroLiveBalance,
} from '../../../../utils/portfolio/assets';
import AssetsGainLossDropdown from './AssetsGainLossDropdown';
import {useAppSelector} from '../../../../utils/hooks';
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
  const portfolio = useAppSelector(({PORTFOLIO}) => PORTFOLIO);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const keys = useAppSelector(({WALLET}) => WALLET.keys) as Record<string, Key>;
  const focusRefreshToken = useScreenFocusRefreshToken();
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
  const previewItems = useMemo(() => {
    return buildAssetPreviewRowItemsFromWallets({
      wallets: visibleWallets,
      quoteCurrency: defaultAltCurrency.isoCode,
      orderedAssetKeys: topAssetKeys,
      showScopedPnlLoading: topAssetKeys.length > 0,
    });
  }, [defaultAltCurrency.isoCode, topAssetKeys, visibleWallets]);
  const {
    visibleItems,
    isFiatLoading,
    isPopulateLoadingByKey,
    hasAnyPortfolioData,
  } = usePortfolioAssetRows({
    gainLossMode,
    enabled,
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
      !enabled || !!isFiatLoading || !visibleItems.length;
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
  }, [enabled, isFiatLoading, previewItems, topAssetKeys, visibleItems]);
  const shouldShowActivationPlaceholder =
    hasAnyVisibleWalletBalance &&
    !items.length &&
    (!!visibleWallets.length || !!portfolio.populateStatus?.inProgress);

  if (shouldShowActivationPlaceholder) {
    return (
      <Container>
        <Header>
          <HomeSectionTitle>{t('Assets')}</HomeSectionTitle>
          <AssetsGainLossDropdown
            value={gainLossMode}
            onChange={setGainLossMode}
          />
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

  if (
    !portfolio.populateStatus?.inProgress &&
    !hasAnyPortfolioData &&
    !previewItems.length
  ) {
    return null;
  }

  if (!items.length) {
    return null;
  }

  return (
    <Container>
      <Header>
        <HomeSectionTitle>{t('Assets')}</HomeSectionTitle>
        <AssetsGainLossDropdown
          value={gainLossMode}
          onChange={setGainLossMode}
        />
      </Header>

      <AssetsList
        items={items}
        isFiatLoading={isFiatLoading}
        populateInProgress={!!portfolio.populateStatus?.inProgress}
        isPopulateLoadingByKey={isPopulateLoadingByKey}
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
