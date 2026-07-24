import React, {
  useCallback,
  useDeferredValue,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {SafeAreaView, StyleSheet, TextInput, View} from 'react-native';
import {FlashList, ListRenderItemInfo} from '@shopify/flash-list';
import {useTheme} from '../../../../contexts';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';

import type {RootStackParamList} from '../../../../Root';
import {useStackScreenOptions} from '../../../utils/headerHelpers';
import {HeaderTitle, BaseText, H5} from '../../../../components/styled/Text';
import {ScreenGutter} from '../../../../components/styled/Containers';
import GhostSvg from '../../../../../assets/img/ghost-cheeky.svg';
import SearchSvg from '../../../../../assets/img/search.svg';

import {useAppSelector} from '../../../../utils/hooks';
import {selectShowPortfolioValue} from '../../../../store/app/app.selectors';
import usePortfolioAssetRows from '../../../../portfolio/ui/hooks/usePortfolioAssetRows';
import {
  buildLegacyLastDayRateRequestsForAssetRows,
  buildAssetPreviewRowItemsFromWallets,
  getQuoteCurrency,
  getVisibleWalletsFromKeys,
  type AssetRowItem,
  type GainLossMode,
} from '../../../../utils/portfolio/assets';
import AssetRow from '../components/AssetRow';
import AssetsGainLossDropdown from '../components/AssetsGainLossDropdown';
import {
  BitpaySupportedCoins,
  BitpaySupportedTokens,
} from '../../../../constants/currencies';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {useAssetIconResolver} from '../hooks/useAssetIconResolver';
import {FIAT_RATE_SERIES_CACHED_INTERVALS} from '../../../../store/rate/rate.models';
import {HISTORIC_RATES_CACHE_DURATION} from '../../../../constants/wallet';
import {
  getHistoricalRateAssetRequestFromItem,
  type HistoricalRateAssetRequest,
} from '../hooks/portfolioAssetHistoryRequests';
import useRuntimeFiatRateSeriesCache from '../../../../portfolio/ui/hooks/useRuntimeFiatRateSeriesCache';
import {
  getAssetRowPnlLoading,
  getAssetRowPopulateLoading,
} from '../components/assetRowLoading';
import useScreenFocusRefreshToken from '../hooks/useScreenFocusRefreshToken';
import type {Key} from '../../../../store/wallet/wallet.models';
import {getLastDayTimestampStartOfHourMs} from '../../../../utils/helper-methods';

type Props = NativeStackScreenProps<RootStackParamList, 'AllAssets'>;
const LIST_HORIZONTAL_GUTTER = Number.parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  styledTextInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
    margin: 0,
  },
  searchIconContainer: {
    marginRight: 8,
  },
  emptyListContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.8,
  },
});

const ScreenContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <SafeAreaView style={styles.screenContainer}>{children}</SafeAreaView>;

const FiltersRow: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.filtersRow}>{children}</View>
);

const SearchInputContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.searchInputContainer,
        {
          borderColor: theme.dark ? '#2C2F34' : '#E4E9EF',
          backgroundColor: theme.dark ? 'transparent' : '#FFFFFF',
        },
      ]}>
      {children}
    </View>
  );
};

const StyledTextInput: React.FC<React.ComponentProps<typeof TextInput>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <TextInput
      style={[styles.styledTextInput, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
};

const SearchIconContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.searchIconContainer}>{children}</View>;

const EmptyListContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.emptyListContainer}>{children}</View>;

const EmptySubtext: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => <BaseText style={[styles.emptySubtext, style]} {...rest} />;

