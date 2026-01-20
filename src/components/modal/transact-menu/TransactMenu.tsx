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
  LinkBlue,
  LightBlue,
} from '../../../styles/colors';
import {ActiveOpacity, HEIGHT, SheetContainer} from '../../styled/Containers';
import {BaseText, H6} from '../../styled/Text';
import SheetModal from '../base/sheet/SheetModal';
import Icons from './TransactMenuIcons';
import {useTranslation} from 'react-i18next';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {sleep} from '../../../utils/helper-methods';
import {css} from 'styled-components/native';
import {ExternalServicesScreens} from '../../../navigation/services/ExternalServicesGroup';
import {Keys} from '../../../store/wallet/wallet.reducer';

const TransactButton = styled.View`
  justify-content: center;
  align-items: center;
  flex: 1;
`;

const ModalContainer = styled(SheetContainer)`
  background: ${({theme}) => (theme.dark ? Midnight : LightBlue)};
  flex: 1;
`;

const TransactItemContainer = styled(TouchableOpacity)`
  flex-direction: row;
  padding-bottom: 31px;
  align-items: stretch;
`;

const ItemIconContainer = styled.View<{disabled: boolean}>`
  width: 40px;
  height: 40px;
  background-color: ${({theme}) => (theme.dark ? Midnight : Action)};
  ${({disabled}) =>
    disabled &&
    css`
      background: ${({theme}) => (theme.dark ? DisabledDark : Disabled)};
    `};
  border-radius: 23px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
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
  border: 2px solid ${({theme}) => (theme.dark ? LinkBlue : Action)};
  flex-direction: row;
  align-self: center;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  height: 60px;
  padding-left: 11px;
  padding-right: 26px;
  margin-bottom: 30px;
  width: 100%;
`;

const ScanButtonText = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? White : Action)};
  font-size: 16px;
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
  const availableWallets = Object.values(keys as Keys)
    .filter(key => key.backupComplete)
    .flatMap(key => key.wallets)
    .filter(
      wallet =>
        !wallet.hideWallet &&
        !wallet.hideWalletByAccount &&
        wallet.isComplete() &&
        !wallet.pendingTssSession &&
        wallet.balance.sat > 0,
    );

  const availableWalletsWithFunds = availableWallets.filter(
    wallet => wallet.balance.sat > 0,
  );

  const disabledReceivingOptions = availableWallets.length === 0;
  const disabledSendingOptions = availableWalletsWithFunds.length === 0;
  const dispatch = useAppDispatch();

  const TransactMenuList: Array<TransactMenuItemProps> = [
    {
      id: 'buyCrypto',
      img: ({disabled}) => <Icons.BuyCrypto disabled={disabled} />,
      title: t('Buy Crypto'),
      description: t('Buy crypto with cash'),
      onPress: () => {
        dispatch(
          Analytics.track('Clicked Buy Crypto', {
            context: 'TransactMenu',
          }),
        );
        navigation.navigate(ExternalServicesScreens.ROOT_BUY_AND_SELL, {
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
        navigation.navigate(ExternalServicesScreens.ROOT_BUY_AND_SELL, {
          context: 'sellCrypto',
        });
      },
    },
    {
      id: 'exchange',
      img: ({disabled}) => <Icons.Exchange disabled={disabled} />,
      title: t('Swap'),
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
      img: ({disabled}) => <Icons.Receive disabled={disabled} />,
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
      (disabledSendingOptions &&
        ['send', 'sellCrypto', 'exchange', 'buyGiftCard'].includes(item.id)) ||
      (disabledReceivingOptions && ['receive', 'buyCrypto'].includes(item.id));

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

  const maxModalHeight = 630;
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
        backgroundColor={theme.dark ? Midnight : LightBlue}
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
