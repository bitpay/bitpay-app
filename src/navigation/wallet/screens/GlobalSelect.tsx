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
  KeyWallet,
  KeyWalletsRowProps,
} from '../../../components/list/KeyWalletsRow';
import merge from 'lodash.merge';
import cloneDeep from 'lodash.clonedeep';
import {LightBlack, White} from '../../../styles/colors';
import {H4, TextAlign, BaseText} from '../../../components/styled/Text';
import {RouteProp, useRoute} from '@react-navigation/core';
import {WalletScreens, WalletStackParamList} from '../WalletStack';
import {useNavigation, useTheme} from '@react-navigation/native';
import ReceiveAddress from '../components/ReceiveAddress';
import CloseModal from '../../../../assets/img/close-modal-icon.svg';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {Effect, RootState} from '../../../store';
import {BitpaySupportedTokenOpts} from '../../../constants/tokens';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {ButtonState} from '../../../components/button/Button';
import {IsERCToken} from '../../../store/wallet/utils/currency';
import {useTranslation} from 'react-i18next';

const ModalHeader = styled.View`
  height: 50px;
  margin-right: 10px;
  margin-left: 10px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  position: relative;
`;

const CloseModalButtonContainer = styled.View`
  position: absolute;
  left: 0;
`;

const CloseModalButton = styled.TouchableOpacity`
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

const NoWalletsMsg = styled(BaseText)`
  font-size: 15px;
  text-align: center;
  margin-top: 20px;
