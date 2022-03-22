import {NavigationProp, useNavigation} from '@react-navigation/native';
import React, {ReactNode, useEffect, useState} from 'react';
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

const CarouselContainer = styled.View`
  margin: 10px 0 10px;
`;

const _renderItem = ({item}: {item: ReactNode}) => {
  return <>{item}</>;
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

const createHomeCardList = (
  navigation: NavigationProp<any>,
  keys: Key[],
  cards: Card[],
  dispatch: Dispatch,
) => {
  cards = cards.filter(c => c.provider === CardProvider.galileo);

  const list: JSX.Element[] = [];
  const hasKeys = keys.length;
  const hasCards = cards.length;
  const hasGiftCards = false;
  const hasCoinbase = false;

  if (hasKeys) {
    const walletCards = keys
      .filter(key => key.show)
      .map(key => {
        let {wallets, totalBalance = 0, backupComplete} = key;
        wallets = wallets.filter(wallet => !wallet.hideWallet);

        return (
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
        );
      });

    list.push(...walletCards);
  } else {
    list.push(<CreateWallet />);
  }

  if (hasCards) {
    list.push(<BitPayCard />);
  } else {
    list.push(<GetMastercard />);
  }

  if (hasCoinbase) {
    // TODO
  } else {
    list.push(<ConnectCoinbase />);
  }

  if (hasGiftCards) {
    // TODO
  } else {
    list.push(<BuyGiftCards />);
  }

  // if hasGiftCards, still show BuyGiftCards at the end before CreateWallet
  if (hasGiftCards) {
    list.push(<BuyGiftCards />);
  }

  // if hasWallets, still show CreateWallet at the end
  if (hasKeys) {
    list.push(<CreateWallet />);
  }

  return list;
};

const CardsCarousel = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const bitPayCards = useSelector<RootState, Card[]>(
    ({APP, CARD}) => CARD.cards[APP.network],
  );
  const keys = useSelector<RootState, {[k: string]: Key}>(
    ({WALLET}) => WALLET.keys,
  );
  const [cardsList, setCardsList] = useState(
    createHomeCardList(navigation, Object.values(keys), bitPayCards, dispatch),
  );

  useEffect(() => {
    setCardsList(
      createHomeCardList(
        navigation,
        Object.values(keys),
        bitPayCards,
        dispatch,
      ),
    );
  }, [navigation, keys, bitPayCards, dispatch]);

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
