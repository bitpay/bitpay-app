import {useNavigation} from '@react-navigation/native';
import debounce from 'lodash.debounce';
import React, {useMemo, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {View} from 'react-native';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import styled, {useTheme} from 'styled-components/native';
import {WIDTH} from '../../../../components/styled/Containers';
import {BaseText, Paragraph} from '../../../../components/styled/Text';
import {
  Category,
  DirectIntegrationApiObject,
} from '../../../../store/shop/shop.models';
import {MerchantScreens} from '../merchant/MerchantStack';
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

  const FullIntegrationsList = () => (
    <>
      {categories.map(category => (
        <View key={category.displayName}>
          <SectionContainer>
            <SectionHeaderContainer>
              <SectionHeader>{category.displayName}</SectionHeader>
              <TouchableWithoutFeedback
                onPress={() => {
                  navigation.navigate('Merchant', {
                    screen: MerchantScreens.MERCHANT_CATEGORY,
                    params: {
                      category,
                      integrations: category.integrations,
                    },
                  });
                }}>
                <SectionHeaderButton>{t('See all')}</SectionHeaderButton>
              </TouchableWithoutFeedback>
            </SectionHeaderContainer>
          </SectionContainer>
          <ShopCarouselList
            items={category.integrations.slice(0, 5)}
            itemComponent={(item: ShopCarouselItem) => {
              const categoryHasDiscount = category.integrations.some(
                merchant => !!merchant.discount,
              );
              const merchantItem = item as DirectIntegrationApiObject;
              return (
                <MerchantItem
                  merchant={merchantItem}
                  marginLeft={horizontalPadding}
                  height={categoryHasDiscount ? 200 : 168}
                  width={133}
                />
              );
            }}
            itemWidth={146}
            maxItemsPerColumn={1}
            screenWidth={WIDTH}
            onItemPress={item =>
              navigation.navigate('Merchant', {
                screen: MerchantScreens.MERCHANT_DETAILS,
                params: {
                  directIntegration: item as DirectIntegrationApiObject,
                },
              })
            }
          />
        </View>
      ))}
    </>
  );

  const defaultLanguage = useAppSelector(({APP}) => APP.defaultLanguage);

  const memoizedFullIntegrationsList = useMemo(
    () => <FullIntegrationsList />,
    [defaultLanguage],
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
          <SectionHeader>{t('Search Results for ') + searchVal}</SectionHeader>
        </SectionContainer>
        <SearchResults>
          {searchResults.map(integration => {
            return (
              <TouchableWithoutFeedback
                key={integration.displayName}
                onPress={() =>
                  navigation.navigate('Merchant', {
                    screen: MerchantScreens.MERCHANT_DETAILS,
                    params: {
                      directIntegration: integration,
                    },
                  })
                }>
                <MerchantItem
                  merchant={integration}
                  height={200}
                  key={integration.displayName}
                />
              </TouchableWithoutFeedback>
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