`;

export type GlobalSelectParamList = {
  context: 'send' | 'receive' | 'coinbase' | 'contact' | 'scanner';
  recipient?: {
    address: string;
    currency: string;
    name?: string;
    type?: string;
    network?: string;
    opts?: {
      sendMax?: boolean | undefined;
      message?: string;
      feePerKb?: number;
      destinationTag?: string;
      showERC20Tokens?: boolean;
    };
  };
  amount?: number;
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

export type GlobalSelectModalContext =
  | 'send'
  | 'receive'
  | 'coinbase'
  | 'contact';

interface GlobalSelectProps {
  useAsModal: any;
  modalTitle?: string;
  customSupportedCurrencies?: string[];
  onDismiss?: (newWallet?: any) => void;
  modalContext?: GlobalSelectModalContext;
  livenetOnly?: boolean;
}

const GlobalSelect: React.FC<GlobalSelectProps> = ({
  useAsModal,
  modalTitle,
  customSupportedCurrencies,
  onDismiss,
  modalContext,
  livenetOnly,
}) => {
  const {t} = useTranslation();
  const route = useRoute<RouteProp<WalletStackParamList, 'GlobalSelect'>>();
  let {context, recipient, amount} = route.params || {};
  if (useAsModal && modalContext) {
    context = modalContext;
  }
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const tokens = useAppSelector(({WALLET}: RootState) => {
    return {
      ...BitpaySupportedTokenOpts,
      ...WALLET.tokenOptions,
      ...WALLET.customTokenOptions,
    };
  });
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const [showReceiveAddressBottomModal, setShowReceiveAddressBottomModal] =
    useState(false);
  const [receiveWallet, setReceiveWallet] = useState<Wallet>();
  const navigation = useNavigation();
  const [walletSelectModalVisible, setWalletSelectModalVisible] =
    useState(false);
  // object to pass to select modal
  const [keyWallets, setKeysWallets] =
    useState<KeyWalletsRowProps<KeyWallet>[]>();

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
  if (['send', 'coinbase', 'contact', 'scanner'].includes(context)) {
    wallets = wallets.filter(wallet => wallet.balance.sat > 0);
  }

  if (recipient && ['coinbase', 'contact', 'scanner'].includes(context)) {
    if (recipient?.currency) {
      wallets = wallets.filter(
        wallet =>
          wallet.currencyAbbreviation === recipient?.currency ||
          (recipient?.opts?.showERC20Tokens &&
            dispatch(IsERCToken(wallet.currencyAbbreviation))),
      );
    }
    if (recipient?.network) {
      wallets = wallets.filter(
        wallet => wallet.credentials.network === recipient?.network,
      );
    }
  }

  if (livenetOnly) {
    wallets = wallets.filter(
      wallet => wallet.credentials.network === 'livenet',
    );
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
                  credentials: {network, walletName: fallbackName},
                  walletName,
                } = wallet;
                return merge(cloneDeep(wallet), {
                  cryptoBalance: balance.crypto,
                  cryptoLockedBalance: balance.cryptoLocked,
                  fiatBalance: formatFiatAmount(
                    balance.fiat,
                    defaultAltCurrency.isoCode,
                  ),
                  fiatLockedBalance: formatFiatAmount(
                    balance.fiatLocked,
                    defaultAltCurrency.isoCode,
                  ),
                  currencyAbbreviation: currencyAbbreviation.toUpperCase(),
                  network,
                  walletName: walletName || fallbackName,
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
      if (['coinbase', 'contact', 'scanner'].includes(context)) {
        setWalletSelectModalVisible(false);
        const {name, address, type, opts} = recipient!;
        if (!address) {
          return;
        }

        try {
          const sendTo = {
            name,
            type: type || context,
            address,
          };

          if (!amount) {
            navigation.navigate('Wallet', {
              screen: WalletScreens.AMOUNT,
              params: {
                opts: {hideSendMax: true},
                currencyAbbreviationRouteParam:
                  wallet.currencyAbbreviation.toUpperCase(),
                onAmountSelected: async (amount, setButtonState, opts) => {
                  dispatch(
                    _createProposalAndBuildTxDetails({
                      wallet,
                      amount: Number(amount),
                      sendTo,
                      setButtonState,
                      opts,
                    }),
                  );
                },
              },
            });
          } else {
            dispatch(
              _createProposalAndBuildTxDetails({
                wallet,
                amount: Number(amount),
                sendTo,
                opts,
              }),
            );
          }
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
        setShowReceiveAddressBottomModal(true);
      }
    },
    [context, navigation, onDismiss, recipient, useAsModal],
  );

  const _createProposalAndBuildTxDetails =
    ({
      wallet,
      amount,
      sendTo,
      setButtonState,
      opts,
    }: {
      wallet: Wallet;
      amount: number;
      sendTo: {
        name: string | undefined;
        type: string;
        address: string;
      };
      setButtonState?: (state: ButtonState) => void;
      opts: any;
    }): Effect<Promise<void>> =>
    async (dispatch, getState) => {
      try {
        if (setButtonState) {
          setButtonState('loading');
        } else {
          dispatch(
            startOnGoingProcessModal(OnGoingProcessMessages.CREATING_TXP),
          );
        }
        const {txDetails, txp} = await dispatch(
          createProposalAndBuildTxDetails({
            wallet,
            recipient: sendTo,
            amount,
            ...opts,
          }),
        );
        if (setButtonState) {
          setButtonState('success');
        } else {
          dispatch(dismissOnGoingProcessModal());
        }
        await sleep(300);
        navigation.navigate('Wallet', {
          screen: 'Confirm',
          params: {
            wallet,
            recipient: sendTo,
            txp,
            txDetails,
            amount,
          },
        });
      } catch (err: any) {
        if (setButtonState) {
          setButtonState('failed');
        } else {
          dispatch(dismissOnGoingProcessModal());
        }
        const [errorMessageConfig] = await Promise.all([
          dispatch(handleCreateTxProposalError(err)),
          sleep(400),
        ]);
        dispatch(
          showBottomNotificationModal({
            ...errorMessageConfig,
            enableBackdropDismiss: false,
            actions: [
              {
                text: t('OK'),
                action: () => {
                  if (setButtonState) {
                    setButtonState(undefined);
                  }
                },
              },
            ],
          }),
        );
      }
    };

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
          {!!modalTitle && (
            <TextAlign align={'center'}>
              <H4>{modalTitle}</H4>
            </TextAlign>
          )}
        </ModalHeader>
      )}
      <GlobalSelectContainer>
        {[...supportedCoins, ...otherCoins].length > 0 && (
          <FlatList
            contentContainerStyle={{paddingBottom: 100}}
            data={[...supportedCoins, ...otherCoins]}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
          />
        )}
        {[...supportedCoins, ...otherCoins].length === 0 &&
          context === 'send' && (
            <NoWalletsMsg>
              {t(
                'There are no wallets with funds available to use this feature.',
              )}
            </NoWalletsMsg>
          )}
        <SheetModal
          isVisible={walletSelectModalVisible}
          onBackdropPress={() => setWalletSelectModalVisible(false)}>
          <WalletSelectMenuContainer>
            <WalletSelectMenuHeaderContainer>
              <TextAlign align={'center'}>
                <H4>{t('Select a wallet')}</H4>
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
