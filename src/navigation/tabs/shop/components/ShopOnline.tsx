import {useNavigation} from '@react-navigation/native';
import debounce from 'lodash.debounce';
import React, {useMemo, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {View, TouchableOpacity} from 'react-native';
import styled, {useTheme} from 'styled-components/native';
import {ActiveOpacity, WIDTH} from '../../../../components/styled/Containers';
import {BaseText, Paragraph} from '../../../../components/styled/Text';
import {
  Category,
  DirectIntegrationApiObject,
} from '../../../../store/shop/shop.models';
import {MerchantScreens} from '../merchant/MerchantGroup';
import MerchantItem from './MerchantItem';
import ShopCarouselList, {ShopCarouselItem} from './ShopCarouselList';
import {
  HideableView,
  horizontalPadding,
  NoResultsContainer,
  NoResultsImgContainer,
  SearchBox,
  SectionContainer,
  SectionHeader,
  SectionHeaderButton,
  SectionHeaderContainer,
  SectionSpacer,
} from './styled/ShopTabComponents';
import GhostSvg from '../../../../../assets/img/ghost-cheeky.svg';
import {useTranslation} from 'react-i18next';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {Analytics} from '../../../../store/analytics/analytics.effects';

const SearchResults = styled.View`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  padding: 0 ${horizontalPadding}px;
`;

interface CategoryWithIntegrations extends Category {
  integrations: DirectIntegrationApiObject[];
}

const getItemComponent = (categoryHasDiscount: boolean) => {
  return (item: ShopCarouselItem) => {
    const merchantItem = item as DirectIntegrationApiObject;
    return (
      <MerchantItem
        merchant={merchantItem}
        height={categoryHasDiscount ? 200 : 168}
        width={133}
      />
    );
  };
};

const FullIntegrationsList = ({
  categories,
}: {
  categories: CategoryWithIntegrations[];
}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const itemWidth = 146;
  const maxItemsPerRow = 5;
  const windowSize = Math.min(Math.ceil(WIDTH / itemWidth) + 1, maxItemsPerRow);
  return (
    <>
      {categories.map(category => {
        const categoryHasDiscount = category.integrations.some(
          merchant => !!merchant.discount,
        );
        const itemHeight = categoryHasDiscount ? 206 : 174;
        return (
          <View key={category.displayName} style={{height: itemHeight + 73}}>
            <SectionContainer>
              <SectionHeaderContainer>
                <SectionHeader>{category.displayName}</SectionHeader>
                <TouchableOpacity
                  activeOpacity={ActiveOpacity}
                  onPress={() => {
                    navigation.navigate(MerchantScreens.MERCHANT_CATEGORY, {
                      category,
                      integrations: category.integrations,
                    });
                  }}>
                  <SectionHeaderButton>{t('See all')}</SectionHeaderButton>
                </TouchableOpacity>
              </SectionHeaderContainer>
            </SectionContainer>
            <ShopCarouselList
              itemHeight={itemHeight}
              items={category.integrations.slice(0, maxItemsPerRow)}
              itemComponent={getItemComponent(categoryHasDiscount)}
              itemWidth={itemWidth}
              marginLeft={12}
              maxItemsPerColumn={1}
              screenWidth={WIDTH}
              windowSize={windowSize}
              onItemPress={item =>
                navigation.navigate(MerchantScreens.MERCHANT_DETAILS, {
                  directIntegration: item as DirectIntegrationApiObject,
                })
              }
            />
          </View>
        );
      })}
    </>
  );
};

export const ShopOnline = ({
  scrollViewRef,
  integrations,
  categories,
}: {
  scrollViewRef: any;
  integrations: DirectIntegrationApiObject[];
  categories: CategoryWithIntegrations[];
}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const {control} = useForm();
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as typeof integrations);

  const updateSearchResults = useMemo(
    () =>
      debounce((text: string) => {
        setSearchVal(text);
        const newSearchResults = integrations.filter(integration =>
          integration.displayName
            .toLowerCase()
            .includes(text.toLocaleLowerCase()),
        );
        setSearchResults(newSearchResults);
        dispatch(Analytics.track('Searched Online Brands', {search: text}));
      }, 300),
    [dispatch, setSearchVal, integrations],
  );

  const defaultLanguage = useAppSelector(({APP}) => APP.defaultLanguage);

  const memoizedFullIntegrationsList = useMemo(
    () => <FullIntegrationsList categories={categories} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, defaultLanguage],
  );

  return (
    <>
      <SectionSpacer height={40} />
      <SectionContainer>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <SearchBox
              placeholder={t('Search for a brand')}
              onBlur={onBlur}
              onChangeText={(text: string) => {
                onChange(text);
                updateSearchResults(text);
              }}
              value={value}
              type={'search'}
              theme={theme}
              onFocus={() => {
                scrollViewRef &&
                  scrollViewRef.current &&
                  scrollViewRef.current.scrollTo({
                    x: 0,
                    y: 100,
                    animated: true,
                  });
              }}
            />
          )}
          name="search"
        />
      </SectionContainer>
      <HideableView show={!!(searchVal && !searchResults.length)}>
        <NoResultsContainer>
          <NoResultsContainer>
            <NoResultsImgContainer>
              <GhostSvg />
            </NoResultsImgContainer>
            <Paragraph>
              {t("We couldn't find a match for ")}
              <BaseText style={{fontWeight: 'bold'}}>{searchVal}</BaseText>.
            </Paragraph>
            <Paragraph>{t('Please try searching something else.')}</Paragraph>
          </NoResultsContainer>
        </NoResultsContainer>
      </HideableView>
      <HideableView show={!!(searchVal && searchResults.length)}>
        <SectionContainer>
          <SectionHeader>
            {t('Search Results for') + ' ' + searchVal}
          </SectionHeader>
        </SectionContainer>
        <SearchResults>
          {searchResults.map(integration => {
            return (
              <TouchableOpacity
                activeOpacity={ActiveOpacity}
                key={integration.displayName}
                onPress={() =>
                  navigation.navigate(MerchantScreens.MERCHANT_DETAILS, {
                    directIntegration: integration,
                  })
                }>
                <MerchantItem
                  merchant={integration}
                  height={200}
                  key={integration.displayName}
                />
              </TouchableOpacity>
            );
          })}
        </SearchResults>
      </HideableView>
      <HideableView show={!searchVal}>
        {memoizedFullIntegrationsList}
      </HideableView>
    </>
  );
};
