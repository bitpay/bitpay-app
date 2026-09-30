import React, {memo, useCallback, useMemo, useState} from 'react';
import ReorderableList, {
  ReorderableListReorderEvent,
  reorderItems,
  useReorderableDrag,
} from 'react-native-reorderable-list';
import {
  ActiveOpacity,
  CtaContainerAbsolute,
} from '../../../../../../components/styled/Containers';
import {BaseText, H7} from '../../../../../../components/styled/Text';
import HamburgerSvg from '../../../../../../../assets/img/hamburger.svg';
import Button from '../../../../../../components/button/Button';
import {useAppDispatch, useAppSelector} from '../../../../../../utils/hooks';
import {setHomeCarouselLayoutType} from '../../../../../../store/app/app.actions';
import {setHomeCarouselConfigAndPopulateNewlyVisibleKeys} from '../../../../../../store/app/homeCarousel.effects';
import {useNavigation} from '@react-navigation/native';
import {sleep} from '../../../../../../utils/helper-methods';
import haptic from '../../../../../../components/haptic-feedback/haptic';
import {
  CarouselSvg,
  createCustomizeCardList,
  CustomizeCard,
  CustomizeCardContainer,
  CustomizeHomeContainer,
  CustomizeItem,
  HamburgerContainer,
  LayoutToggleContainer,
  ListFooterButtonContainer,
  ListHeader,
  ListViewSvg,
} from './Shared';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import {COINBASE_ENV} from '../../../../../../api/coinbase/coinbase.constants';
import {useTranslation} from 'react-i18next';
import {Analytics} from '../../../../../../store/analytics/analytics.effects';
import {useOngoingProcess, useTheme} from '../../../../../../contexts';
import {StyleSheet, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
  Action,
  LightBlack,
  NeutralSlate,
  SlateDark,
} from '../../../../../../styles/colors';

type LayoutType = 'carousel' | 'listView';

