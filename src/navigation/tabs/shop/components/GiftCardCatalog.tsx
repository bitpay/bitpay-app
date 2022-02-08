import React, {useMemo, useState} from 'react';
import debounce from 'lodash.debounce';
import {useTheme} from 'styled-components/native';
import pickBy from 'lodash.pickby';
import uniqBy from 'lodash.uniqby';
import {Platform, View} from 'react-native';
import {useForm, Controller} from 'react-hook-form';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {WIDTH} from '../../../../components/styled/Containers';
import ShopCarouselList, {ShopCarouselItem} from './ShopCarouselList';
import {purchasedGiftCards} from '../stubs/gift-cards';
import {Paragraph} from '../../../../components/styled/Text';
import GiftCardItem from './GiftCardItem';
import {
  CardConfig,
  Category,
  GiftCardCuration,
} from '../../../../store/shop/shop.models';
import {
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
import {useNavigation} from '@react-navigation/native';
import {GiftCardScreens} from '../gift-card/GiftCardStack';
import MyGiftCards from './MyGiftCards';
import FilterSheet, {initializeCategoryMap} from './FilterSheet';

const Curations = ({
  curations,
  underlayColor,
}: {
  curations: GiftCardCuration[];
  underlayColor: string;
}) => {
  const navigation = useNavigation();
  return (
    <>
      {curations.map(curation => (
        <View key={curation.displayName}>
          <SectionContainer>
            <SectionHeader>{curation.displayName}</SectionHeader>
          </SectionContainer>
          <ShopCarouselList
            items={curation.giftCards}
            itemComponent={(item: ShopCarouselItem) => (
              <GiftCardItem cardConfig={item as CardConfig} />
            )}
            itemUnderlayColor={underlayColor}
            itemWidthInLastSlide={WIDTH}
            maxItemsPerColumn={3}
            screenWidth={WIDTH}
            onItemPress={item => {
              navigation.navigate('GiftCard', {
                screen: GiftCardScreens.BUY_GIFT_CARD,
                params: {cardConfig: item as CardConfig},
              });
            }}
          />
        </View>
      ))}
    </>
  );
};
interface CategoryWithGiftCards extends Category {
  giftCards: CardConfig[];
}

const getNumSelectedCategories = (
  selectedCategoryMap: ReturnType<typeof initializeCategoryMap>,
) => {
  return Object.values(selectedCategoryMap).filter(selected => selected).length;
};

const getSelectedGiftCards = (
  availableGiftCards: CardConfig[],
  categories: CategoryWithGiftCards[],
  selectedCategoryMap: ReturnType<typeof initializeCategoryMap>,
) => {
  return getNumSelectedCategories(selectedCategoryMap)
    ? uniqBy(
        Object.keys(pickBy(selectedCategoryMap, selected => selected)).reduce(
          (giftCards, categoryName) => {
            const categoryObj = categories.find(
              category => category.displayName === categoryName,
            ) as CategoryWithGiftCards;
            return [...giftCards, ...categoryObj.giftCards];
          },
          [] as CardConfig[],
        ),
        'name',
      )
    : availableGiftCards;
};

export default ({
  scrollViewRef,
  availableGiftCards,
  curations,
  categories,
  onSelectedGiftCardsChange,
}: {
  scrollViewRef: any;
  availableGiftCards: CardConfig[];
  curations: GiftCardCuration[];
  categories: CategoryWithGiftCards[];
  onSelectedGiftCardsChange: (newNumSelectedGiftCards: number) => void;
}) => {
  const navigation = useNavigation();
  const theme = useTheme();
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as CardConfig[]);
  const [isFilterSheetShown, setIsFilterSheetShown] = useState(false);
  const [selectedCategoryMap, setSelectedCategoryMap] = useState(
    initializeCategoryMap(categories.map(category => category.displayName)),
  );
  const [selectedGiftCards, setSelectedGiftCards] =
    useState(availableGiftCards);
  const numSelectedCategories = getNumSelectedCategories(selectedCategoryMap);
  const {control} = useForm();
  const activeGiftCards = purchasedGiftCards.filter(
    giftCard => !giftCard.archived,
  );
  const numActiveGiftCards = activeGiftCards.length;
  const activeGiftCardsHeight = numActiveGiftCards * 60 + 260;

  const updateSearchResults = debounce((text: string) => {
    setSearchVal(text);
    const newSearchResults = availableGiftCards.filter(giftCard =>
      giftCard.displayName.toLowerCase().includes(text.toLocaleLowerCase()),
    );
    setSearchResults(newSearchResults);
  }, 300);

  const underlayColor = theme.dark ? '#121212' : '#fbfbff';

  const memoizedCurations = useMemo(
    () => <Curations curations={curations} underlayColor={underlayColor} />,
    [curations, underlayColor],
  );

  return (
    <>
      <FilterSheet
        isVisible={isFilterSheetShown}
        closeModal={() => setIsFilterSheetShown(false)}
        categories={selectedCategoryMap}
        onSelectionChange={newCategoryMap => {
          setSelectedCategoryMap(newCategoryMap);
          const newSelectedGiftCards = getSelectedGiftCards(
            availableGiftCards,
            categories,
            newCategoryMap,
          );
          setSelectedGiftCards(newSelectedGiftCards);
          onSelectedGiftCardsChange(newSelectedGiftCards.length);
        }}
      />
      <View>
        {purchasedGiftCards.length ? (
          <>
            <MyGiftCards
              giftCards={purchasedGiftCards}
              supportedGiftCards={availableGiftCards}
            />
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
                theme={theme}
                onBlur={onBlur}
                onFocus={() => {
                  scrollViewRef &&
                    scrollViewRef.current &&
                    scrollViewRef.current.scrollTo({
                      x: 0,
                      y: numActiveGiftCards
                        ? activeGiftCardsHeight + 15
                        : purchasedGiftCards.length
                        ? 300
                        : 160,
                      animated: Platform.select({
                        ios: true,
                        android: !numActiveGiftCards,
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
                  onPress={() => {
                    navigation.navigate('GiftCard', {
                      screen: GiftCardScreens.BUY_GIFT_CARD,
                      params: {cardConfig},
                    });
                  }}
                  underlayColor={underlayColor}>
                  <GiftCardItem cardConfig={cardConfig} />
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
              <SectionHeader>All Gift Cards</SectionHeader>
              <TouchableWithoutFeedback
                onPress={() => setIsFilterSheetShown(!isFilterSheetShown)}>
                <SectionHeaderButton>
                  Filter
                  {numSelectedCategories ? ` (${numSelectedCategories})` : null}
                </SectionHeaderButton>
              </TouchableWithoutFeedback>
            </SectionHeaderContainer>
          </SectionContainer>
          <SearchResults>
            {selectedGiftCards.map((cardConfig: CardConfig) => (
              <ListItemTouchableHighlight
                key={cardConfig.name}
                onPress={() => {
                  navigation.navigate('GiftCard', {
                    screen: GiftCardScreens.BUY_GIFT_CARD,
                    params: {cardConfig},
                  });
                }}
                underlayColor={underlayColor}>
                <GiftCardItem cardConfig={cardConfig} />
              </ListItemTouchableHighlight>
            ))}
          </SearchResults>
        </HideableView>
      </View>
    </>
  );
};
