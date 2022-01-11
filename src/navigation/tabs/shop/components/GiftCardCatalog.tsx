import React, {useMemo, useState} from 'react';
import debounce from 'lodash.debounce';
import styled, {css} from 'styled-components/native';
import {Cloud} from '../../../../styles/colors';
import {Platform, View} from 'react-native';
import {SvgUri} from 'react-native-svg';
import {useForm, Controller} from 'react-hook-form';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {WIDTH} from '../../../../components/styled/Containers';
import ShopCarouselList, {ShopCarouselItem} from './ShopCarouselList';
import {purchasedBrands} from '../stubs/gift-cards';
import {Paragraph} from '../../../../components/styled/Text';
import GiftCardCatalogItem from './GiftCardCatalogItem';
import GiftCardCreditsItem from './GiftCardCreditsItem';
import {
  CardConfig,
  Category,
  GiftCardCuration,
} from '../../../../store/shop/shop.models';
import {
  CategoryItemTouchableHighlight,
  HideableView,
  ListItemTouchableHighlight,
  NoResultsContainer,
  NoResultsHeader,
  SearchBox,
  SearchResults,
  SectionContainer,
  SectionDivider,
  SectionHeader,
  SectionHeaderButton,
  SectionHeaderContainer,
  SectionSpacer,
} from './styled/ShopTabComponents';

interface CategoryItemProps {
  isLast: boolean;
}
const CategoryItem = styled.View<CategoryItemProps>`
  ${({isLast}) =>
    css`
      border-bottom-color: ${Cloud};
      width: 100%;
      border-bottom-width: ${isLast ? 0 : 1}px;
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 20px 0;
    `}
`;

const CategoryText = styled.Text`
  margin-left: 15px;
  font-size: 14px;
`;

const Curations = ({curations}: {curations: GiftCardCuration[]}) => (
  <>
    {curations.map(curation => (
      <View key={curation.displayName}>
        <SectionContainer>
          <SectionHeader>{curation.displayName}</SectionHeader>
        </SectionContainer>
        <ShopCarouselList
          items={curation.giftCards}
          itemComponent={(item: ShopCarouselItem) => (
            <GiftCardCatalogItem cardConfig={item as CardConfig} />
          )}
          itemUnderlayColor={'#fbfbff'}
          itemWidthInLastSlide={WIDTH}
          maxItemsPerColumn={3}
          screenWidth={WIDTH}
        />
      </View>
    ))}
  </>
);

export default ({
  scrollViewRef,
  availableGiftCards,
  curations,
  categories,
}: {
  scrollViewRef: any;
  availableGiftCards: CardConfig[];
  curations: GiftCardCuration[];
  categories: Category[];
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as CardConfig[]);
  const {control} = useForm();
  const purchasedBrandsHeight = purchasedBrands.length * 68 + 260;

  const updateSearchResults = debounce((text: string) => {
    setSearchVal(text);
    const newSearchResults = availableGiftCards.filter(giftCard =>
      giftCard.displayName.toLowerCase().includes(text.toLocaleLowerCase()),
    );
    setSearchResults(newSearchResults);
  }, 300);

  const memoizedCurations = useMemo(
    () => <Curations curations={curations} />,
    [curations],
  );

  return (
    <View>
      {purchasedBrands.length ? (
        <>
          <SectionContainer>
            <SectionHeader>My Gift Cards</SectionHeader>
            {purchasedBrands.map(purchasedBrand => {
              const brandConfig = availableGiftCards.find(
                cardConfig => cardConfig.name === purchasedBrand.name,
              ) as CardConfig;
              return (
                <GiftCardCreditsItem
                  key={purchasedBrand.name}
                  cardConfig={brandConfig}
                  amount={purchasedBrand.amount}
                />
              );
            })}
          </SectionContainer>
          <SectionDivider />
        </>
      ) : (
        <SectionSpacer />
      )}
      <SectionContainer>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <SearchBox
              placeholder={'Search Gift Cards'}
              onBlur={onBlur}
              onFocus={() => {
                scrollViewRef &&
                  scrollViewRef.current &&
                  scrollViewRef.current.scrollTo({
                    x: 0,
                    y: purchasedBrands.length
                      ? purchasedBrandsHeight + 15
                      : 160,
                    animated: Platform.select({
                      ios: true,
                      android: !purchasedBrands.length,
                    }),
                  });
              }}
              onChangeText={(text: string) => {
                onChange(text);
                updateSearchResults(text);
              }}
              value={value}
              type={'search'}
            />
          )}
          name="search"
        />
      </SectionContainer>
      <HideableView show={!!searchVal}>
        {searchResults.length ? (
          <SearchResults>
            {searchResults.map((cardConfig: CardConfig) => (
              <ListItemTouchableHighlight
                key={cardConfig.name}
                onPress={() => console.log('press', cardConfig.displayName)}
                underlayColor={'#fbfbff'}>
                <GiftCardCatalogItem cardConfig={cardConfig} />
              </ListItemTouchableHighlight>
            ))}
          </SearchResults>
        ) : (
          <NoResultsContainer>
            <NoResultsHeader>No Results</NoResultsHeader>
            <Paragraph>Please try searching something else.</Paragraph>
          </NoResultsContainer>
        )}
      </HideableView>
      <HideableView show={!searchVal}>
        {memoizedCurations}
        <SectionContainer>
          <SectionHeaderContainer>
            <SectionHeader>Categories</SectionHeader>
            <TouchableWithoutFeedback>
              <SectionHeaderButton>See all</SectionHeaderButton>
            </TouchableWithoutFeedback>
          </SectionHeaderContainer>
        </SectionContainer>
        {categories.map((category, index) => (
          <CategoryItemTouchableHighlight
            key={category.displayName}
            onPress={() => console.log('press', category.displayName)}
            underlayColor={'#fbfbff'}>
            <CategoryItem isLast={index === categories.length - 1}>
              <SvgUri height="21px" uri={category.icon} />
              <CategoryText>{category.displayName}</CategoryText>
            </CategoryItem>
          </CategoryItemTouchableHighlight>
        ))}
      </HideableView>
    </View>
  );
};
