import {useNavigation} from '@react-navigation/native';
import React, {ReactElement, useCallback, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {BottomSheetFlashList} from '@gorhom/bottom-sheet';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useTheme} from '../../../contexts';
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
import {ExternalServicesScreens} from '../../../navigation/services/ExternalServicesGroup';
import {Keys} from '../../../store/wallet/wallet.reducer';
import ArchaxFooter from '../../archax/archax-footer';
import {isEuCountry} from '../../../store/location/location.effects';

const styles = StyleSheet.create({
  transactButton: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  transactItemContainer: {
    flexDirection: 'row',
    paddingBottom: 31,
    alignItems: 'stretch',
  },
  itemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 23,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextContainer: {
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    flexDirection: 'column',
    paddingLeft: 19,
  },
  itemDescriptionText: {
    fontStyle: 'normal',
    fontWeight: '300',
    fontSize: 14,
    lineHeight: 19,
  },
  scanButtonContainer: {
    borderWidth: 2,
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 60,
    paddingLeft: 11,
    paddingRight: 26,
    marginBottom: 30,
    width: '100%',
  },
  scanButtonText: {
    fontSize: 16,
  },
  closeButtonContainer: {
    alignSelf: 'center',
  },
  footerContainer: {
    paddingTop: 20,
  },
});

interface TransactMenuItemProps {
  id: string;
  img: ({disabled}: {disabled?: boolean}) => ReactElement;
  title?: string;
  description?: string;
  onPress: () => void;
}

interface TransactMenuContentProps {
  isVisible: boolean;
  hideModal: () => void;
  onModalHide: () => void;
}

const TransactMenuContent = React.memo(
  ({isVisible, hideModal, onModalHide}: TransactMenuContentProps) => {
    const {t} = useTranslation();
    const theme = useTheme();
    const navigation = useNavigation();
    const keys = useAppSelector(({WALLET}) => WALLET.keys);
    const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
    const isEuLocation = useAppSelector(({LOCATION}) =>
      isEuCountry(LOCATION.locationData?.countryShortCode),
    );
    const availableWallets = Object.values(keys as Keys)
      .filter(key => key.backupComplete)
      .flatMap(key => key.wallets)
      .filter(
        wallet =>
          !wallet.hideWallet &&
          !wallet.hideWalletByAccount &&
          wallet.isComplete() &&
          !wallet.pendingTssSession,
      );

    const availableWalletsWithFunds = availableWallets.filter(
      wallet => wallet.balance.sat > 0,
    );

    const disabledReceivingOptions = availableWallets.length === 0;
    const disabledSendingOptions = availableWalletsWithFunds.length === 0;
    const dispatch = useAppDispatch();

    const TransactMenuList: Array<TransactMenuItemProps> = (
      [
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
      ] as Array<TransactMenuItemProps>
    ).filter(item => !(isEuLocation && item.id === 'buyGiftCard'));

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
          ['send', 'sellCrypto', 'exchange', 'buyGiftCard'].includes(
            item.id,
          )) ||
        (disabledReceivingOptions &&
          ['receive', 'buyCrypto'].includes(item.id));

      const handlePress = async () => {
        if (disabled) {
          return;
        }
        hideModal();
        await sleep(500);
        item.onPress();
      };

      return (
        <TouchableOpacity
          style={styles.transactItemContainer}
          activeOpacity={ActiveOpacity}
          onPress={handlePress}>
          <View
            style={[
              styles.itemIconContainer,
              {
                backgroundColor: disabled
                  ? theme.dark
                    ? DisabledDark
                    : Disabled
                  : theme.dark
                  ? Midnight
                  : Action,
              },
            ]}>
            {item.img({disabled})}
          </View>
          <View
            style={[
              styles.itemTextContainer,
              disabled ? {opacity: 0.3} : null,
            ]}>
            <H6>{item.title}</H6>
            <BaseText
              style={[
                styles.itemDescriptionText,
                {color: theme.colors.description},
              ]}>
              {item.description}
            </BaseText>
          </View>
        </TouchableOpacity>
      );
    };

    const maxModalHeight = 630;
    const modalHeight = Math.min(maxModalHeight, HEIGHT - 100);
    const modalHeightPercentage = modalHeight / HEIGHT;

    return (
      <SheetModal
        backgroundColor={theme.dark ? Midnight : LightBlue}
        modalLibrary={'bottom-sheet'}
        height={modalHeight}
        snapPoints={[`${Math.floor(modalHeightPercentage * 100)}%`]}
        stackBehavior="push"
        isVisible={isVisible}
        onBackdropPress={hideModal}
        onModalHide={onModalHide}>
        <SheetContainer
          testID="transact-menu-content"
          style={[
            styles.modalContainer,
            {backgroundColor: theme.dark ? Midnight : LightBlue},
          ]}>
          <BottomSheetFlashList
            data={TransactMenuList}
            renderItem={renderItem}
          />
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={[
                styles.scanButtonContainer,
                {borderColor: theme.dark ? LinkBlue : Action},
              ]}
              onPress={async () => {
                hideModal();
                await sleep(500);
                ScanButton.onPress();
              }}>
              <View>
                <Icons.Scan />
              </View>
              <BaseText
                style={[
                  styles.scanButtonText,
                  {color: theme.dark ? White : Action},
                ]}>
                {ScanButton.title}
              </BaseText>
            </TouchableOpacity>
            {showArchaxBanner && <ArchaxFooter matchParentWidth />}
            <TouchableOpacity
              style={styles.closeButtonContainer}
              onPress={hideModal}>
              <View>
                <Icons.Close />
              </View>
            </TouchableOpacity>
          </View>
        </SheetContainer>
      </SheetModal>
    );
  },
);

const TransactModal = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const modalVisibleRef = useRef(false);

  const hideModal = useCallback(() => {
    modalVisibleRef.current = false;
    setModalVisible(false);
  }, []);
  const showModal = useCallback(() => {
    modalVisibleRef.current = true;
    setHasOpened(true);
    setModalVisible(true);
  }, []);
  const handleModalHide = useCallback(() => {
    if (!modalVisibleRef.current) {
      setHasOpened(false);
    }
  }, []);

  return (
    <>
      <View style={styles.transactButton}>
        <TouchableOpacity testID="transact-menu-button" onPress={showModal}>
          <TransactButtonIcon />
        </TouchableOpacity>
      </View>
      {hasOpened ? (
        <TransactMenuContent
          isVisible={modalVisible}
          hideModal={hideModal}
          onModalHide={handleModalHide}
        />
      ) : null}
    </>
  );
};

export default TransactModal;
