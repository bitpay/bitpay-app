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
import {H7} from '../../../../../../components/styled/Text';
import HamburgerSvg from '../../../../../../../assets/img/hamburger.svg';
import Button from '../../../../../../components/button/Button';
import {FlashList} from '@shopify/flash-list';
import {useAppDispatch, useAppSelector} from '../../../../../../utils/hooks';
import {
  dismissOnGoingProcessModal,
  setHomeCarouselConfig,
  setHomeCarouselLayoutType,
} from '../../../../../../store/app/app.actions';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '@react-navigation/native';
import {sleep} from '../../../../../../utils/helper-methods';
import haptic from '../../../../../../components/haptic-feedback/haptic';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
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
import {startOnGoingProcessModal} from '../../../../../../store/app/app.effects';
import {Analytics} from '../../../../../../store/analytics/analytics.effects';
import CustomTabBar from '../../../../../../components/custom-tab-bar/CustomTabBar';

// Layout selector
const Noop = () => null;

const CustomizeHomeSettings = () => {
  const {t} = useTranslation();
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
  const theme = useTheme();
  const [_visible, _hidden] = createCustomizeCardList({
    keys: Object.values(keys),
    hasCoinbase,
    homeCarouselConfig,
  });
  const [visibleList, setVisibleList] = useState(_visible);
  const [dirty, setDirty] = useState(false);
  const [hiddenList, setHiddenList] = useState(_hidden);
  const Tab = createMaterialTopTabNavigator();

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

  const VisibleRow = memo(function VisibleRow({
    item,
    onToggle,
  }: {
    item: CustomizeItem;
    onToggle: (i: CustomizeItem) => void;
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
            dispatch(startOnGoingProcessModal('SAVING_LAYOUT'));
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
            dispatch(setHomeCarouselConfig(list));
            dispatch(setHomeCarouselLayoutType(layoutType));
            dispatch(dismissOnGoingProcessModal());
            await sleep(200);
            navigation.goBack();
          }}
          buttonStyle={'primary'}>
          {t('Save Layout')}
        </Button>
      </ListFooterButtonContainer>
    );
  };

  const memoizedFooterList = useMemo(() => {
    return (
      <FlashList
        ListHeaderComponent={() => {
          return hiddenList.length ? (
            <ListHeader>{t('Hidden')}</ListHeader>
          ) : null;
        }}
        contentContainerStyle={{paddingBottom: 250}}
        data={hiddenList}
        renderItem={({item}: any) => {
          return (
            <CustomizeCardContainer activeOpacity={ActiveOpacity}>
              <CustomizeCard item={item} toggle={() => toggle(item)} />
            </CustomizeCardContainer>
          );
        }}
        keyExtractor={item => item.key}
      />
    );
  }, [hiddenList, toggle]);

  return (
    <CustomizeHomeContainer>
      <LayoutToggleContainer>
        <H7>{t('Home Layout')}</H7>
        <Tab.Navigator
          initialRouteName={layoutType}
          style={{marginTop: 20}}
          tabBar={props => <CustomTabBar {...props} />}
          screenListeners={{
            tabPress: tab => {
              haptic('soft');
              if (tab.target) {
                const _layoutType = tab.target.split('-')[0] as
                  | 'carousel'
                  | 'listView';
                setLayoutType(_layoutType);
              }
            },
          }}>
          {initialLayoutType === 'carousel' ? (
            <>
              <Tab.Screen
                name={'carousel'}
                component={Noop}
                options={{
                  tabBarLabel: t('Carousel'),
                  tabBarIcon: ({focused}) => (
                    <CarouselSvg focused={focused} theme={theme} />
                  ),
                }}
              />
              <Tab.Screen
                name={'listView'}
                component={Noop}
                options={{
                  tabBarLabel: t('List View'),
                  tabBarIcon: ({focused}) => (
                    <ListViewSvg focused={focused} theme={theme} />
                  ),
                }}
              />
            </>
          ) : (
            <>
              <Tab.Screen
                name={'listView'}
                component={Noop}
                options={{
                  tabBarLabel: t('List View'),
                  tabBarIcon: ({focused}) => (
                    <ListViewSvg focused={focused} theme={theme} />
                  ),
                }}
              />
              <Tab.Screen
                name={'carousel'}
                component={Noop}
                options={{
                  tabBarLabel: t('Carousel'),
                  tabBarIcon: ({focused}) => (
                    <CarouselSvg focused={focused} theme={theme} />
                  ),
                }}
              />
            </>
          )}
        </Tab.Navigator>
      </LayoutToggleContainer>

      <ReorderableList
        ListHeaderComponent={() =>
          visibleList.length ? <ListHeader>{t('Favorites')}</ListHeader> : null
        }
        ListFooterComponent={() => memoizedFooterList}
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
