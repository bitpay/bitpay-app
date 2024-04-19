import React, {
  ReactElement,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react';
import styled from 'styled-components/native';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  BitpaySupportedCoins,
  BitpaySupportedEvmCoins,
  BitpaySupportedTokens,
  SUPPORTED_COINS,
  SUPPORTED_TOKENS,
} from '../../../constants/currencies';
import {Wallet} from '../../../store/wallet/wallet.models';
import {
  convertToFiat,
  formatFiatAmount,
  getChainFromTokenByAddressKey,
  getCurrencyAbbreviation,
  keyExtractor,
  sleep,
} from '../../../utils/helper-methods';
import {FlatList, TouchableOpacity} from 'react-native';
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
import {WalletScreens, WalletGroupParamList} from '../WalletGroup';
import {RouteProp, useRoute} from '@react-navigation/core';
import {useNavigation, useTheme} from '@react-navigation/native';
import ReceiveAddress from '../components/ReceiveAddress';
import CloseModal from '../../../../assets/img/close-modal-icon.svg';
import InfoSvg from '../../../../assets/img/info.svg';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {Effect, RootState} from '../../../store';
import {BitpaySupportedTokenOptsByAddress} from '../../../constants/tokens';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import Button, {ButtonState} from '../../../components/button/Button';
import {useTranslation} from 'react-i18next';
import {toFiat} from '../../../store/wallet/utils/wallet';
import {LogActions} from '../../../store/log';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Analytics} from '../../../store/analytics/analytics.effects';

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

const ModalTitleContainer = styled.View`
  display: flex;
  flex-direction: row;
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
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  max-height: 75%;
  padding-bottom: 20px;
`;

export interface WalletSelectMenuHeaderContainerParams {
  currency?: string;
}

export const WalletSelectMenuHeaderContainer = styled.View<WalletSelectMenuHeaderContainerParams>`
  padding: 20px;
  padding-left: 12px;
  padding-bottom: ${({currency}) => (currency ? 14 : 0)}px;
  flex-direction: row;
  justify-content: ${({currency}) => (currency ? 'flex-start' : 'center')};
  align-items: center;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : '#ECEFFD')};
  border-bottom-width: ${({currency}) => (currency ? 1 : 0)}px;
`;

export const WalletSelectMenuHeaderIconContainer = styled.View`
  padding-right: 0px;
`;

export const WalletSelectMenuBodyContainer = styled.ScrollView`
  padding: 0 ${ScreenGutter} 2px;
`;

const NoWalletsMsg = styled(BaseText)`
  font-size: 15px;
  text-align: center;
  margin-top: 20px;
`;

export type GlobalSelectModalContext =
  | 'send'
  | 'receive'
  | 'coinbase'
  | 'contact'
  | 'scanner'
  | 'sell'
  | 'swap'
  | 'paperwallet';

export type GlobalSelectParamList = {
  context: GlobalSelectModalContext;
  recipient?: {
    address: string;
    currency: string;
    chain: string;
    name?: string;
    type?: string;
    network?: string;
    destinationTag?: number;
    opts?: {
      sendMax?: boolean | undefined;
      message?: string;
      feePerKb?: number;
      showEVMWalletsAndTokens?: boolean;
    };
  };
  amount?: number;
};

export interface GlobalSelectObj {
  id: string;
  currencyName: string;
  currencyAbbreviation: string;
  img: string | ((props?: any) => React.ReactElement);
  total: number;
  availableWallets: Wallet[];
  availableWalletsByKey: {
    [key: string]: Wallet[];
  };
  availableWalletsByChain: {
    [key: string]: Wallet[];
  };
}

export interface GlobalSelectObjByKey {
  [key: string]: GlobalSelectObj;
}

const buildList = (
  categories: string[],
  wallets: Wallet[],
): GlobalSelectObjByKey => {
  const coins: GlobalSelectObjByKey = {};

  categories.forEach(category => {
    const filteredWallets = wallets.filter(
      wallet =>
        getCurrencyAbbreviation(wallet.currencyAbbreviation, wallet.chain) ===
        category,
    );

    if (filteredWallets.length > 0) {
      const {currencyAbbreviation, currencyName, img} = filteredWallets[0];
      const coinEntry = coins[currencyAbbreviation] || {
        id: _.uniqueId('coin_'),
        currencyName,
        currencyAbbreviation,
        img,
        availableWallets: [],
        availableWalletsByKey: {},
        availableWalletsByChain: {},
      };

      coinEntry.availableWallets = [
        ...coinEntry.availableWallets,
        ...filteredWallets,
      ];
      coinEntry.total = coinEntry.availableWallets.length;
      coinEntry.availableWalletsByKey = _.groupBy(
        coinEntry.availableWallets,
        'keyId',
      );
      coinEntry.availableWalletsByChain = _.groupBy(
        coinEntry.availableWallets,
        'chain',
      );

      coins[currencyAbbreviation] = coinEntry;
    }
  });

  return coins;
};

