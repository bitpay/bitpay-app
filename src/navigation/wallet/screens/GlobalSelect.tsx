import React, {ReactElement, useCallback, useMemo, useState} from 'react';
import styled from 'styled-components/native';
import {useAppSelector} from '../../../utils/hooks';
import {SUPPORTED_CURRENCIES} from '../../../constants/currencies';
import {Wallet} from '../../../store/wallet/wallet.models';
import {
  formatFiatAmount,
  keyExtractor,
  sleep,
} from '../../../utils/helper-methods';
import {FlatList} from 'react-native';
import GlobalSelectRow from '../../../components/list/GlobalSelectRow';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {ScreenGutter} from '../../../components/styled/Containers';
import _ from 'lodash';
import KeyWalletsRow, {
  KeyWalletsRowProps,
} from '../../../components/list/KeyWalletsRow';
import merge from 'lodash.merge';
import cloneDeep from 'lodash.clonedeep';
import {LightBlack, White} from '../../../styles/colors';
import {H4, TextAlign} from '../../../components/styled/Text';
import {RouteProp, useRoute} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {useNavigation, useTheme} from '@react-navigation/native';
import ReceiveAddress from '../components/ReceiveAddress';
import CloseModal from '../../../../assets/img/close-modal-icon.svg';

const ModalHeader = styled.View`
  height: 50px;
  margin-right: 10px;
`;

const CloseModalButton = styled.TouchableOpacity`
  margin: 15px 0;
  padding: 5px;
  height: 41px;
  width: 41px;
  border-radius: 50px;
  background-color: #9ba3ae33;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const SafeAreaView = styled.SafeAreaView`
  flex: 1;
`;

const GlobalSelectContainer = styled.View`
  padding: 0;
`;

const ListContainer = styled.View`
  margin-top: 20px;
`;
export const WalletSelectMenuContainer = styled.View`
  padding: ${ScreenGutter};
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  max-height: 75%;
`;

export const WalletSelectMenuHeaderContainer = styled.View`
  padding: 20px;
`;

export const WalletSelectMenuBodyContainer = styled.ScrollView`
  padding-bottom: 20px;
