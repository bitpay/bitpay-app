import React, {useEffect, useMemo, useState} from 'react';
import debounce from 'lodash.debounce';
import {useTheme} from 'styled-components/native';
import pickBy from 'lodash.pickby';
import uniqBy from 'lodash.uniqby';
import {Platform, View, TouchableOpacity} from 'react-native';
import {useForm, Controller} from 'react-hook-form';
import {ActiveOpacity, WIDTH} from '../../../../components/styled/Containers';
import ShopCarouselList, {ShopCarouselItem} from './ShopCarouselList';
import {BaseText, Paragraph} from '../../../../components/styled/Text';
import GiftCardItem from './GiftCardItem';
import {
  CardConfig,
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
import {useNavigation} from '@react-navigation/native';
import {GiftCardScreens} from '../gift-card/GiftCardGroup';
import MyGiftCards from './MyGiftCards';
import FilterSheet, {initializeCategoryMap} from './FilterSheet';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {APP_NETWORK} from '../../../../constants/config';
import GhostSvg from '../../../../../assets/img/ghost-cheeky.svg';
import {useTranslation} from 'react-i18next';
import {Analytics} from '../../../../store/analytics/analytics.effects';

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
            itemHeight={85}
            maxItemsPerColumn={3}
            screenWidth={WIDTH}
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
  curations,
  categories,
  onSelectedGiftCardsChange,
}: {
  scrollViewRef: any;
  availableGiftCards: CardConfig[];
  supportedGiftCards: CardConfig[];
  curations: GiftCardCuration[];
  categories: CategoryWithGiftCards[];
  onSelectedGiftCardsChange: (newNumSelectedGiftCards: number) => void;
}) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const giftCards = useAppSelector(
    ({SHOP}) => SHOP.giftCards[APP_NETWORK],
  ) as GiftCard[];
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as CardConfig[]);
  const [isFilterSheetShown, setIsFilterSheetShown] = useState(false);
  const [purchasedGiftCards, setPurchasedGiftCards] = useState<GiftCard[]>([]);
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
          .filter(c => ['PENDING', 'SUCCESS', 'SYNCED'].includes(c.status))
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          ),
      ),
    [giftCards],
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
            <SectionDivider />
            <SectionSpacer height={20} />
          </>
        ) : (
          <SectionSpacer height={40} />
        )}
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
                <BaseText style={{fontWeight: 'bold'}}>{searchVal}</BaseText>.
              </Paragraph>
              <Paragraph>{t('Please try searching something else.')}</Paragraph>
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
                onPress={() => setIsFilterSheetShown(!isFilterSheetShown)}>
                <SectionHeaderButton>
                  {t('Filter')}
                  {numSelectedCategories ? ` (${numSelectedCategories})` : null}
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
      </View>
    </>
  );
};