const AllAssets: React.FC<Props> = ({navigation, route}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const commonOptions = useStackScreenOptions(theme);
  const portfolioQuoteCurrency = useAppSelector(
    ({PORTFOLIO}) => PORTFOLIO.quoteCurrency,
  );
  const portfolioPopulateInProgress = useAppSelector(
    ({PORTFOLIO}) => !!PORTFOLIO.populateStatus?.inProgress,
  );
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const showPortfolioValue = useAppSelector(selectShowPortfolioValue);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const keys = useAppSelector(({WALLET}) => WALLET.keys) as Record<string, Key>;
  const portfolioChartsEnabled = showPortfolioValue === true;
  const populateInProgress =
    portfolioChartsEnabled && portfolioPopulateInProgress;
  const {getAssetIconData, getSupportedOption} = useAssetIconResolver();
  const focusRefreshToken = useScreenFocusRefreshToken();
  const keyId = route.params?.keyId;

  const [gainLossMode, setGainLossMode] = useState<GainLossMode>('1D');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const visibleWallets = useMemo(() => {
    if (keyId && keys[keyId]) {
      return getVisibleWalletsFromKeys({[keyId]: keys[keyId]});
    }

    return getVisibleWalletsFromKeys(keys, homeCarouselConfig);
  }, [homeCarouselConfig, keyId, keys]);
  const quoteCurrency = getQuoteCurrency({
    portfolioQuoteCurrency,
    defaultAltCurrencyIsoCode: defaultAltCurrency?.isoCode,
  }).toUpperCase();
  const legacyAssetRowsEnabled = !portfolioChartsEnabled;
  const legacyAssetRateRequests = useMemo(() => {
    if (!legacyAssetRowsEnabled) {
      return [];
    }

    return buildLegacyLastDayRateRequestsForAssetRows({
      wallets: visibleWallets,
    });
  }, [legacyAssetRowsEnabled, visibleWallets]);
  const legacyAssetBaselineTimestampMs = useMemo(
    () => getLastDayTimestampStartOfHourMs(),
    [quoteCurrency],
  );
  const {cache: legacyAssetFiatRateSeriesCache} = useRuntimeFiatRateSeriesCache(
    {
      quoteCurrency,
      requests: legacyAssetRateRequests,
      maxAgeMs: HISTORIC_RATES_CACHE_DURATION * 1000,
      enabled: legacyAssetRowsEnabled && legacyAssetRateRequests.length > 0,
      clearOnRequestChange: true,
    },
  );
  const legacyVisibleItems = useMemo(() => {
    if (portfolioChartsEnabled) {
      return [];
    }

    return buildAssetPreviewRowItemsFromWallets({
      wallets: visibleWallets,
      quoteCurrency: defaultAltCurrency.isoCode,
      includeLegacyLastDayPnl: true,
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
    visibleWallets,
  ]);
  const {
    visibleItems: portfolioVisibleItems,
    isFiatLoading: isPnlLoading,
    isPopulateLoadingByKey,
    presentationResetToken,
  } = usePortfolioAssetRows({
    gainLossMode,
    keyId,
    externalRefreshToken: focusRefreshToken,
    enabled: portfolioChartsEnabled,
  });
  const visibleItems = portfolioChartsEnabled
    ? portfolioVisibleItems
    : legacyVisibleItems;
  useLayoutEffect(() => {
    navigation.setOptions({
      ...commonOptions,
      headerTitle: () => <HeaderTitle>{t('Assets')}</HeaderTitle>,
    });
  }, [commonOptions, navigation, t]);

  const normalizedDeferredQuery = deferredQuery.trim().toLowerCase();
  const hasActiveQuery = query.trim().length > 0;
  const hasDeferredQuery = normalizedDeferredQuery.length > 0;

  const searchableVisibleItems = useMemo(() => {
    if (!hasActiveQuery || !hasDeferredQuery) {
      return [];
    }

    return visibleItems.map(item => {
      const option = getSupportedOption(item);

      const optionCurrencyName = option?.currencyName;
      const chainKey = (option?.chain || item.chain || '').toLowerCase();
      const chainDisplayName = BitpaySupportedCoins[chainKey]?.name;

      const tokenDisplayName = option?.tokenAddress
        ? BitpaySupportedTokens[
            getCurrencyAbbreviation(option.tokenAddress, option.chain)
          ]?.name
        : undefined;

      const searchText = [
        optionCurrencyName,
        item.name,
        item.currencyAbbreviation,
        item.chain,
        chainDisplayName,
        tokenDisplayName,
      ]
        .filter(Boolean)
        .join('\u0000')
        .toLowerCase();

      return {item, searchText};
    });
  }, [getSupportedOption, hasActiveQuery, hasDeferredQuery, visibleItems]);

  const filteredItems: AssetRowItem[] = useMemo(() => {
    if (!hasActiveQuery || !hasDeferredQuery) {
      return visibleItems;
    }

    return searchableVisibleItems
      .filter(({searchText}) => searchText.includes(normalizedDeferredQuery))
      .map(({item}) => item);
  }, [
    hasActiveQuery,
    hasDeferredQuery,
    normalizedDeferredQuery,
    searchableVisibleItems,
    visibleItems,
  ]);

  const historicalRateRequests = useMemo(() => {
    return filteredItems
      .map(item =>
        getHistoricalRateAssetRequestFromItem(
          item,
          defaultAltCurrency?.isoCode || 'USD',
        ),
      )
      .filter(
        (request): request is HistoricalRateAssetRequest => request != null,
      )
      .map(request => ({
        coin: request.coin,
        chain: request.chain,
        tokenAddress: request.tokenAddress,
        intervals: [...FIAT_RATE_SERIES_CACHED_INTERVALS],
      }));
  }, [defaultAltCurrency?.isoCode, filteredItems]);

  useRuntimeFiatRateSeriesCache({
    quoteCurrency,
    requests: historicalRateRequests,
    maxAgeMs: HISTORIC_RATES_CACHE_DURATION * 1000,
    enabled: filteredItems.length > 0,
  });

  const renderListHeader = useMemo(() => {
    return (
      <FiltersRow>
        <SearchInputContainer>
          <SearchIconContainer>
            <SearchSvg height={16} width={16} />
          </SearchIconContainer>
          <StyledTextInput
            value={query}
            placeholder={t('Search assets')}
            placeholderTextColor={theme.dark ? '#9BA3AE' : '#6B7280'}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            testID="all-assets-search-input"
            accessibilityLabel="Search assets"
          />
        </SearchInputContainer>

        {portfolioChartsEnabled ? (
          <AssetsGainLossDropdown
            value={gainLossMode}
            onChange={setGainLossMode}
          />
        ) : null}
      </FiltersRow>
    );
  }, [gainLossMode, portfolioChartsEnabled, query, t, theme.dark]);

  const renderItem = useCallback(
    ({item, index}: ListRenderItemInfo<AssetRowItem>) => {
      const {img, imgSrc} = getAssetIconData(item);
      const isRowPopulateLoading = getAssetRowPopulateLoading({
        populateInProgress,
        showPnlPlaceholder: item.showPnlPlaceholder,
        rowLoadingByKey: isPopulateLoadingByKey,
        rowKey: item.key,
      });
      const isRowScopedPnlLoading = !!item.showScopedPnlLoading;
      const isRowPnlLoading = getAssetRowPnlLoading({
        isPnlLoading,
        isRowPopulateLoading,
        showScopedPnlLoading: isRowScopedPnlLoading,
      });

      return (
        <AssetRow
          item={item}
          isLast={index === filteredItems.length - 1}
          keyId={keyId}
          isPnlLoading={isRowPnlLoading}
          isPopulateLoading={isRowPopulateLoading}
          presentationResetToken={presentationResetToken}
          img={img}
          imgSrc={imgSrc}
        />
      );
    },
    [
      filteredItems.length,
      getAssetIconData,
      isPnlLoading,
      isPopulateLoadingByKey,
      keyId,
      presentationResetToken,
      populateInProgress,
    ],
  );

  const keyExtractor = useCallback((item: AssetRowItem) => item.key, []);

  const renderEmpty = useCallback(() => {
    if (!visibleItems.length) {
      return (
        <EmptyListContainer>
          <GhostSvg style={{marginTop: 20}} />
          <H5 style={{marginTop: 18}}>{t("It's a ghost town in here")}</H5>
        </EmptyListContainer>
      );
    }

    if (query.trim().length) {
      return (
        <EmptyListContainer>
          <GhostSvg style={{marginTop: 20}} />
          <H5 style={{marginTop: 18}}>{t('No assets match your search')}</H5>
          <EmptySubtext>
            {t('Try a different name, symbol, or chain.')}
          </EmptySubtext>
        </EmptyListContainer>
      );
    }

    return null;
  }, [query, t, visibleItems.length]);

  return (
    <ScreenContainer>
      <FlashList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{paddingHorizontal: LIST_HORIZONTAL_GUTTER}}
        estimatedItemSize={74}
        maintainVisibleContentPosition={{disabled: true}}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </ScreenContainer>
  );
};

export default AllAssets;
