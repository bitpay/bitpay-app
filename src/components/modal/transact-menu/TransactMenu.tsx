import {useNavigation} from '@react-navigation/native';
import React, {ReactElement, useState} from 'react';
import {View} from 'react-native';
import {BottomSheetFlashList} from '@gorhom/bottom-sheet';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import styled, {useTheme} from 'styled-components/native';
import TransactButtonIcon from '../../../../assets/img/tab-icons/transact-button.svg';
import {
  Action,
  Midnight,
  White,
  Disabled,
  DisabledDark,
} from '../../../styles/colors';
import {ActiveOpacity, HEIGHT, SheetContainer} from '../../styled/Containers';
import {BaseText, H6} from '../../styled/Text';
import SheetModal from '../base/sheet/SheetModal';
import Icons from './TransactMenuIcons';
import {useTranslation} from 'react-i18next';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {WalletScreens} from '../../../navigation/wallet/WalletGroup';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {sleep} from '../../../utils/helper-methods';
import {css} from 'styled-components/native';

const TransactButton = styled.View`
  justify-content: center;
  align-items: center;
  flex: 1;
`;

const ModalContainer = styled(SheetContainer)`
  background: ${({theme}) => (theme.dark ? '#101010' : White)};
  flex: 1;
`;

const TransactItemContainer = styled(TouchableOpacity)`
  flex-direction: row;
  padding-bottom: 31px;
  align-items: stretch;
`;

const ItemIconContainer = styled.View<{disabled: boolean}>`
  background-color: ${({theme}) => (theme.dark ? Midnight : Action)};
  ${({disabled}) =>
    disabled &&
    css`
      background: ${({theme}) => (theme.dark ? DisabledDark : Disabled)};
    `};
  border-radius: 11px;
`;

const ItemTextContainer = styled.View<{disabled: boolean}>`
  align-items: flex-start;
  justify-content: space-around;
  flex-direction: column;
  padding-left: 19px;
  ${({disabled}) =>
    disabled &&
    css`
      opacity: 0.3;
    `};
`;

const ItemDescriptionText = styled(BaseText)`
  color: ${({theme}) => theme.colors.description};
  font-style: normal;
  font-weight: 300;
  font-size: 14px;
  line-height: 19px;
`;

const ScanButtonContainer = styled(TouchableOpacity)`
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

const CloseButtonContainer = styled(TouchableOpacity)`
  align-self: center;
`;

const FooterContainer = styled.View`
  padding-top: 20px;
