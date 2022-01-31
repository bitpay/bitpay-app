import { useTheme } from '@react-navigation/native';
import debounce from 'lodash.debounce';
import React, {useMemo, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {View} from 'react-native';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import styled from 'styled-components/native';
import {WIDTH} from '../../../../components/styled/Containers';
import {Paragraph} from '../../../../components/styled/Text';
import {
  Category,
  DirectIntegrationApiObject,
} from '../../../../store/shop/shop.models';
import MerchantItem from './MerchantItem';
import ShopCarouselList, {ShopCarouselItem} from './ShopCarouselList';
import {
  HideableView,
  horizontalPadding,
  NoResultsContainer,
  NoResultsHeader,
  SearchBox,
  SectionContainer,
  SectionHeader,
  SectionHeaderButton,
  SectionHeaderContainer,
  SectionSpacer,
} from './styled/ShopTabComponents';

const SearchResults = styled.View`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  padding: ${horizontalPadding}px;
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
  const theme = useTheme();
  const {control} = useForm();
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as typeof integrations);

  const updateSearchResults = debounce((text: string) => {
    setSearchVal(text);
    const newSearchResults = integrations.filter(integration =>
      integration.displayName.toLowerCase().includes(text.toLocaleLowerCase()),
    );
    setSearchResults(newSearchResults);
  }, 300);

  const FullIntegrationsList = () => (
    <>
      {categories.map(category => (
        <View key={category.displayName}>
          <SectionContainer>
            <SectionHeaderContainer>
              <SectionHeader>{category.displayName}</SectionHeader>
              <TouchableWithoutFeedback>
                <SectionHeaderButton>See all</SectionHeaderButton>
              </TouchableWithoutFeedback>
            </SectionHeaderContainer>
          </SectionContainer>
          <ShopCarouselList
            items={category.integrations}
            itemComponent={(item: ShopCarouselItem) => (
              <MerchantItem
                merchant={item as DirectIntegrationApiObject}
                marginLeft={horizontalPadding}
                height={168}
                width={133}
                headerMargin={37}
              />
            )}
            itemWidth={146}
            maxItemsPerColumn={1}
            screenWidth={WIDTH}
            onItemPress={item => console.log('merchant onItemPress', item)}
          />
        </View>
      ))}
    </>
  );

  const memoizedFullIntegrationsList = useMemo(
    () => <FullIntegrationsList />,
    [],
  );

  return (
    <>
      <SectionSpacer />
      <SectionContainer>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <SearchBox
              placeholder={'Search for a brand'}
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
                    y: 170,
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
          <NoResultsHeader>No Results</NoResultsHeader>
          <Paragraph>Please try searching something else.</Paragraph>
        </NoResultsContainer>
      </HideableView>
      <HideableView show={!!(searchVal && searchResults.length)}>
        <SearchResults>
          {searchResults.map(integration => (
            <MerchantItem
              merchant={integration}
              height={200}
              headerMargin={60}
              key={integration.displayName}
            />
          ))}
        </SearchResults>
      </HideableView>
      <HideableView show={!searchVal}>
        {memoizedFullIntegrationsList}
      </HideableView>
    </>
  );
};
