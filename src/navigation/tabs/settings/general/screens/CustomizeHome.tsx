import React, {useMemo, useState} from 'react';
import styled from 'styled-components/native';
import {Key, Wallet} from '../../../../../store/wallet/wallet.models';
import {Dispatch} from 'redux';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../../../components/styled/Containers';
import {Action, Feather, White} from '../../../../../styles/colors';
import {H5, H7} from '../../../../../components/styled/Text';
import {
  HeaderImg,
  Img,
  RemainingAssetsLabel,
  WALLET_DISPLAY_LIMIT,
} from '../../../home/components/Wallet';
import {CurrencyImage} from '../../../../../components/currency-image/CurrencyImage';
import {getRemainingWalletCount} from '../../../../../store/wallet/utils/wallet';
import HamburgerSvg from '../../../../../../assets/img/hamburger.svg';
import Button from '../../../../../components/button/Button';
import {FlatList, TouchableOpacity} from 'react-native';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {
  dismissOnGoingProcessModal,
  setHomeCarouselConfig,
  showOnGoingProcessModal,
} from '../../../../../store/app/app.actions';
import {useNavigation} from '@react-navigation/native';
import _ from 'lodash';
import {HomeCarouselConfig} from '../../../../../store/app/app.models';
import {Card} from '../../../../../store/card/card.models';
import {OnGoingProcessMessages} from '../../../../../components/modal/ongoing-process/OngoingProcess';
import {sleep} from '../../../../../utils/helper-methods';
import haptic from '../../../../../components/haptic-feedback/haptic';

const CustomizeHomeContainer = styled.View`
  flex: 1;
`;

const ListHeader = styled(H7)`
  padding: ${ScreenGutter};
`;
const ListFooterButtonContainer = styled.View`
  margin-top: 50px;
  padding: 0 ${ScreenGutter};
`;

const CustomizeCardTitle = styled(H5)`
  color: ${({theme}) => theme.colors.text};
`;

const Column = styled.View`
  flex-direction: column;
  flex: 1;
`;

const Row = styled.View`
  flex-direction: row;
  margin: 3px 0;
`;

const Toggle = styled(TouchableOpacity)`
  justify-content: center;
  position: absolute;
  right: 10px;
  width: 50px;
`;

const CustomizeCardContainer = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? '#343434' : Feather)};
  border-radius: 12px;
  margin: 0 ${ScreenGutter} ${ScreenGutter} ${ScreenGutter};
  min-height: 105px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  padding: 20px;
`;

const HamburgerContainer = styled.View`
  margin-right: 15px;
`;

const ToggleText = styled(H7)`
  color: ${({theme}) => (theme.dark ? White : Action)};