interface GlobalSelectProps {
  useAsModal?: boolean;
  modalTitle?: any;
  customSupportedCurrencies?: any[];
  onDismiss?: (newWallet?: any, keepSelected?: boolean) => void;
  modalContext?: any;
  livenetOnly?: any;
  onHelpPress?: () => void;
}

type GlobalSelectScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.GLOBAL_SELECT
> &
  GlobalSelectProps;

const GlobalSelect: React.FC<GlobalSelectScreenProps | GlobalSelectProps> = ({
  useAsModal,
  modalTitle,
  customSupportedCurrencies,
  onDismiss,
  modalContext,
  livenetOnly,
  onHelpPress,
}) => {
  const {t} = useTranslation();
  const route = useRoute<RouteProp<WalletGroupParamList, 'GlobalSelect'>>();
  let {context, recipient, amount} = route.params || {};
  if (useAsModal && modalContext) {
    context = modalContext;
  }
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const {keys, tokenOptionsByAddress, customTokenOptionsByAddress} =
    useAppSelector(({WALLET}) => WALLET);
  const {rates} = useAppSelector(({RATE}) => RATE);
  const allTokensByAddress = {
    ...BitpaySupportedTokenOptsByAddress,
    ...tokenOptionsByAddress,
    ...customTokenOptionsByAddress,
  };
  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);
  const [showReceiveAddressBottomModal, setShowReceiveAddressBottomModal] =
    useState(false);
  const [receiveWallet, setReceiveWallet] = useState<Wallet>();
  const navigation = useNavigation();
  const [walletSelectModalVisible, setWalletSelectModalVisible] =
    useState(false);
  // object to pass to select modal
  const [keyWallets, setKeysWallets] =
    useState<KeyWalletsRowProps<KeyWallet>[]>();

  const NON_BITPAY_SUPPORTED_TOKENS = Array.from(
    new Set(
      Object.entries(allTokensByAddress)
        .flatMap(([address, tokenData]) => {
          const symbol = tokenData?.symbol?.toLowerCase();
          const chain = getChainFromTokenByAddressKey(address);
          const currency = getCurrencyAbbreviation(symbol, chain);
          return !BitpaySupportedTokens[address] &&
            !BitpaySupportedCoins[currency]
            ? currency
            : undefined;
        })
        .filter((currency): currency is string => currency !== undefined),
    ),
  );
  // all wallets
  let wallets = Object.values(keys).flatMap(key => key.wallets);
  // Filter hidden wallets
  wallets = wallets.filter(wallet => !wallet.hideWallet);

  // only show wallets with funds
  if (
    ['send', 'sell', 'swap', 'coinbase', 'contact', 'scanner'].includes(context)
  ) {
    wallets = wallets.filter(wallet => wallet.balance.sat > 0);
  }

  if (recipient && ['coinbase', 'contact', 'scanner'].includes(context)) {
    if (recipient.currency && recipient.chain) {
      wallets = wallets.filter(
        wallet =>
          (wallet.currencyAbbreviation === recipient?.currency &&
            wallet.chain === recipient?.chain) ||
          (recipient?.opts?.showEVMWalletsAndTokens &&
            BitpaySupportedEvmCoins[wallet.currencyAbbreviation]),
      );
    }
    if (recipient?.network) {
      wallets = wallets.filter(wallet => wallet.network === recipient?.network);
    }
  }

  if (livenetOnly) {
    wallets = wallets.filter(wallet => wallet.network === 'livenet');
  }

  const supportedCoins = useMemo(
    () =>
      buildList(
        customSupportedCurrencies ? customSupportedCurrencies : SUPPORTED_COINS,
        wallets,
      ),
    [wallets, customSupportedCurrencies],
  );

  const supportedTokens = useMemo(
    () => buildList(customSupportedCurrencies ? [] : SUPPORTED_TOKENS, wallets),
    [wallets, customSupportedCurrencies],
  );

  const otherTokens = useMemo(
    () =>
      buildList(
        customSupportedCurrencies ? [] : NON_BITPAY_SUPPORTED_TOKENS,
        wallets,
      ),
    [wallets, customSupportedCurrencies, NON_BITPAY_SUPPORTED_TOKENS],
  );

  const data = Object.values({
    ...supportedCoins,
    ...supportedTokens,
    ...otherTokens,
  });

  const goToBuyCrypto = async () => {
    if (onDismiss) {
      onDismiss(undefined);
      await sleep(600);
      dispatch(
        LogActions.debug('[GlobalSelect] No wallets. Buy Crypto clicked.'),
      );
      dispatch(
        Analytics.track('Clicked Buy Crypto', {
          context: `GlobalSelect-${context}`,
        }),
      );
      navigation.reset({
        index: 1,
        routes: [
          {
            name: 'Tabs',
            params: {screen: 'Home'},
          },
          {
            name: 'BuyCryptoRoot',
            params: {
              amount: 200,
            },
          },
        ],
      });
    }
  };

  const openKeyWalletSelector = useCallback(
    (selectObj: GlobalSelectObj) => {
      setKeysWallets(
        Object.keys(selectObj.availableWalletsByKey).map(keyId => {
          const key = keys[keyId];
          return {
            key: keyId,
            keyName: key.keyName || 'My Key',
            backupComplete: key.backupComplete,
            wallets: selectObj.availableWalletsByKey[keyId]
              .filter(wallet => !wallet.hideWallet)
              .map(wallet => {
                const {
                  balance,
                  hideWallet,
                  currencyAbbreviation,
                  tokenAddress,
                  network,
                  chain,
                  credentials: {walletName: fallbackName},
                  walletName,
                } = wallet;
                return merge(cloneDeep(wallet), {
                  cryptoBalance: balance.crypto,
                  cryptoLockedBalance: balance.cryptoLocked,
                  fiatBalance: formatFiatAmount(
                    convertToFiat(
                      dispatch(
                        toFiat(
                          balance.sat,
                          defaultAltCurrency.isoCode,
                          currencyAbbreviation,
                          chain,
                          rates,
                          tokenAddress,
                        ),
                      ),
                      hideWallet,
                      network,
                    ),
                    defaultAltCurrency.isoCode,
                  ),
                  fiatLockedBalance: formatFiatAmount(
                    convertToFiat(
                      dispatch(
                        toFiat(
                          balance.satLocked,
                          defaultAltCurrency.isoCode,
                          currencyAbbreviation,
                          chain,
                          rates,
                          tokenAddress,
                        ),
                      ),
                      hideWallet,
                      network,
                    ),
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
        await sleep(500);
        onDismiss(wallet);
        return;
      }
      if (['coinbase', 'contact', 'scanner'].includes(context)) {
        setWalletSelectModalVisible(false);
        await sleep(500);
        const {name, address, type, destinationTag, opts} = recipient!;
        if (!address) {
          return;
        }

        try {
          const sendTo = {
            name,
            type: type || context,
            address,
            destinationTag,
          };

          if (!amount) {
            navigation.navigate(WalletScreens.AMOUNT, {
              sendMaxEnabled: ['contact', 'scanner'].includes(context),
              cryptoCurrencyAbbreviation:
                wallet.currencyAbbreviation.toUpperCase(),
              chain: wallet.chain,
              tokenAddress: wallet.tokenAddress,
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
          const errStr =
            err instanceof Error ? err.message : JSON.stringify(err);
          dispatch(LogActions.error('[GlobalSelect] ' + errStr));
        }
      } else if (context === 'send') {
        setWalletSelectModalVisible(false);
        await sleep(500);
        navigation.navigate('SendTo', {wallet});
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
        destinationTag?: number;
      };
      setButtonState?: (state: ButtonState) => void;
      opts: any;
    }): Effect<Promise<void>> =>
    async (dispatch, getState) => {
      try {
        if (setButtonState) {
          setButtonState('loading');
        } else {
          dispatch(startOnGoingProcessModal('CREATING_TXP'));
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
        navigation.navigate('Confirm', {
          wallet,
          recipient: sendTo,
          txp,
          txDetails,
          amount,
          message: opts?.message,
        });
      } catch (err: any) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(LogActions.error('[GlobalSelect] ' + errStr));
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
      } else if (navigation.canGoBack()) {
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
                  const keepSelected = context === 'paperwallet';
                  onDismiss(undefined, keepSelected);
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
            <ModalTitleContainer>
              <TextAlign align={'center'}>
                <H4>{modalTitle}</H4>
              </TextAlign>
              {onHelpPress ? (
                <TouchableOpacity
                  onPress={() => {
                    onHelpPress();
                  }}
                  style={{marginLeft: 5}}>
                  <InfoSvg width={20} height={20} />
                </TouchableOpacity>
              ) : null}
            </ModalTitleContainer>
          )}
        </ModalHeader>
      )}
      <GlobalSelectContainer>
        {data.length > 0 && (
          <FlatList
            contentContainerStyle={{paddingBottom: 100}}
            data={data}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
          />
        )}
        {data.length === 0 ? (
          <>
            {context === 'send' ? (
              <NoWalletsMsg>
                {t(
                  'There are no wallets with funds available to use this feature.',
                )}
              </NoWalletsMsg>
            ) : null}

            {context === 'sell' ? (
              <NoWalletsMsg>
                {t(
                  'Your wallet balance is too low to sell crypto. Add funds now and start selling.',
                )}
              </NoWalletsMsg>
            ) : null}

            {context === 'swap' ? (
              <NoWalletsMsg>
                {t(
                  'Your wallet balance is too low to swap crypto. Add funds now and start swapping.',
                )}
              </NoWalletsMsg>
            ) : null}

            {['sell', 'swap'].includes(context) ? (
              <Button
                style={{marginTop: 20}}
                onPress={goToBuyCrypto}
                buttonStyle={'primary'}>
                {'Buy Crypto'}
              </Button>
            ) : null}
          </>
        ) : null}

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
                hideBalance={hideAllBalances}
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
