import BuyCryptoIcon from '../../../../assets/img/tab-icons/transact-menu/buy-crypto.svg';
import BuyGiftCardIcon from '../../../../assets/img/tab-icons/transact-menu/buy-gift-card.svg';
import ExchangeIcon from '../../../../assets/img/tab-icons/transact-menu/exchange.svg';
import ReceiveIcon from '../../../../assets/img/tab-icons/transact-menu/receive.svg';
import SendIcon from '../../../../assets/img/tab-icons/transact-menu/send.svg';
import ScanIcon from '../../../../assets/img/tab-icons/transact-menu/scan.svg';
import CloseIcon from '../../../../assets/img/tab-icons/transact-menu/close.svg';
import TransactButtonIcon from '../../../../assets/img/tab-icons/transact-button.svg';
import styled from 'styled-components/native';
import {BaseText} from '../../styled/Text';
import React, {ReactElement, useState} from 'react';
import {TabsStackParamList} from '../../../navigation/tabs/TabsStack';
import {useNavigation} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import BottomPopupModal from '../base/bottom-popup/BottomPopupModal';
import {FlatList, TouchableOpacity, View} from 'react-native';
import {SlateDark} from '../../../styles/colors';

const TransactButton = styled.View`
  justify-content: center;
  align-items: center;
  flex: 1;
`;

const TransactModalContainer = styled.View`
  padding: 30px 30px 0px 30px;
  min-height: 300px;
  background: white;
  justify-content: center;
  align-content: center;
  border-top-left-radius: 17px;
  border-top-right-radius: 17px;
`;

const TransactItemContainer = styled.TouchableOpacity`
  flex-direction: row;
  padding-bottom: 31px;
  align-items: stretch;
`;

const ItemIconContainer = styled.View`
  background-color: #edf0fe;
  border-radius: 11px;
`;

const ItemTextContainer = styled.View`
  align-items: flex-start;
  justify-content: space-around;
  flex-direction: column;
  padding-left: 19px;
`;

const ItemTitleText = styled(BaseText)`
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 18px;
`;

const ItemDescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: 300;
  font-size: 14px;
  line-height: 19px;
  color: ${SlateDark};
`;

const ScanButtonContainer = styled.TouchableOpacity`
  background-color: #edf0fe;
  flex-direction: row;
  align-self: center;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  height: 60px;
  padding-left: 11px;
  padding-right: 26px;
  margin-bottom: 30px;
`;

const CloseButtonContainer = styled.TouchableOpacity`
  align-self: center;
  margin-bottom: 7px;
`;

interface TransactMenuItemProps {
  id: string;
  img: () => ReactElement;
  title?: string;
  description?: string;
  nextView?: any;
}

// TODO
enum NextScreen {
  BUY_CRYPTO = 'BuyCrypto',
  EXCHANGE = 'Exchange',
  RECEIVE = 'Receive',
  SEND = 'Send',
  BUY_GIFT_CARD = 'BuyGiftCard',
  SCAN = 'Scan',
}

const TransactMenuList: Array<TransactMenuItemProps> = [
  {
    id: 'buyCrypto',
    img: () => <BuyCryptoIcon />,
    title: 'Buy Crypto',
    description: 'Buy crypto with cash',
    nextView: NextScreen.BUY_CRYPTO,
  },
  {
    id: 'exchange',
    img: () => <ExchangeIcon />,
    title: 'Exchange',
    description: 'Swap crypto for another',
    nextView: NextScreen.EXCHANGE,
  },
  {
    id: 'receive',
    img: () => <ReceiveIcon />,
    title: 'Receive',
    description: 'Get crypto from another wallet',
    nextView: NextScreen.RECEIVE,
  },
  {
    id: 'send',
    img: () => <SendIcon />,
    title: 'Send',
    description: 'Send crypto to another wallet',
    nextView: NextScreen.SEND,
  },
  {
    id: 'buyGiftCard',
    img: () => <BuyGiftCardIcon />,
    title: 'Buy Gift Cards',
    description: 'Buy gift cards with crypto',
    nextView: NextScreen.BUY_GIFT_CARD,
  },
];

const ScanButton: TransactMenuItemProps = {
  id: 'scan',
  img: () => <ScanIcon />,
  title: 'Scan',
  nextView: NextScreen.SCAN,
};

const CloseButton: TransactMenuItemProps = {
  id: 'close',
  img: () => <CloseIcon />,
};

const TransactModal = () => {
  const navigation =
    useNavigation<BottomTabNavigationProp<TabsStackParamList>>();
  const [modalVisible, setModalVisible] = useState(false);
  const hideModal = () => setModalVisible(false);
  const showModal = () => setModalVisible(true);

  return (
    <>
      <TransactButton>
        <TouchableOpacity onPress={showModal}>
          <TransactButtonIcon />
        </TouchableOpacity>
      </TransactButton>
      <>
        <BottomPopupModal isVisible={modalVisible} onBackdropPress={hideModal}>
          <TransactModalContainer>
            <FlatList
              data={TransactMenuList}
              renderItem={({item}) => (
                <TransactItemContainer
                  onPress={() => {
                    navigation.navigate(item.nextView);
                    hideModal();
                  }}>
                  <ItemIconContainer>{item.img()}</ItemIconContainer>
                  <ItemTextContainer>
                    <ItemTitleText>{item.title}</ItemTitleText>
                    <ItemDescriptionText>
                      {item.description}
                    </ItemDescriptionText>
                  </ItemTextContainer>
                </TransactItemContainer>
              )}
            />
            <ScanButtonContainer
              onPress={() => {
                navigation.navigate(ScanButton.nextView);
                hideModal();
              }}>
              <View>{ScanButton.img()}</View>
              <ItemTitleText>{ScanButton.title}</ItemTitleText>
            </ScanButtonContainer>
            <CloseButtonContainer onPress={hideModal}>
              <View>{CloseButton.img()}</View>
            </CloseButtonContainer>
          </TransactModalContainer>
        </BottomPopupModal>
      </>
    </>
  );
};

export default TransactModal;