`;

interface CustomizeItem {
  key: string;
  name: string;
  wallets?: Wallet[];
  show: boolean;
}

const CustomizeCard = ({
  item: {wallets, name, show},
  toggle,
}: {
  item: CustomizeItem;
  toggle: () => void;
}) => {
  const walletInfo = wallets?.slice(0, WALLET_DISPLAY_LIMIT);
  const remainingWalletCount = getRemainingWalletCount(wallets);

  return (
    <>
      <Row>
        <Column>
          <Row>
            <CustomizeCardTitle>{name}</CustomizeCardTitle>
          </Row>
          {wallets ? (
            <Row>
              <HeaderImg>
                {walletInfo?.map((wallet: Wallet, index: number) => {
                  const {id, img} = wallet;
                  return (
                    wallet && (
                      <Img key={id} isFirst={index === 0}>
                        <CurrencyImage img={img} size={25} />
                      </Img>
                    )
                  );
                })}
                {remainingWalletCount && (
                  <RemainingAssetsLabel>
                    + {getRemainingWalletCount(wallets)} more
                  </RemainingAssetsLabel>
                )}
              </HeaderImg>
            </Row>
          ) : null}
        </Column>
      </Row>
      <Toggle onPress={toggle}>
        <ToggleText>{show ? 'Hide' : 'Show'}</ToggleText>
      </Toggle>
    </>
  );
};

const createCustomizeCardList = ({
  dispatch,
  keys,
  cards,
  homeCarouselConfig,
}: {
  dispatch: Dispatch;
  keys: Key[];
  cards: Card[];
  homeCarouselConfig: HomeCarouselConfig[];
}) => {
  let list: CustomizeItem[] = [];
  const hasKeys = keys.length;
  const hasCards = cards.length;
  const hasGiftCards = false;
  const hasCoinbase = false;
  if (hasKeys) {
    const walletCards = keys.map(({id, keyName, wallets}): CustomizeItem => {
      const {show} = homeCarouselConfig?.find(item => item.id === id) || {};

      return {
        key: id,
        name: keyName!,
        wallets: wallets,
        show: show!,
      };
    });

    list.push(...walletCards);
  }

  if (hasCoinbase) {
    // TODO
  }

  if (hasGiftCards) {
    // TODO
  }

  if (hasCards) {
    const id = 'bitpayCard';
    const {show} = homeCarouselConfig?.find(item => item.id === id) || {};
    list.push({
      key: id,
      name: 'BitPay Card',
      show: show!,
    });
  }

  const order = homeCarouselConfig.map(item => item.id);
  list = _.sortBy(list, item => _.indexOf(order, item.key));

  return [list.filter(i => i.show), list.filter(i => !i.show)];
};

const CustomizeHome = () => {
  const dispatch = useAppDispatch();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const cards = useAppSelector(({CARD, APP}) => CARD.cards[APP.network]);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig)!;
  const navigation = useNavigation();

  const [_visible, _hidden] = createCustomizeCardList({
    dispatch,
    keys: Object.values(keys),
    cards,
    homeCarouselConfig,
  });
  const [visibleList, setVisibleList] = useState(_visible);
  const [dirty, setDirty] = useState(false);
  const [hiddenList, setHiddenList] = useState(_hidden);

  const toggle = (item: CustomizeItem) => {
    const {show, key} = item;
    item.show = !show;
    setDirty(true);
    if (show) {
      setVisibleList(visibleList.filter(vi => vi.key !== key));
      setHiddenList(hiddenList.concat(item));
    } else {
      setHiddenList(hiddenList.filter(hi => hi.key !== key));
      setVisibleList(visibleList.concat(item));
    }
  };

  const visibleRenderItem = ({item, drag, isActive}: RenderItemParams<any>) => {
    return (
      <ScaleDecorator>
        <CustomizeCardContainer
          onLongPress={() => {
            haptic('impactLight');
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
          style={{marginTop: 100}}
          onPress={async () => {
            dispatch(
              showOnGoingProcessModal(OnGoingProcessMessages.SAVING_LAYOUT),
            );
            await sleep(1000);
            const list = [...visibleList, ...hiddenList].map(({key, show}) => ({
              id: key,
              show,
            }));
            dispatch(setHomeCarouselConfig(list));
            navigation.goBack();
            dispatch(dismissOnGoingProcessModal());
          }}
          buttonStyle={'primary'}>
          Save Layout
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
        ListFooterComponent={ListFooterComponent}
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
      <DraggableFlatList
        ListHeaderComponent={() =>
          visibleList.length ? <ListHeader>Visible</ListHeader> : null
        }
        ListFooterComponent={memoizedFooterList}
        contentContainerStyle={{paddingBottom: 50}}
        containerStyle={{
          marginTop: 20,
        }}
        onDragEnd={({data}) => {
          if (!dirty) {
            setDirty(true);
          }
          setVisibleList(data);
        }}
        data={visibleList}
        renderItem={visibleRenderItem}
        keyExtractor={item => item.key}
      />
    </CustomizeHomeContainer>
  );
};

export default CustomizeHome;
