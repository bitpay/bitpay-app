import React, {
  ReactElement,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react';
import styled from 'styled-components/native';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
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
import {LightBlack, SlateDark, White} from '../../../styles/colors';
import {H4, TextAlign} from '../../../components/styled/Text';
import {RouteProp, useRoute} from '@react-navigation/core';
import {WalletScreens, WalletStackParamList} from '../WalletStack';
import {useNavigation, useTheme} from '@react-navigation/native';
import ReceiveAddress from '../components/ReceiveAddress';
import CloseModal from '../../../../assets/img/close-modal-icon.svg';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import {showBottomNotificationModal} from '../../../store/app/app.actions';

const ModalHeader = styled.View`
  padding: ${ScreenGutter};
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const CloseModalButtonContainer = styled.View`
  position: absolute;
  left: 15px;
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

const ModalTitle = styled.Text`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  text-align: center;
  font-size: 20px;
  font-weight: bold;
`;

const SafeAreaView = styled.SafeAreaView`
  flex: 1;
`;

const GlobalSelectContainer = styled.View`
  padding: ${ScreenGutter};
`;

export const WalletSelectMenuContainer = styled.View`
  padding: 0 ${ScreenGutter};
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
  context: 'send' | 'receive' | 'deposit';
  toCoinbase?: {
    account: string;
    address: string;
    currency: string;
    title: string;
  };
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
  title?: string;
}

const GlobalSelect: React.FC<GlobalSelectProps> = ({
  useAsModal,
  customSupportedCurrencies,
  onDismiss,
  title,
}) => {
  const {
    params: {context, toCoinbase},
  } = useRoute<RouteProp<WalletStackParamList, 'GlobalSelect'>>();
  const theme = useTheme();
  const dispatch = useAppDispatch();
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
  if (context === 'send' || context === 'deposit') {
    wallets = wallets.filter(wallet => wallet.balance.sat > 0);
  }

  if (context === 'deposit' && toCoinbase) {
    wallets = wallets.filter(
      wallet => wallet.currencyAbbreviation === toCoinbase.currency,
    );
  }

  if (useAsModal) {
    wallets = wallets.filter(wallet => wallet.isComplete());
  }

  const supportedCoins = useMemo(
    () =>
      buildList(
        customSupportedCurrencies
          ? customSupportedCurrencies
          : SUPPORTED_CURRENCIES,
        wallets,
      ),
    [wallets, customSupportedCurrencies],
  );
  const otherCoins = useMemo(
    () =>
      buildList(
        customSupportedCurrencies ? [] : NON_BITPAY_SUPPORTED_TOKENS,
        wallets,
      ),
    [wallets, customSupportedCurrencies, NON_BITPAY_SUPPORTED_TOKENS],
  );

  const openKeyWalletSelector = useCallback(
    (selectObj: GlobalSelectObj) => {
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
                  cryptoLockedBalance: balance.cryptoLocked,
                  fiatBalance: formatFiatAmount(balance.fiat, 'USD'),
                  fiatLockedBalance: formatFiatAmount(
                    balance.fiatLocked,
                    'USD',
                  ),
                  currencyAbbreviation: currencyAbbreviation.toUpperCase(),
                  network,
                });
              }),
          };
        }),
      );
      setWalletSelectModalVisible(true);
    },
    [keys],
  );

  const onWalletSelect = useCallback(
    async (wallet: Wallet) => {
      if (useAsModal && onDismiss) {
        setWalletSelectModalVisible(false);
        await sleep(100);
        onDismiss(wallet);
        return;
      }
      if (context === 'deposit') {
        const {account, address} = toCoinbase!;
        // Coinbase: send from BitPay to Coinbase
        if (!address) {
          return;
        }

        try {
          const recipient = {
            name: account || 'Coinbase',
            type: 'coinbase',
            address,
          };

          navigation.navigate('Wallet', {
            screen: WalletScreens.AMOUNT,
            params: {
              opts: {hideSendMax: true},
              currencyAbbreviation: wallet.currencyAbbreviation.toUpperCase(),
              onAmountSelected: async (amount, setButtonState, opts) => {
                try {
                  setButtonState('loading');
                  const {txDetails, txp} = await dispatch(
                    createProposalAndBuildTxDetails({
                      wallet,
                      recipient,
                      amount: Number(amount),
                      ...opts,
                    }),
                  );
                  setButtonState('success');
                  await sleep(300);
                  navigation.navigate('Wallet', {
                    screen: 'Confirm',
                    params: {
                      wallet,
                      recipient,
                      txp,
                      txDetails,
                      amount: Number(amount),
                    },
                  });
                } catch (err: any) {
                  setButtonState('failed');
                  const [errorMessageConfig] = await Promise.all([
                    handleCreateTxProposalError(err),
                    sleep(400),
                  ]);
                  dispatch(
                    showBottomNotificationModal({
                      ...errorMessageConfig,
                      enableBackdropDismiss: false,
                      actions: [
                        {
                          text: 'OK',
                          action: () => {
                            setButtonState(undefined);
                          },
                        },
                      ],
                    }),
                  );
                }
              },
            },
          });
        } catch (err) {
          console.error(err);
        }
      } else if (context === 'send') {
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
    },
    [context, navigation, onDismiss, toCoinbase, useAsModal],
  );

  const renderItem = useCallback(
    ({item}: {item: GlobalSelectObj}) => {
      return (
        <GlobalSelectRow
          item={item}
          emit={selectObj => {
            // if only one wallet - skip wallet selector
            const wallets = Object.values(
              selectObj.availableWalletsByKey,
            ).flat();
            if (wallets.length === 1) {
              onWalletSelect(wallets[0]);
            } else {
              openKeyWalletSelector(selectObj);
            }
          }}
          key={item.id}
        />
      );
    },
    [onWalletSelect, openKeyWalletSelector],
  );

  const closeModal = () => {
    setShowReceiveAddressBottomModal(false);
    setReceiveWallet(undefined);
  };

  useEffect(() => {
    if (!wallets[0]) {
      // No wallets available
      // TODO: show warning
      if (useAsModal) {
        closeModal();
      } else {
        navigation.goBack();
      }
    }
  }, [navigation, wallets, useAsModal]);

  return (
    <SafeAreaView>
      {useAsModal && (
        <ModalHeader>
          <CloseModalButtonContainer>
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
          </CloseModalButtonContainer>
          {(title || toCoinbase?.title) && (
            <ModalTitle>{title || toCoinbase?.title}</ModalTitle>
          )}
        </ModalHeader>
      )}
      <GlobalSelectContainer>
        <FlatList
          contentContainerStyle={{paddingBottom: 100}}
          data={[...supportedCoins, ...otherCoins]}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
        />
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