const styles = StyleSheet.create({
  layoutSelector: {
    alignSelf: 'center',
    borderRadius: 50,
    flexDirection: 'row',
    height: 56,
    marginTop: 20,
    padding: 5,
    width: 320,
  },
  layoutOption: {
    alignItems: 'center',
    borderRadius: 50,
    flexDirection: 'row',
    gap: 5,
    height: 44,
    justifyContent: 'center',
    width: 150,
  },
  layoutOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

const LayoutSelector = memo(
  ({
    initialLayoutType,
    layoutType,
    onChange,
  }: {
    initialLayoutType: LayoutType;
    layoutType: LayoutType;
    onChange: (layoutType: LayoutType) => void;
  }) => {
    const {t} = useTranslation();
    const theme = useTheme();
    const options: LayoutType[] =
      initialLayoutType === 'carousel'
        ? ['carousel', 'listView']
        : ['listView', 'carousel'];

    return (
      <View
        style={[
          styles.layoutSelector,
          {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        ]}>
        {options.map(option => {
          const focused = option === layoutType;

          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.layoutOption,
                {backgroundColor: focused ? Action : 'transparent'},
              ]}
              onPress={() => {
                if (option !== layoutType) {
                  haptic('soft');
                  onChange(option);
                }
              }}>
              {option === 'carousel' ? (
                <CarouselSvg focused={focused} theme={theme} />
              ) : (
                <ListViewSvg focused={focused} theme={theme} />
              )}
              <BaseText
                style={[
                  styles.layoutOptionText,
                  {
                    color: theme.dark
                      ? NeutralSlate
                      : focused
                      ? NeutralSlate
                      : SlateDark,
                  },
                ]}>
                {option === 'carousel' ? t('Carousel') : t('List View')}
              </BaseText>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  },
);
LayoutSelector.displayName = 'LayoutSelector';

const VisibleRow = memo(function VisibleRow({
  item,
  onToggle,
}: {
  item: CustomizeItem;
  onToggle: (item: CustomizeItem) => void;
}) {
  const drag = useReorderableDrag();

  return (
    <CustomizeCardContainer
      delayLongPress={100}
      onLongPress={() => {
        haptic('soft');
        drag();
      }}
      activeOpacity={ActiveOpacity}>
      <HamburgerContainer>
        <HamburgerSvg />
      </HamburgerContainer>
      <CustomizeCard item={item} toggle={() => onToggle(item)} />
    </CustomizeCardContainer>
  );
});

const CustomizeHomeSettings = () => {
  const {t} = useTranslation();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  useAndroidBackHandler(() => true);
  const dispatch = useAppDispatch();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig)!;
  const defaultLayoutType = useAppSelector(
    ({APP}) => APP.homeCarouselLayoutType,
  );
  const hasCoinbase = useAppSelector(
    ({COINBASE}) => !!COINBASE.token[COINBASE_ENV],
  );
  const [initialLayoutType] = useState(defaultLayoutType);
  const [layoutType, setLayoutType] = useState(defaultLayoutType);
  const navigation = useNavigation();
  const [initialLists] = useState(() =>
    createCustomizeCardList({
      keys: Object.values(keys),
      hasCoinbase,
      homeCarouselConfig,
    }),
  );
  const [visibleList, setVisibleList] = useState(initialLists[0]);
  const [dirty, setDirty] = useState(false);
  const [hiddenList, setHiddenList] = useState(initialLists[1]);

  const toggle = useCallback((item: CustomizeItem) => {
    const newItem = {...item};
    const {show} = newItem;

    newItem.show = !show;
    setDirty(true);
    if (show) {
      setVisibleList(prev => prev.filter(vi => vi.key !== item.key));
      setHiddenList(prev => prev.concat(newItem));
    } else {
      setHiddenList(prev => prev.filter(hi => hi.key !== item.key));
      setVisibleList(prev => prev.concat(newItem));
    }
  }, []);

  const visibleRenderItem = useCallback(
    ({item}: {item: CustomizeItem}) => (
      <VisibleRow item={item} onToggle={toggle} />
    ),
    [toggle],
  );

  const handleReorder = useCallback(
    ({from, to}: ReorderableListReorderEvent) => {
      if (!dirty && from !== to) {
        setDirty(true);
      }
      setVisibleList(prev => reorderItems(prev, from, to));
    },
    [dirty],
  );

  const ListFooterComponent = () => {
    return (
      <ListFooterButtonContainer>
        <Button
          disabled={!dirty && defaultLayoutType === layoutType}
          onPress={async () => {
            showOngoingProcess('SAVING_LAYOUT');
            await sleep(1000);
            const list = [...visibleList, ...hiddenList].map(({key, show}) => ({
              id: key,
              show: !!show,
            }));
            dispatch(
              Analytics.track('Save Layout', {
                layoutType: layoutType,
              }),
            );
            dispatch(setHomeCarouselConfigAndPopulateNewlyVisibleKeys(list));
            dispatch(setHomeCarouselLayoutType(layoutType));
            hideOngoingProcess();
            await sleep(200);
            navigation.goBack();
          }}
          buttonStyle={'primary'}>
          {t('Save Layout')}
        </Button>
      </ListFooterButtonContainer>
    );
  };

  const hiddenItems = useMemo(() => {
    return (
      <>
        {hiddenList.length ? <ListHeader>{t('Hidden')}</ListHeader> : null}
        {hiddenList.map(item => (
          <CustomizeCardContainer activeOpacity={ActiveOpacity} key={item.key}>
            <CustomizeCard item={item} toggle={() => toggle(item)} />
          </CustomizeCardContainer>
        ))}
      </>
    );
  }, [hiddenList, t, toggle]);

  const renderHiddenItems = useCallback(() => hiddenItems, [hiddenItems]);
  const renderVisibleHeader = useCallback(
    () =>
      visibleList.length ? <ListHeader>{t('Favorites')}</ListHeader> : null,
    [t, visibleList.length],
  );

  return (
    <CustomizeHomeContainer>
      <LayoutToggleContainer>
        <H7>{t('Home Layout')}</H7>
        <LayoutSelector
          initialLayoutType={initialLayoutType}
          layoutType={layoutType}
          onChange={setLayoutType}
        />
      </LayoutToggleContainer>

      <ReorderableList
        ListHeaderComponent={renderVisibleHeader}
        ListFooterComponent={renderHiddenItems}
        contentContainerStyle={{paddingTop: 20, paddingBottom: 250}}
        onReorder={handleReorder}
        data={visibleList}
        renderItem={visibleRenderItem}
        keyExtractor={item => item.key}
      />
      <CtaContainerAbsolute
        background={true}
        style={{
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }}>
        <ListFooterComponent />
      </CtaContainerAbsolute>
    </CustomizeHomeContainer>
  );
};

export default CustomizeHomeSettings;