`;

export type GlobalSelectParamList = {
  context: 'send' | 'receive';
};

export interface GlobalSelectObj {
  id: string;
  currencyName: string;
  img: string | ((props?: any) => ReactElement);
  total: number;
  availableWalletsByKey: {
    [key in string]: Wallet[];
  };
}

const buildList = (category: string[], wallets: Wallet[]) => {
  const coins: GlobalSelectObj[] = [];
  category.forEach(coin => {
    const availableWallets = wallets.filter(
      wallet => wallet.currencyAbbreviation === coin,
    );
    if (availableWallets.length) {
      const {currencyName, img} = availableWallets[0];
      coins.push({
        id: Math.random().toString(),
        currencyName,
        img,
        total: availableWallets.length,
        availableWalletsByKey: _.groupBy(
          availableWallets,
          wallet => wallet.keyId,
        ),
      });
    }
  });
  return coins;
};

interface GlobalSelectProps {
  useAsModal: any;
  customSupportedCurrencies?: string[];
  onDismiss?: (newWallet?: any) => void;
}

const GlobalSelect: React.FC<GlobalSelectProps> = ({
  useAsModal,
  customSupportedCurrencies,
  onDismiss,
}) => {
  const {
    params: {context},
  } = useRoute<RouteProp<WalletStackParamList, 'GlobalSelect'>>();
  const theme = useTheme();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const tokens = useAppSelector(({WALLET}) => WALLET.tokenOptions);
  const [showReceiveAddressBottomModal, setShowReceiveAddressBottomModal] =
    useState(false);
  const [receiveWallet, setReceiveWallet] = useState<Wallet>();
  const navigation = useNavigation();
  const [walletSelectModalVisible, setWalletSelectModalVisible] =
    useState(false);
  // object to pass to select modal
  const [keyWallets, setKeysWallets] = useState<KeyWalletsRowProps[]>();

  const NON_BITPAY_SUPPORTED_TOKENS = Object.keys(tokens).filter(
    token => !SUPPORTED_CURRENCIES.includes(token),
  );

  // all wallets
  let wallets = Object.values(keys)
    .filter(key => key.backupComplete)
    .flatMap(key => key.wallets);

  // Filter hidden and incomplete wallets
  wallets = wallets.filter(wallet => !wallet.hideWallet && wallet.isComplete());

  // only show wallets with funds
  if (context === 'send') {
    wallets = wallets.filter(wallet => wallet.balance.sat > 0);
  }

  const supportedCoins = useMemo(
    () =>
      buildList(
        customSupportedCurrencies
          ? customSupportedCurrencies
          : SUPPORTED_CURRENCIES,
        wallets,
      ),
    [],
  );
  const otherCoins = useMemo(
    () =>
      buildList(
        customSupportedCurrencies ? [] : NON_BITPAY_SUPPORTED_TOKENS,
        wallets,
      ),
    [],
  );

  const openKeyWalletSelector = (selectObj: GlobalSelectObj) => {
    setKeysWallets(
      Object.keys(selectObj.availableWalletsByKey).map(keyId => {
        const key = keys[keyId];
        return {
          key: keyId,
          keyName: key.keyName || 'My Key',
          wallets: selectObj.availableWalletsByKey[keyId]
            .filter(wallet => !wallet.hideWallet)
            .map(wallet => {
              const {
                balance,
                currencyAbbreviation,
                credentials: {network},
              } = wallet;
              return merge(cloneDeep(wallet), {
                cryptoBalance: balance.crypto,
                fiatBalance: formatFiatAmount(balance.fiat, 'USD'),
                currencyAbbreviation: currencyAbbreviation.toUpperCase(),
                network,
              });
            }),
        };
      }),
    );
    setWalletSelectModalVisible(true);
  };
  const renderItem = useCallback(({item}: {item: GlobalSelectObj}) => {
    return (
      <GlobalSelectRow
        item={item}
        emit={selectObj => {
          // if only one wallet - skip wallet selector
          const wallets = Object.values(selectObj.availableWalletsByKey).flat();
          if (wallets.length === 1) {
            onWalletSelect(wallets[0]);
          } else {
            openKeyWalletSelector(selectObj);
          }
        }}
        key={item.id}
      />
    );
  }, []);

  const onWalletSelect = async (wallet: Wallet) => {
    if (useAsModal && onDismiss) {
      setWalletSelectModalVisible(false);
      await sleep(100);
      onDismiss(wallet);
      return;
    }
    if (context === 'send') {
      setWalletSelectModalVisible(false);
      navigation.navigate('Wallet', {
        screen: 'SendTo',
        params: {wallet},
      });
    } else {
      setReceiveWallet(wallet);
      await sleep(500);
      setShowReceiveAddressBottomModal(true);
    }
  };

  const closeModal = () => {
    setShowReceiveAddressBottomModal(false);
    setReceiveWallet(undefined);
  };

  return (
    <SafeAreaView>
      {useAsModal && (
        <ModalHeader>
          <CloseModalButton
            onPress={() => {
              if (onDismiss) {
                onDismiss();
              }
            }}>
            <CloseModal
              {...{
                width: 20,
                height: 20,
                color: theme.dark ? 'white' : 'black',
              }}
            />
          </CloseModalButton>
        </ModalHeader>
      )}
      <GlobalSelectContainer>
        <ListContainer>
          <FlatList
            contentContainerStyle={{paddingBottom: 100}}
            data={[...supportedCoins, ...otherCoins]}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
          />
        </ListContainer>
        <SheetModal
          isVisible={walletSelectModalVisible}
          onBackdropPress={() => setWalletSelectModalVisible(false)}>
          <WalletSelectMenuContainer>
            <WalletSelectMenuHeaderContainer>
              <TextAlign align={'center'}>
                <H4>Select a wallet</H4>
              </TextAlign>
            </WalletSelectMenuHeaderContainer>
            <WalletSelectMenuBodyContainer>
              <KeyWalletsRow
                keyWallets={keyWallets!}
                onPress={onWalletSelect}
              />
            </WalletSelectMenuBodyContainer>
            {/*Nested receive modal*/}
            {receiveWallet && (
              <ReceiveAddress
                isVisible={showReceiveAddressBottomModal}
                closeModal={closeModal}
                wallet={receiveWallet}
              />
            )}
          </WalletSelectMenuContainer>
        </SheetModal>
        {/*Receive modal if one wallet*/}
        {receiveWallet && !walletSelectModalVisible && (
          <ReceiveAddress
            isVisible={showReceiveAddressBottomModal}
            closeModal={closeModal}
            wallet={receiveWallet}
          />
        )}
      </GlobalSelectContainer>
    </SafeAreaView>
  );
};

export default GlobalSelect;
