import React, {
  useCallback,
  useDeferredValue,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {TextInput} from 'react-native';
import {FlashList, ListRenderItemInfo} from '@shopify/flash-list';
import styled, {useTheme} from 'styled-components/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';

import type {RootStackParamList} from '../../../../Root';
import {useStackScreenOptions} from '../../../utils/headerHelpers';
import {HeaderTitle, BaseText, H5} from '../../../../components/styled/Text';
import {ScreenGutter} from '../../../../components/styled/Containers';
import GhostSvg from '../../../../../assets/img/ghost-cheeky.svg';
import SearchSvg from '../../../../../assets/img/search.svg';

import {useAppSelector} from '../../../../utils/hooks';
import usePortfolioAssetRows from '../hooks/usePortfolioAssetRows';
import type {
  AssetRowItem,
  GainLossMode,
} from '../../../../utils/portfolio/assets';
import AssetRow from '../components/AssetRow';
import AssetsGainLossDropdown from '../components/AssetsGainLossDropdown';
import {
  BitpaySupportedCoins,
  BitpaySupportedTokens,
} from '../../../../constants/currencies';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {useAssetIconResolver} from '../hooks/useAssetIconResolver';

type Props = NativeStackScreenProps<RootStackParamList, 'AllAssets'>;
const LIST_HORIZONTAL_GUTTER = Number.parseInt(ScreenGutter, 10);

const ScreenContainer = styled.SafeAreaView`
  flex: 1;
`;

const FiltersRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0 12px;
  gap: 12px;
`;

const SearchInputContainer = styled.View`
  flex: 1;
  border-radius: 50px;
  flex-direction: row;
  align-items: center;
  padding: 10px 14px;
  border: 1px solid ${({theme: {dark}}) => (dark ? '#2C2F34' : '#E4E9EF')};
  background-color: ${({theme: {dark}}) => (dark ? 'transparent' : '#FFFFFF')};
`;

const StyledTextInput = styled(TextInput)`
  flex: 1;
  font-size: 12px;
  color: ${({theme}) => theme.colors.text};
  padding: 0;
  margin: 0;
`;

const SearchIconContainer = styled.View`
  margin-right: 8px;
`;

const EmptyListContainer = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
`;

const EmptySubtext = styled(BaseText)`
  margin-top: 8px;
  text-align: center;
  opacity: 0.8;
`;

const AllAssets: React.FC<Props> = ({navigation, route}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const commonOptions = useStackScreenOptions(theme);
  const portfolio = useAppSelector(({PORTFOLIO}) => PORTFOLIO);
  const populateInProgress = !!portfolio.populateStatus?.inProgress;
  const {getAssetIconData, getSupportedOption} = useAssetIconResolver();

  const [gainLossMode, setGainLossMode] = useState<GainLossMode>('1D');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const {visibleItems, isFiatLoading, isPopulateLoadingByKey} =
    usePortfolioAssetRows({
      gainLossMode,
      keyId: route.params?.keyId,
    });

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
          />
        </SearchInputContainer>

        <AssetsGainLossDropdown
          value={gainLossMode}
          onChange={setGainLossMode}
        />
      </FiltersRow>
    );
  }, [gainLossMode, query, t, theme.dark]);

  const renderItem = useCallback(
    ({item, index}: ListRenderItemInfo<AssetRowItem>) => {
      const {img, imgSrc} = getAssetIconData(item);

      const isRowPopulateLoading =
        isPopulateLoadingByKey?.[item.key] ?? populateInProgress;

      return (
        <AssetRow
          item={item}
          isLast={index === filteredItems.length - 1}
          isFiatLoading={isFiatLoading}
          isPopulateLoading={isRowPopulateLoading}
          img={img}
          imgSrc={imgSrc}
        />
      );
    },
    [
      filteredItems.length,
      getAssetIconData,
      isFiatLoading,
      isPopulateLoadingByKey,
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
