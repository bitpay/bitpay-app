import {NavigationProp, useNavigation} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import Carousel from 'react-native-snap-carousel';
import styled from 'styled-components/native';
import haptic from '../../../../components/haptic-feedback/haptic';
import {ActiveOpacity, WIDTH} from '../../../../components/styled/Containers';
import {RootState} from '../../../../store';
import {Card} from '../../../../store/card/card.models';
import {Key} from '../../../../store/wallet/wallet.models';
import {BitPayCard, GetMastercard} from './cards/BitPayCard';
import BuyGiftCards from './cards/BuyGiftCards';
import ConnectCoinbase from './cards/ConnectCoinbase';
import CreateWallet from './cards/CreateWallet';
import WalletCardComponent from './Wallet';
import {BottomNotificationConfig} from '../../../../components/modal/bottom-notification/BottomNotification';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import {Dispatch} from 'redux';
import {getMnemonic} from '../../../../utils/helper-methods';
import {TouchableOpacity} from 'react-native';
import {HomeLink, SectionHeaderContainer} from '../HomeRoot';
import {CardProvider} from '../../../../constants/card';
import _ from 'lodash';
import {useAppSelector} from '../../../../utils/hooks';
import {HomeCarouselConfig} from '../../../../store/app/app.models';
import CoinbaseBalanceCard from '../../../coinbase/components/CoinbaseBalanceCard';
import {CoinbaseTokenProps} from '../../../../api/coinbase/coinbase.types';
import {COINBASE_ENV} from '../../../../api/coinbase/coinbase.constants';

const CarouselContainer = styled.View`
  margin: 10px 0 10px;
`;

const _renderItem = ({item}: {item: {id: string; component: JSX.Element}}) => {
  return <>{item.component}</>;
};

const keyBackupRequired = (
  key: Key,
  navigation: NavigationProp<any>,
): BottomNotificationConfig => {
  return {
    type: 'error',
    title: 'Key Backup Required',
    message: 'To continue you will need to back up your key.',
    enableBackdropDismiss: true,
    actions: [
      {
        text: 'Back up Key',
        action: () => {
          navigation.navigate('Wallet', {
            screen: 'RecoveryPhrase',
            params: {
              keyId: key.id,
              words: getMnemonic(key),
              key,
            },
          });
        },
        primary: true,
      },
      {
        text: 'maybe later',
        action: () => {},
        primary: false,
      },
    ],
  };
};

const createHomeCardList = ({
  navigation,
  keys,
  cards,
  coinbaseToken,
  dispatch,
  homeCarouselConfig,
}: {
  navigation: NavigationProp<any>;
  keys: Key[];
  cards: Card[];
  coinbaseToken: CoinbaseTokenProps | null;
  dispatch: Dispatch;
  homeCarouselConfig: HomeCarouselConfig[];
}) => {
  cards = cards.filter(c => c.provider === CardProvider.galileo);
  let list: {id: string; component: JSX.Element}[] = [];
  const defaults: {id: string; component: JSX.Element}[] = [];
  const hasKeys = keys.length;
  const hasCards = cards.length;
  const hasGiftCards = false;
  const hasCoinbase = !!coinbaseToken?.access_token;
  if (hasKeys) {
    const walletCards = keys.map(key => {
      let {wallets, totalBalance = 0, backupComplete} = key;
      wallets = wallets.filter(wallet => !wallet.hideWallet);

      return {
        id: key.id,
        component: (
          <WalletCardComponent
            keyName={key.keyName}
            wallets={wallets}
            totalBalance={totalBalance}
            needsBackup={!backupComplete}
            onPress={() => {
              if (backupComplete) {
                navigation.navigate('Wallet', {
                  screen: 'KeyOverview',
                  params: {key},
                });
              } else {
                dispatch(
                  showBottomNotificationModal(
                    keyBackupRequired(key, navigation),
                  ),
                );
              }
            }}
          />
        ),
      };
    });

    list.push(...walletCards);
  } else {
    defaults.push({id: 'createWallet', component: <CreateWallet />});
  }

  if (hasCards) {
    list.push({id: 'bitpayCard', component: <BitPayCard />});
  } else {
    defaults.push({id: 'getTheCard', component: <GetMastercard />});
  }

  if (hasCoinbase) {
    list.push({id: 'coinbaseBalanceCard', component: <CoinbaseBalanceCard />});
  } else {
    defaults.push({id: 'connectToCoinbase', component: <ConnectCoinbase />});
  }

  if (hasGiftCards) {
    // TODO
  } else {
    defaults.push({id: 'buyGiftCards', component: <BuyGiftCards />});
  }

  // if hasGiftCards, still show BuyGiftCards at the end before CreateWallet
  if (hasGiftCards) {
    defaults.push({id: 'buyGiftCards', component: <BuyGiftCards />});
  }

  // if hasWallets, still show CreateWallet at the end
  if (hasKeys) {
    defaults.push({id: 'createWallet', component: <CreateWallet />});
  }
  list = list.filter(
    item =>
      homeCarouselConfig.find(configItem => configItem.id === item.id)?.show,
  );
  const order = homeCarouselConfig.map(item => item.id);
  return [..._.sortBy(list, item => _.indexOf(order, item.id)), ...defaults];
};

const CardsCarousel = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const bitPayCards = useSelector<RootState, Card[]>(
    ({APP, CARD}) => CARD.cards[APP.network],
  );
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const coinbaseToken = useSelector<RootState, CoinbaseTokenProps | null>(
    ({COINBASE}) => COINBASE.token[COINBASE_ENV],
  );
  const [cardsList, setCardsList] = useState(
    createHomeCardList({
      navigation,
      keys: Object.values(keys),
      cards: bitPayCards,
      coinbaseToken,
      dispatch,
      homeCarouselConfig: homeCarouselConfig || [],
    }),
  );

  useEffect(() => {
    setCardsList(
      createHomeCardList({
        navigation,
        keys: Object.values(keys),
        cards: bitPayCards,
        coinbaseToken,
        dispatch,
        homeCarouselConfig: homeCarouselConfig || [],
      }),
    );
  }, [
    navigation,
    keys,
    bitPayCards,
    coinbaseToken,
    dispatch,
    homeCarouselConfig,
  ]);

  return (
    <>
      {Object.keys(keys).length > 0 ? (
        <SectionHeaderContainer justifyContent={'flex-end'}>
          <TouchableOpacity
            activeOpacity={ActiveOpacity}
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('GeneralSettings', {
                screen: 'CustomizeHome',
              });
            }}>
            <HomeLink>Customize</HomeLink>
          </TouchableOpacity>
        </SectionHeaderContainer>
      ) : null}
      <CarouselContainer>
        <Carousel
          vertical={false}
          layout={'default'}
          useExperimentalSnap={true}
          data={cardsList}
          renderItem={_renderItem}
          sliderWidth={WIDTH}
          itemWidth={235}
          inactiveSlideScale={1}
          inactiveSlideOpacity={1}
        />
      </CarouselContainer>
    </>
  );
};

export default CardsCarousel;
