import React, {useCallback, useEffect, useMemo, useState} from 'react';
import debounce from 'lodash.debounce';
import styled, {useTheme} from 'styled-components/native';
import pickBy from 'lodash.pickby';
import uniqBy from 'lodash.uniqby';
import {Platform, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useForm, Controller} from 'react-hook-form';
import {ActiveOpacity, WIDTH} from '../../../../components/styled/Containers';
import ShopCarouselList, {ShopCarouselItem} from './ShopCarouselList';
import {
  BaseText,
  Paragraph,
  TextAlign,
} from '../../../../components/styled/Text';
import GiftCardItem from './GiftCardItem';
import {
  CardConfig,
  CardConfigMap,
  Category,
  GiftCard,
  GiftCardCuration,
} from '../../../../store/shop/shop.models';
import {
  HideableView,
  ListItemTouchableHighlight,
  NoResultsContainer,
  NoResultsImgContainer,
  SearchBox,
  SearchResults,
  SectionContainer,
  SectionDivider,
  SectionHeader,
  SectionHeaderButton,
  SectionHeaderContainer,
  SectionSpacer,
} from './styled/ShopTabComponents';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {GiftCardScreens} from '../gift-card/GiftCardGroup';
import MyGiftCards from './MyGiftCards';
import FilterSheet, {initializeCategoryMap} from './FilterSheet';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import GhostSvg from '../../../../../assets/img/ghost-cheeky.svg';
import {useTranslation} from 'react-i18next';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {isGiftCardDisplayable} from '../../../../lib/gift-cards/gift-card';

const ZeroState = styled.View`
  justify-content: center;
  align-items: center;
  padding: 100px 50px 0;
  text-align: center;
`;

