import React, {useCallback, useMemo, useState} from 'react';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import {
  ActiveOpacity,
  CtaContainerAbsolute,
} from '../../../../../../components/styled/Containers';
import {H7} from '../../../../../../components/styled/Text';
import HamburgerSvg from '../../../../../../../assets/img/hamburger.svg';
import Button from '../../../../../../components/button/Button';
import {FlatList} from 'react-native';
import {useAppDispatch, useAppSelector} from '../../../../../../utils/hooks';
import {
  dismissOnGoingProcessModal,
  setHomeCarouselConfig,
  setHomeCarouselLayoutType,
} from '../../../../../../store/app/app.actions';
import {useNavigation} from '@react-navigation/native';
import {sleep} from '../../../../../../utils/helper-methods';
import haptic from '../../../../../../components/haptic-feedback/haptic';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {ScreenOptions} from '../../../../../../styles/tabNavigator';
import {useTheme} from 'styled-components/native';
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

  const toggle = useCallback(
    (item: CustomizeItem) => {
      const newItem = {...item};
      const {show, key} = newItem;

      newItem.show = !show;
      setDirty(true);
      if (show) {
        setVisibleList(visibleList.filter(vi => vi.key !== key));
        setHiddenList(hiddenList.concat(newItem));
      } else {
        setHiddenList(hiddenList.filter(hi => hi.key !== key));
        setVisibleList(visibleList.concat(newItem));
      }
    },
    [hiddenList, visibleList],
  );

  const visibleRenderItem = ({item, drag, isActive}: RenderItemParams<any>) => {
    return (
      <ScaleDecorator>
        <CustomizeCardContainer
          delayLongPress={100}
          onLongPress={() => {
            haptic('soft');
            drag();
          }}
          disabled={isActive}
          activeOpacity={ActiveOpacity}>
          <HamburgerContainer>
            <HamburgerSvg />
          </HamburgerContainer>
          <CustomizeCard item={item} toggle={() => toggle(item)} />
        </CustomizeCardContainer>
      </ScaleDecorator>
    );
  };

  const ListFooterComponent = () => {
    return (
      <ListFooterButtonContainer>
        <Button
          disabled={!dirty}
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
            navigation.goBack();
            dispatch(dismissOnGoingProcessModal());
          }}
          buttonStyle={'primary'}>
          {t('Save Layout')}
        </Button>
      </ListFooterButtonContainer>
    );
  };

  const memoizedFooterList = useMemo(() => {
    return (
      <FlatList
        ListHeaderComponent={() => {
          return hiddenList.length ? <ListHeader>Hidden</ListHeader> : null;
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
          initialRouteName={
            layoutType === 'carousel' ? t('Carousel') : t('List View')
          }
          style={{marginTop: 20}}
          screenOptions={{
            ...ScreenOptions(),
            tabBarItemStyle: {
              flexDirection: 'row',
            },
            tabBarIconStyle: {
              justifyContent: 'center',
            },
          }}
          screenListeners={{
            tabPress: tab => {
              haptic('soft');
              if (tab.target) {
                setDirty(true);
                setLayoutType(
                  tab.target.includes('Carousel') ? 'carousel' : 'listView',
                );
              }
            },
          }}>
          <Tab.Screen
            name={t('Carousel')}
            component={Noop}
            options={{
              tabBarIcon: ({focused}) => (
                <CarouselSvg focused={focused} theme={theme} />
              ),
            }}
          />
          <Tab.Screen
            name={t('List View')}
            component={Noop}
            options={{
              tabBarIcon: ({focused}) => (
                <ListViewSvg focused={focused} theme={theme} />
              ),
            }}
          />
        </Tab.Navigator>
      </LayoutToggleContainer>

      <DraggableFlatList
        ListHeaderComponent={() =>
          visibleList.length ? <ListHeader>{t('Favorites')}</ListHeader> : null
        }
        ListFooterComponent={() => memoizedFooterList}
        contentContainerStyle={{paddingTop: 20, paddingBottom: 250}}
        onDragEnd={({data}) => {
          if (!dirty && visibleList[0]?.key !== data[0]?.key) {
            setDirty(true);
          }
          setVisibleList(data);
        }}
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
