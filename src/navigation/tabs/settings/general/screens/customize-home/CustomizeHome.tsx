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
import styled from 'styled-components/native';
import {
  Action,
  LightBlack,
  Slate,
  White,
} from '../../../../../../styles/colors';

const LayoutButtonsContainer = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : White)};
  margin: 15px 20px 20px 0;
  border-radius: 25px;
  padding: 5px 0;
  flex-direction: row;
  justify-content: space-around;
`;

const ButtonContainer = styled.TouchableOpacity<{selected: boolean}>`
  background-color: ${({selected}) => (selected ? Action : 'transparent')};
  padding: 15px 25px 13px 25px;
  flex-direction: row;
  align-content: space-around;
  border-radius: 20px;
`;

const ButtonText = styled.Text<{selected: boolean}>`
  color: ${({theme, selected}) =>
    selected ? White : theme.dark ? theme.colors.text : Slate};
  font-weight: 600;
  font-size: 16px;
  margin-top: -5px;
  margin-left: 15px;
`;

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
        <LayoutButtonsContainer>
          <ButtonContainer
            selected={layoutType === 'listView'}
            onPress={() => {
              setDirty(true);
              setLayoutType('listView');
            }}>
            <ListViewSvg focused={layoutType === 'listView'} theme={theme} />
            <ButtonText selected={layoutType === 'listView'}>
              {t('List View')}
            </ButtonText>
          </ButtonContainer>
          <ButtonContainer
            selected={layoutType === 'carousel'}
            onPress={() => {
              setDirty(true);
              setLayoutType('carousel');
            }}>
            <CarouselSvg focused={layoutType === 'carousel'} theme={theme} />
            <ButtonText selected={layoutType === 'carousel'}>
              {t('Carousel')}
            </ButtonText>
          </ButtonContainer>
        </LayoutButtonsContainer>
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
