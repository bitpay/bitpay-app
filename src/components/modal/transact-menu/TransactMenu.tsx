import {useNavigation} from '@react-navigation/native';
import React, {ReactElement, useState} from 'react';
import {FlatList, TouchableOpacity, View} from 'react-native';
import styled from 'styled-components/native';
import TransactButtonIcon from '../../../../assets/img/tab-icons/transact-button.svg';
import {Action, Midnight, White} from '../../../styles/colors';
import {ActiveOpacity, SheetContainer} from '../../styled/Containers';
import {BaseText, H6} from '../../styled/Text';
import SheetModal from '../base/sheet/SheetModal';
import Icons from './TransactMenuIcons';
import analytics from '@segment/analytics-react-native';
import {useAppSelector} from '../../../utils/hooks';
import {useTranslation} from 'react-i18next';

const TransactButton = styled.View`
  justify-content: center;
  align-items: center;
  flex: 1;
`;

const ModalContainer = styled(SheetContainer)`
  background: ${({theme}) => (theme.dark ? '#101010' : White)};
`;

const TransactItemContainer = styled.TouchableOpacity`
  flex-direction: row;
  padding-bottom: 31px;
  align-items: stretch;
`;

const ItemIconContainer = styled.View`
  background-color: ${({theme}) => (theme.dark ? Midnight : Action)};
  border-radius: 11px;
`;

const ItemTextContainer = styled.View`
  align-items: flex-start;
  justify-content: space-around;
  flex-direction: column;
  padding-left: 19px;
`;

const ItemDescriptionText = styled(BaseText)`
  color: ${({theme}) => theme.colors.description};
  font-style: normal;
  font-weight: 300;
  font-size: 14px;
  line-height: 19px;
`;

const ScanButtonContainer = styled.TouchableOpacity`
  background-color: ${({theme}) => (theme.dark ? Midnight : Action)};
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

const ScanButtonText = styled(BaseText)`
  color: ${White};
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
  const {t} = useTranslation();
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const hideModal = () => setModalVisible(false);
  const showModal = () => setModalVisible(true);
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );

  const TransactMenuList: Array<TransactMenuItemProps> = [
    {
      id: 'buyCrypto',
      img: () => <Icons.BuyCrypto />,
      title: t('Buy Crypto'),
      description: t('Buy crypto with cash'),
      onPress: () => {
        analytics.track('BitPay App - Clicked Buy Crypto', {
          from: 'TransactMenu',
          appUser: user?.eid || '',
        });
        navigation.navigate('Wallet', {
          screen: 'Amount',
          params: {
            onAmountSelected: async (amount: string, setButtonState: any) => {
              navigation.navigate('BuyCrypto', {
                screen: 'BuyCryptoRoot',
                params: {
                  amount: Number(amount),
                },
              });
            },
            opts: {
              hideSendMax: true,
            },
          },
        });
      },
    },
    {
      id: 'exchange',
      img: () => <Icons.Exchange />,
      title: t('Exchange'),
      description: t('Swap crypto for another'),
      onPress: () => {
        analytics.track('BitPay App - Clicked Swap Crypto', {
          from: 'TransactMenu',
          appUser: user?.eid || '',
        });
        navigation.navigate('SwapCrypto', {screen: 'Root'});
      },
    },
    {
      id: 'receive',
      img: () => <Icons.Receive />,
      title: t('Receive'),
      description: t('Get crypto from another wallet'),
      onPress: () => {
        navigation.navigate('Wallet', {
          screen: 'GlobalSelect',
          params: {context: 'receive'},
        });
      },
    },
    {
      id: 'send',
      img: () => <Icons.Send />,
      title: t('Send'),
      description: t('Send crypto to another wallet'),
      onPress: () => {
        navigation.navigate('Wallet', {
          screen: 'GlobalSelect',
          params: {context: 'send'},
        });
      },
    },
    {
      id: 'buyGiftCard',
      img: () => <Icons.BuyGiftCard />,
      title: t('Buy Gift Cards'),
      description: t('Buy gift cards with crypto'),
      onPress: () => {},
    },
  ];

  const ScanButton: TransactMenuItemProps = {
    id: 'scan',
    img: () => <Icons.Scan />,
    title: t('Scan'),
    onPress: () => {
      navigation.navigate('Scan', {screen: 'Root'});
    },
  };

  return (
    <>
      <TransactButton>
        <TouchableOpacity onPress={showModal}>
          <TransactButtonIcon />
        </TouchableOpacity>
      </TransactButton>
      <SheetModal isVisible={modalVisible} onBackdropPress={hideModal}>
        <ModalContainer>
          <FlatList
            data={TransactMenuList}
            scrollEnabled={false}
            renderItem={({item}) => (
              <TransactItemContainer
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  item.onPress();
                  hideModal();
                }}>
                <ItemIconContainer>{item.img()}</ItemIconContainer>
                <ItemTextContainer>
                  <H6>{item.title}</H6>
                  <ItemDescriptionText>{item.description}</ItemDescriptionText>
                </ItemTextContainer>
              </TransactItemContainer>
            )}
          />

          <ScanButtonContainer
            onPress={() => {
              ScanButton.onPress();
              hideModal();
            }}>
            <View>
              <Icons.Scan />
            </View>
            <ScanButtonText>{ScanButton.title}</ScanButtonText>
          </ScanButtonContainer>

          <CloseButtonContainer onPress={hideModal}>
            <View>
              <Icons.Close />
            </View>
          </CloseButtonContainer>
        </ModalContainer>
      </SheetModal>
    </>
  );
};

export default TransactModal;
