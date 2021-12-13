import React, {useState} from 'react';
import debounce from 'lodash.debounce';
import styled, {css} from 'styled-components/native';
import {Action, Cloud, SlateDark} from '../../../../styles/colors';
import {View} from 'react-native';
import {SvgUri} from 'react-native-svg';
import {useForm, Controller} from 'react-hook-form';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {HEIGHT, WIDTH} from '../../../../components/styled/Containers';
import BoxInput from '../../../../components/form/BoxInput';
import GiftCardCarouselList from './GiftCardCarouselList';
import {purchasedBrands} from '../stubs/gift-cards';
import {H4, Paragraph} from '../../../../components/styled/Text';
import GiftCardCatalogItem from './GiftCardCatalogItem';
import GiftCardCreditsItem from './GiftCardCreditsItem';
import {CardConfig} from '../../../../store/shop/shop.models';

const horizontalPadding = 20;

const ListItemTouchableHighlight = styled.TouchableHighlight`
  padding-left: ${horizontalPadding}px;
  padding-right: ${horizontalPadding}px;
`;

const SectionContainer = styled.View`
  width: 100%;
  padding: 0 ${horizontalPadding}px;
`;

const SectionSpacer = styled.View`
  height: 30px;
`;

const SectionHeaderContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const SectionHeaderButton = styled.Text`
  margin-top: 32px;
  margin-bottom: 16px;
  color: ${Action};
  font-weight: 500;
`;

const SectionHeader = styled.Text`
  color: ${SlateDark};
  font-size: 14px;
  text-align: left;
  margin-bottom: 16px;
  margin-top: 40px;
  flex-grow: 1;
`;

const SectionDivider = styled.View`
  border-bottom-color: ${Cloud};
  border-bottom-width: 1px;
  margin: 20px ${horizontalPadding}px;
  margin-top: 40px;
  width: ${WIDTH - horizontalPadding * 2}px;
`;

const SearchBox = styled(BoxInput)`
  width: ${WIDTH - horizontalPadding * 2}px;
  font-size: 16px;
  position: relative;
`;

const SearchResults = styled.View`
  min-height: ${HEIGHT - 300}px;
`;

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

const NoResultsContainer = styled.View`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: ${HEIGHT - 300}px;
  padding-top: 20px;
`;

const NoResultsHeader = styled(H4)`
  font-size: 17px;
`;

export default ({
  scrollViewRef,
  availableGiftCards,
  curations,
  categories,
}: {
  scrollViewRef: any;
  availableGiftCards: CardConfig[];
  curations: any;
  categories: any;
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as any);
  const {control} = useForm();
  const purchasedBrandsHeight = purchasedBrands.length * 68 + 260;

  const updateSearchResults = debounce((text: string) => {
    setSearchVal(text);
    const newSearchResults = availableGiftCards.filter(giftCard =>
      giftCard.displayName.toLowerCase().includes(text.toLocaleLowerCase()),
    );
    setSearchResults(newSearchResults);
  }, 400);

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
                    y: purchasedBrands.length ? purchasedBrandsHeight : 150,
                    animated: true,
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
      {searchVal ? (
        searchResults.length ? (
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
        )
      ) : (
        <>
          {curations.map(curation => (
            <View key={curation.displayName}>
              <SectionContainer>
                <SectionHeader>{curation.displayName}</SectionHeader>
              </SectionContainer>
              <GiftCardCarouselList
                giftCards={curation.giftCards}
                screenWidth={WIDTH}
              />
            </View>
          ))}
          <SectionContainer>
            <SectionHeaderContainer>
              <SectionHeader>Categories</SectionHeader>
              <TouchableWithoutFeedback>
                <SectionHeaderButton>See all</SectionHeaderButton>
              </TouchableWithoutFeedback>
            </SectionHeaderContainer>
          </SectionContainer>
          {categories.map((category: any, index) => (
            <ListItemTouchableHighlight
              key={category.displayName}
              onPress={() => console.log('press', category.displayName)}
              underlayColor={'#fbfbff'}>
              <CategoryItem isLast={index === categories.length - 1}>
                <SvgUri height="21px" uri={category.icon} />
                <CategoryText>{category.displayName}</CategoryText>
              </CategoryItem>
            </ListItemTouchableHighlight>
          ))}
        </>
      )}
    </View>
  );
};
