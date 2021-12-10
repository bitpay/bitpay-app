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
import BottomPopupModal from '../base/bottom-popup/BottomPopupModal';
import {FlatList, TouchableOpacity, View} from 'react-native';
import {SlateDark} from '../../../styles/colors';

const TransactButton = styled.View`
  justify-content: center;
  align-items: center;
  flex: 1;
`;

const TransactModalContainer = styled.View`
  padding: 30px;
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
  margin-bottom: 20px;
`;

const CloseButtonContainer = styled.TouchableOpacity`
  align-self: center;
`;

interface TransactMenuItemProps {
  id: string;
  img: () => ReactElement;
  title?: string;
  description?: string;
  onPress: () => void;
}

const TransactModal = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const hideModal = () => setModalVisible(false);
  const showModal = () => setModalVisible(true);

  // TODO: navigation
  const TransactMenuList: Array<TransactMenuItemProps> = [
    {
      id: 'buyCrypto',
      img: () => <BuyCryptoIcon />,
      title: 'Buy Crypto',
      description: 'Buy crypto with cash',
      onPress: () => {},
    },
    {
      id: 'exchange',
      img: () => <ExchangeIcon />,
      title: 'Exchange',
      description: 'Swap crypto for another',
      onPress: () => {},
    },
    {
      id: 'receive',
      img: () => <ReceiveIcon />,
      title: 'Receive',
      description: 'Get crypto from another wallet',
      onPress: () => {},
    },
    {
      id: 'send',
      img: () => <SendIcon />,
      title: 'Send',
      description: 'Send crypto to another wallet',
      onPress: () => {},
    },
    {
      id: 'buyGiftCard',
      img: () => <BuyGiftCardIcon />,
      title: 'Buy Gift Cards',
      description: 'Buy gift cards with crypto',
      onPress: () => {},
    },
  ];

  const ScanButton: TransactMenuItemProps = {
    id: 'scan',
    img: () => <ScanIcon />,
    title: 'Scan',
    onPress: () => {},
  };

  const CloseButton: TransactMenuItemProps = {
    id: 'close',
    img: () => <CloseIcon />,
    onPress: () => {},
  };

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
              scrollEnabled={false}
              renderItem={({item}) => (
                <TransactItemContainer
                  activeOpacity={0.7}
                  onPress={() => {
                    item.onPress();
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
                ScanButton.onPress();
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