`;

interface TransactMenuItemProps {
  id: string;
  img: ({disabled}: {disabled?: boolean}) => ReactElement;
  title?: string;
  description?: string;
  onPress: () => void;
}

const TransactModal = () => {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const hideModal = () => setModalVisible(false);
  const showModal = () => setModalVisible(true);
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const availableWallets = Object.values(keys)
    .filter(key => key.backupComplete)
    .flatMap(key => key.wallets)
    .filter(
      wallet =>
        !wallet.hideWallet &&
        !wallet.hideWalletByAccount &&
        wallet.isComplete() &&
        wallet.balance.sat > 0,
    );
  const disabledSendingOptions = availableWallets.length === 0;
  const dispatch = useAppDispatch();

  const TransactMenuList: Array<TransactMenuItemProps> = [
    {
      id: 'buyCrypto',
      img: () => <Icons.BuyCrypto />,
      title: t('Buy Crypto'),
      description: t('Buy crypto with cash'),
      onPress: () => {
        dispatch(
          Analytics.track('Clicked Buy Crypto', {
            context: 'TransactMenu',
          }),
        );
        navigation.navigate(WalletScreens.AMOUNT, {
          onAmountSelected: async (amount: string, setButtonState: any) => {
            navigation.navigate('BuyCryptoRoot', {
              amount: Number(amount),
            });
          },
          context: 'buyCrypto',
        });
      },
    },
    {
      id: 'sellCrypto',
      img: ({disabled}) => <Icons.SellCrypto disabled={disabled} />,
      title: t('Sell Crypto'),
      description: t('Sell crypto and receive cash'),
      onPress: () => {
        dispatch(
          Analytics.track('Clicked Sell Crypto', {
            context: 'TransactMenu',
          }),
        );
        navigation.navigate('SellCryptoRoot');
      },
    },
    {
      id: 'exchange',
      img: ({disabled}) => <Icons.Exchange disabled={disabled} />,
      title: t('Exchange'),
      description: t('Swap crypto for another'),
      onPress: () => {
        dispatch(
          Analytics.track('Clicked Swap Crypto', {
            context: 'TransactMenu',
          }),
        );
        navigation.navigate('SwapCryptoRoot');
      },
    },
    {
      id: 'receive',
      img: () => <Icons.Receive />,
      title: t('Receive'),
      description: t('Get crypto from another wallet'),
      onPress: () => {
        navigation.navigate('GlobalSelect', {context: 'receive'});
      },
    },
    {
      id: 'send',
      img: ({disabled}) => <Icons.Send disabled={disabled} />,
      title: t('Send'),
      description: t('Send crypto to another wallet'),
      onPress: () => {
        navigation.navigate('GlobalSelect', {context: 'send'});
      },
    },
    {
      id: 'buyGiftCard',
      img: ({disabled}) => <Icons.BuyGiftCard disabled={disabled} />,
      title: t('Buy Gift Cards'),
      description: t('Buy gift cards with crypto'),
      onPress: () => {
        navigation.navigate('Tabs', {
          screen: 'Shop',
        });
        dispatch(
          Analytics.track('Clicked Buy Gift Cards', {
            context: 'TransactMenu',
          }),
        );
      },
    },
  ];

  const ScanButton: TransactMenuItemProps = {
    id: 'scan',
    img: () => <Icons.Scan />,
    title: t('Scan'),
    onPress: () => {
      dispatch(
        Analytics.track('Open Scanner', {
          context: 'TransactMenu',
        }),
      );
      navigation.navigate('ScanRoot');
    },
  };

  const renderItem = ({item}: {item: TransactMenuItemProps}) => {
    const disabled =
      disabledSendingOptions &&
      ['send', 'sellCrypto', 'exchange', 'buyGiftCard'].includes(item.id);

    const handlePress = async () => {
      if (disabled) {
        return;
      }
      hideModal();
      await sleep(500);
      item.onPress();
    };

    return (
      <TransactItemContainer
        activeOpacity={ActiveOpacity}
        onPress={handlePress}>
        <ItemIconContainer disabled={disabled}>
          {item.img({disabled})}
        </ItemIconContainer>
        <ItemTextContainer disabled={disabled}>
          <H6>{item.title}</H6>
          <ItemDescriptionText>{item.description}</ItemDescriptionText>
        </ItemTextContainer>
      </TransactItemContainer>
    );
  };

  const maxModalHeight = 650;
  const modalHeight = Math.min(maxModalHeight, HEIGHT - 100);
  const modalHeightPercentage = modalHeight / HEIGHT;

  return (
    <>
      <TransactButton>
        <TouchableOpacity onPress={showModal}>
          <TransactButtonIcon />
        </TouchableOpacity>
      </TransactButton>
      <SheetModal
        backgroundColor={theme.dark ? '#101010' : White}
        modalLibrary={'bottom-sheet'}
        height={modalHeight}
        snapPoints={[`${Math.floor(modalHeightPercentage * 100)}%`]}
        stackBehavior="push"
        isVisible={modalVisible}
        onBackdropPress={hideModal}>
        <ModalContainer>
          <BottomSheetFlashList
            data={TransactMenuList}
            renderItem={renderItem}
          />
          <FooterContainer>
            <ScanButtonContainer
              onPress={async () => {
                hideModal();
                await sleep(500);
                ScanButton.onPress();
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
          </FooterContainer>
        </ModalContainer>
      </SheetModal>
    </>
  );
};

export default TransactModal;