const Curations = ({
  curations,
  underlayColor,
}: {
  curations: GiftCardCuration[];
  underlayColor: string;
}) => {
  const navigation = useNavigation();
  const itemHeight = 85;
  const maxItemsPerColumn = 3;
  const getNumRows = (giftCards: CardConfig[]) => {
    if (giftCards.length > maxItemsPerColumn) {
      return maxItemsPerColumn;
    }
    return giftCards.length;
  };
  return (
    <>
      {curations.map(curation => (
        <View
          key={curation.displayName}
          style={{height: itemHeight * getNumRows(curation.giftCards) + 70}}>
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
            itemHeight={itemHeight}
            maxItemsPerColumn={maxItemsPerColumn}
            screenWidth={WIDTH}
            windowSize={maxItemsPerColumn}
            onItemPress={item => {
              navigation.navigate(GiftCardScreens.BUY_GIFT_CARD, {
                cardConfig: item as CardConfig,
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
  supportedGiftCards,
  supportedGiftCardMap,
  curations,
  categories,
  onSelectedGiftCardsChange,
}: {
  scrollViewRef: any;
  availableGiftCards: CardConfig[];
  supportedGiftCards: CardConfig[];
  supportedGiftCardMap: CardConfigMap;
  curations: GiftCardCuration[];
  categories: CategoryWithGiftCards[];
  onSelectedGiftCardsChange: (newNumSelectedGiftCards: number) => void;
}) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const giftCards = useAppSelector(
    ({APP, SHOP}) => SHOP.giftCards[APP.network],
  ) as GiftCard[];
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as CardConfig[]);
  const [isFilterSheetShown, setIsFilterSheetShown] = useState(false);
  const [purchasedGiftCards, setPurchasedGiftCards] = useState<GiftCard[]>([]);
  const [isScreenFocused, setIsScreenFocused] = useState(false);
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
  const activeGiftCardsHeight = numActiveGiftCards * 62 + 215;

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, []),
  );

  const updateSearchResults = useMemo(
    () =>
      debounce((text: string) => {
        setSearchVal(text);
        const lowerCaseText = text.toLocaleLowerCase();
        const newSearchResults = availableGiftCards.filter(giftCard =>
          giftCard.displayName.toLowerCase().includes(lowerCaseText),
        );
        setSearchResults(newSearchResults);
        dispatch(Analytics.track('Searched Gift Cards', {search: text}));
      }, 300),
    [availableGiftCards, dispatch],
  );

  const underlayColor = theme.dark ? '#121212' : '#fbfbff';

  const memoizedCurations = useMemo(
    () => <Curations curations={curations} underlayColor={underlayColor} />,
    [curations, underlayColor],
  );

  const getYPos = () => {
    const yPos = numActiveGiftCards
      ? activeGiftCardsHeight
      : purchasedGiftCards.length
      ? 270
      : 100;
    return yPos;
  };

  useEffect(
    () =>
      setPurchasedGiftCards(
        giftCards
          .filter(giftCard =>
            isGiftCardDisplayable(giftCard, supportedGiftCardMap),
          )
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          ),
      ),
    [giftCards, supportedGiftCardMap],
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
            <MyGiftCards supportedGiftCards={supportedGiftCards} />
            {availableGiftCards.length ? <SectionDivider /> : null}
            <SectionSpacer height={20} />
          </>
        ) : (
          <SectionSpacer height={40} />
        )}
        {availableGiftCards.length ? (
          <>
            <SectionContainer>
              <Controller
                control={control}
                render={({field: {onChange, onBlur, value}}) => (
                  <SearchBox
                    placeholder={t('Search Gift Cards')}
                    theme={theme}
                    onBlur={onBlur}
                    onFocus={() => {
                      scrollViewRef &&
                        scrollViewRef.current &&
                        scrollViewRef.current.scrollTo({
                          x: 0,
                          y: getYPos(),
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
                  <SectionSpacer height={20} />
                  {searchResults.map((cardConfig: CardConfig) => (
                    <ListItemTouchableHighlight
                      key={cardConfig.name}
                      onPress={() => {
                        navigation.navigate(GiftCardScreens.BUY_GIFT_CARD, {
                          cardConfig,
                        });
                      }}
                      underlayColor={underlayColor}>
                      <GiftCardItem cardConfig={cardConfig} />
                    </ListItemTouchableHighlight>
                  ))}
                </SearchResults>
              ) : (
                <NoResultsContainer>
                  <NoResultsImgContainer>
                    <GhostSvg />
                  </NoResultsImgContainer>
                  <Paragraph>
                    {t("We couldn't find a match for ")}
                    <BaseText style={{fontWeight: 'bold'}}>
                      {searchVal}
                    </BaseText>
                    .
                  </Paragraph>
                  <Paragraph>
                    {t('Please try searching something else.')}
                  </Paragraph>
                </NoResultsContainer>
              )}
            </HideableView>
            <HideableView show={!searchVal}>
              {memoizedCurations}
              <SectionContainer>
                <SectionHeaderContainer>
                  <SectionHeader>{t('All Gift Cards')}</SectionHeader>
                  <TouchableOpacity
                    activeOpacity={ActiveOpacity}
                    onPress={() => {
                      if (!isScreenFocused) {
                        return;
                      }
                      setIsFilterSheetShown(!isFilterSheetShown);
                    }}>
                    <SectionHeaderButton>
                      {t('Filter')}
                      {numSelectedCategories
                        ? ` (${numSelectedCategories})`
                        : null}
                    </SectionHeaderButton>
                  </TouchableOpacity>
                </SectionHeaderContainer>
              </SectionContainer>
              <SearchResults>
                {selectedGiftCards.map((cardConfig: CardConfig) => (
                  <ListItemTouchableHighlight
                    key={cardConfig.name}
                    onPress={() => {
                      navigation.navigate(GiftCardScreens.BUY_GIFT_CARD, {
                        cardConfig,
                      });
                    }}
                    underlayColor={underlayColor}>
                    <GiftCardItem cardConfig={cardConfig} />
                  </ListItemTouchableHighlight>
                ))}
              </SearchResults>
            </HideableView>
          </>
        ) : (
          <ZeroState>
            <TextAlign align={'center'}>
              <Paragraph>
                {t(
                  'No gift cards are currently available for purchase in your region. Please check back later.',
                )}
              </Paragraph>
            </TextAlign>
          </ZeroState>
        )}
      </View>
    </>
  );
};
