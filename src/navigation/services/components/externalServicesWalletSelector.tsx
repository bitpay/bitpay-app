import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View, ViewProps} from 'react-native';
import {useTheme} from '../../../contexts';
import {orderBy} from 'lodash';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {RootState} from '../../../store';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {
  Action,
  White,
  Black,
  Slate,
  LightBlack,
  NeutralSlate,
  SlateDark,
} from '../../../styles/colors';
import SelectorArrowRight from '../../../../assets/img/selector-arrow-right.svg';
import {
  getBadgeImg,
  getCurrencyAbbreviation,
  sleep,
} from '../../../utils/helper-methods';
import {BuyCryptoExchangeKey} from '../buy-crypto/utils/buy-crypto-utils';
import {useTranslation} from 'react-i18next';
import {
  addWallet,
  AddWalletData,
  getDecryptPassword,
} from '../../../store/wallet/effects/create/create';
import {
  CustomErrorMessage,
  WrongPasswordError,
} from '../../wallet/components/ErrorMessages';
import {showWalletError} from '../../../store/wallet/effects/errors/errors';
import {toggleHideAccount} from '../../../store/wallet/wallet.actions';
import {Analytics} from '../../../store/analytics/analytics.effects';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import GlobalSelect, {
  ToWalletSelectorCustomCurrency,
} from '../../wallet/screens/GlobalSelect';
import {getExternalServiceSymbol} from '../utils/external-services-utils';
import {TouchableOpacity} from '../../../components/base/TouchableOpacity';
import {
  ExternalServicesContext,
  SellCryptoCoin,
} from '../screens/BuyAndSellRoot';
import {useOngoingProcess} from '../../../contexts';
import {isTSSKey} from '../../../store/wallet/effects/tss-send/tss-send';
import {BuyCryptoStateOpts} from '../../../store/buy-crypto/buy-crypto.reducer';
import {HomeCarouselConfig} from '../../../store/app/app.models';
import ExternalServicesLoadingWalletSkeleton from './ExternalServicesLoadingWalletSkeleton';
import usePreloadedCustomGlobalSelectList from '../../wallet/screens/usePreloadedCustomGlobalSelectList';

const EMPTY_CUSTOM_CURRENCIES: ToWalletSelectorCustomCurrency[] = [];

const styles = StyleSheet.create({
  globalSelectContainer: {
    flex: 1,
  },
  arrowContainer: {
    marginLeft: 10,
  },
  externalServicesWalletSelectorContainer: {
    marginVertical: 8,
    marginHorizontal: 16,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletSelector: {
    height: 36,
    borderRadius: 27.5,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    minWidth: 146,
  },
  walletSelectorLeft: {
    display: 'flex',
    justifyContent: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletSelectorRight: {
    display: 'flex',
    justifyContent: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletSelectorName: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0,
    marginLeft: 8,
  },
});

const GlobalSelectContainer: React.FC<ViewProps> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.globalSelectContainer,
        {backgroundColor: theme.dark ? Black : White},
        style,
      ]}
      {...rest}
    />
  );
};

const ArrowContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.arrowContainer, style]} {...rest} />
);

export const ExternalServicesWalletSelectorContainer: React.FC<ViewProps> = ({
  style,
  ...rest
}) => (
  <View
    style={[styles.externalServicesWalletSelectorContainer, style]}
    {...rest}
  />
);

export const WalletSelector: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.walletSelector,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        style,
      ]}
      {...rest}
    />
  );
};

export const WalletSelectorLeft: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.walletSelectorLeft, style]} {...rest} />
);

export const WalletSelectorRight: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.walletSelectorRight, style]} {...rest} />
);

export const WalletSelectorName = React.forwardRef<
  Text,
  React.ComponentProps<typeof Text>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <Text
      ref={ref}
      style={[
        styles.walletSelectorName,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
WalletSelectorName.displayName = 'WalletSelectorName';

interface ExternalServicesWalletSelectorScreenProps {
  navigation: any;
  route: any;
  context: ExternalServicesContext | undefined;
  buyCryptoSupportedCoins: string[];
  buyCryptoSupportedCoinsFullObj: ToWalletSelectorCustomCurrency[];
  sellCryptoSupportedCoins: string[] | undefined;
  sellCryptoSupportedCoinsFullObj?: SellCryptoCoin[] | undefined;
  onWalletSelected?: (wallet: Wallet) => void;
  fromWallet?: Wallet;
  fromAccount?: {keyId: string; accountAddress: string}; // used when entering from an EVM/SVM account (AccountDetails)
  currencyAbbreviation?: string | undefined; // used from charts and deeplinks.
  chain?: string | undefined; // used from charts and deeplinks.
  partner?: BuyCryptoExchangeKey | undefined; // used from deeplinks.
  loading?: boolean; // shows skeleton while initializing
}

const ExternalServicesWalletSelector: React.FC<
  ExternalServicesWalletSelectorScreenProps
> = ({
  navigation,
  route,
  context,
  buyCryptoSupportedCoins,
  buyCryptoSupportedCoinsFullObj,
  sellCryptoSupportedCoinsFullObj,
  sellCryptoSupportedCoins,
  onWalletSelected,
  fromWallet,
  fromAccount,
  currencyAbbreviation,
  chain,
  loading,
}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const logger = useLogger();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const allKeys: {[key: string]: Key} = useAppSelector(
    ({WALLET}: RootState) => WALLET.keys,
  );
  const buyCryptoOpts: BuyCryptoStateOpts = useAppSelector(
    ({BUY_CRYPTO}: RootState) => BUY_CRYPTO.opts,
  );
  const homeCarouselConfig: HomeCarouselConfig[] = useAppSelector(
    ({APP}) => APP.homeCarouselConfig,
  );
  const selectedGlobalSelectChainFilter = useAppSelector(
    ({APP}) => APP.selectedLocalChainFilterOption,
  );

  const preSetWallet = fromWallet;
  const fromCurrencyAbbreviation = currencyAbbreviation?.toLowerCase();
  const fromChain = chain?.toLowerCase();
  const [selectedWallet, setSelectedWallet] = useState<Wallet>();
  const [walletSelectorModalVisible, setWalletSelectorModalVisible] =
    useState(false);
  const autoSelectAttemptedRef = useRef(false);
  const pendingWalletSelectionRef = useRef<
    | {
        newWallet?: Wallet;
        createNewWalletData?: AddWalletData;
      }
    | undefined
  >(undefined);
  const {
    preloadedListRef: buyGlobalSelectCacheRef,
    preload: preloadBuyGlobalSelect,
  } = usePreloadedCustomGlobalSelectList({
    navigation,
    keys: allKeys,
    customToSelectCurrencies:
      context === 'buyCrypto'
        ? buyCryptoSupportedCoinsFullObj
        : EMPTY_CUSTOM_CURRENCIES,
    selectedChainFilterOption: selectedGlobalSelectChainFilter,
    livenetOnly: !__DEV__,
  });

  const globalSelectRoute =
    fromCurrencyAbbreviation && fromChain
      ? {
          ...route,
          params: {
            ...(route?.params || {}),
            assetContext: {
              currencyAbbreviation: fromCurrencyAbbreviation,
              chain: fromChain,
            },
          },
        }
      : route;

  const walletError = async (
    type?: string,
    fromCurrencyAbbreviation?: string,
  ) => {
    hideOngoingProcess();
    await sleep(400);
    dispatch(showWalletError(type, fromCurrencyAbbreviation));
  };

  const _setSelectedWallet = (wallet: Wallet) => {
    setSelectedWallet(wallet);
    if (onWalletSelected) {
      onWalletSelected(wallet);
    }
  };

  const isWalletBuySupported = (wallet: Wallet): boolean => {
    return (
      wallet.credentials &&
      wallet.network === 'livenet' &&
      wallet.isComplete() &&
      !wallet.hideWallet &&
      !wallet.hideWalletByAccount &&
      buyCryptoSupportedCoins.includes(
        getExternalServiceSymbol(
          wallet.currencyAbbreviation.toLowerCase(),
          wallet.chain,
        ),
      )
    );
  };

  const selectFirstAvailableWallet = async () => {
    const keysList: Key[] = Object.values(allKeys).filter(
      key => key.backupComplete,
    );

    if (!keysList[0]) {
      await sleep(300);
      walletError('emptyKeyList');
      return;
    }

    if (
      context === 'buyCrypto' &&
      !preSetWallet?.id &&
      !fromCurrencyAbbreviation
    ) {
      let scopedWallets: Wallet[];
      if (fromAccount?.keyId && fromAccount?.accountAddress) {
        const accountKey = keysList.find(k => k.id === fromAccount.keyId);
        scopedWallets = (accountKey?.wallets || []).filter(
          w => w.receiveAddress === fromAccount.accountAddress,
        );
      } else {
        scopedWallets = keysList.flatMap(k => k.wallets || []);
      }
      const candidateWallets = scopedWallets.filter(isWalletBuySupported);

      const lastPurchaseWalletId = buyCryptoOpts?.lastPurchaseData?.walletId;
      const lastUsedWallet = lastPurchaseWalletId
        ? candidateWallets.find(w => w.id === lastPurchaseWalletId)
        : undefined;
      if (lastUsedWallet) {
        setWallet(lastUsedWallet);
        return;
      }

      const fundedWallets = candidateWallets.filter(
        w => (w.balance?.sat || 0) > 0,
      );
      if (fundedWallets[0]) {
        const [highestBalanceWallet] = orderBy(
          fundedWallets,
          w => w.balance?.fiat || 0,
          'desc',
        );
        _setSelectedWallet(highestBalanceWallet);
        return;
      }

      return;
    }

    if (preSetWallet?.id || buyCryptoOpts?.lastPurchaseData?.walletId) {
      // Selected wallet from Wallet Details
      let fromWalletData;
      let allWallets: Wallet[] = [];

      keysList.forEach(key => {
        allWallets = [...allWallets, ...key.wallets];
      });

      const walletIdToFind =
        preSetWallet?.id || buyCryptoOpts?.lastPurchaseData?.walletId;
      fromWalletData = allWallets.find(wallet => wallet.id === walletIdToFind);
      if (fromWalletData) {
        setWallet(fromWalletData);
        return;
      } else {
        if (preSetWallet?.id) {
          walletError(
            context === 'sellCrypto'
              ? 'walletNotSupported'
              : 'walletNotSupportedToBuy',
          );
          return;
        }
      }
    }

    let availableKeys = keysList.filter(key => {
      if (!key.wallets) {
        return false;
      }

      if (context === 'sellCrypto') {
        return key.wallets.some(
          w => walletIsSupported(w) && (w.balance?.satSpendable || 0) > 0,
        );
      }

      return keyHasSupportedWallets(key.wallets);
    });

    // Order availableKeys by APP.homeCarouselConfig
    if (homeCarouselConfig?.length && availableKeys[0]) {
      const carouselOrderMap = new Map(
        homeCarouselConfig.map((item, index) => [item.id, index]),
      );
      availableKeys = orderBy(availableKeys, [
        key => carouselOrderMap.get(key.id) ?? Infinity,
      ]);
    }

    if (availableKeys[0]) {
      const firstKey = availableKeys[0];

      const firstKeyAllWallets: Wallet[] = firstKey.wallets;
      let allowedWallets = firstKeyAllWallets.filter(wallet =>
        walletIsSupported(wallet),
      );

      if (context === 'sellCrypto') {
        allowedWallets = allowedWallets.filter(
          wallet => (wallet.balance?.satSpendable || 0) > 0,
        );

        if (
          fromCurrencyAbbreviation &&
          sellCryptoSupportedCoinsFullObj?.some(
            coin =>
              coin.symbol ===
              (fromChain
                ? getExternalServiceSymbol(fromCurrencyAbbreviation, fromChain)
                : fromCurrencyAbbreviation),
          )
        ) {
          allowedWallets = allowedWallets.filter(
            wallet =>
              wallet.currencyAbbreviation === fromCurrencyAbbreviation &&
              (fromChain ? wallet.chain === fromChain : true),
          );
        }
      } else if (context === 'buyCrypto') {
        const _fromCurrencyAbbreviation =
          (fromCurrencyAbbreviation ??
            buyCryptoOpts?.lastPurchaseData?.coin?.toLowerCase()) ||
          'btc';
        const _fromChain =
          (fromCurrencyAbbreviation && fromChain
            ? fromChain
            : buyCryptoOpts?.lastPurchaseData?.chain?.toLowerCase()) || 'btc';

        if (
          _fromCurrencyAbbreviation &&
          buyCryptoSupportedCoins.includes(
            _fromChain
              ? getExternalServiceSymbol(_fromCurrencyAbbreviation, _fromChain)
              : _fromCurrencyAbbreviation,
          )
        ) {
          allowedWallets = allowedWallets.filter(
            wallet =>
              wallet.currencyAbbreviation === _fromCurrencyAbbreviation &&
              (_fromChain ? wallet.chain === _fromChain : true),
          );
        }
      }

      if (allowedWallets[0]) {
        _setSelectedWallet(allowedWallets[0]);
      } else {
        if (fromCurrencyAbbreviation) {
          walletError(
            context === 'sellCrypto'
              ? 'noWalletsAbleToSell'
              : 'noWalletsAbleToBuy',
            fromCurrencyAbbreviation,
          );
        }
      }
    } else {
      walletError(
        context === 'sellCrypto'
          ? 'keysNoSupportedWalletToSell'
          : 'keysNoSupportedWallet',
        fromCurrencyAbbreviation,
      );
    }
  };

  const keyHasSupportedWallets = (wallets: Wallet[]): boolean => {
    const supportedWallets = wallets.filter(wallet =>
      walletIsSupported(wallet),
    );
    return !!supportedWallets[0];
  };

  const walletIsSupported = (wallet: Wallet): boolean => {
    if (context === 'sellCrypto') {
      const symbol = getExternalServiceSymbol(
        wallet.currencyAbbreviation.toLowerCase(),
        wallet.chain,
      );
      return (
        wallet.credentials &&
        wallet.network === 'livenet' &&
        !!sellCryptoSupportedCoinsFullObj?.some(
          coin => coin.symbol === symbol,
        ) &&
        wallet.isComplete() &&
        !wallet.hideWallet &&
        !wallet.hideWalletByAccount &&
        (!fromCurrencyAbbreviation ||
          (wallet.currencyAbbreviation === fromCurrencyAbbreviation &&
            (fromChain ? wallet.chain === fromChain : true)))
      );
    }

    // Case Buy Crypto
    const _fromCurrencyAbbreviation =
      fromCurrencyAbbreviation ??
      buyCryptoOpts?.lastPurchaseData?.coin?.toLowerCase();
    const _fromChain =
      fromCurrencyAbbreviation && fromChain
        ? fromChain
        : buyCryptoOpts?.lastPurchaseData?.chain?.toLowerCase();

    return (
      wallet.credentials &&
      wallet.network === 'livenet' &&
      buyCryptoSupportedCoins.includes(
        getExternalServiceSymbol(
          wallet.currencyAbbreviation.toLowerCase(),
          wallet.chain,
        ),
      ) &&
      wallet.isComplete() &&
      !wallet.hideWallet &&
      !wallet.hideWalletByAccount &&
      (!_fromCurrencyAbbreviation ||
        (wallet.currencyAbbreviation === _fromCurrencyAbbreviation &&
          (_fromChain ? wallet.chain === _fromChain : true)))
    );
  };

  const setWallet = (wallet: Wallet) => {
    if (context === 'buyCrypto') {
      if (
        wallet.credentials &&
        wallet.network === 'livenet' &&
        buyCryptoSupportedCoins.includes(
          getExternalServiceSymbol(
            wallet.currencyAbbreviation.toLowerCase(),
            wallet.chain,
          ),
        )
      ) {
        if (wallet.isComplete()) {
          if (allKeys[wallet.keyId].backupComplete) {
            _setSelectedWallet(wallet);
          } else {
            walletError('needsBackup');
          }
        } else {
          walletError('walletNotCompleted');
        }
      } else {
        walletError('walletNotSupportedToBuy');
      }
    } else if (context === 'sellCrypto') {
      if (
        wallet.credentials &&
        (wallet.network === 'livenet' ||
          (__DEV__ &&
            wallet.network === 'testnet' &&
            ['btc', 'eth'].includes(
              getExternalServiceSymbol(
                wallet.currencyAbbreviation.toLowerCase(),
                wallet.chain,
              ),
            ))) &&
        sellCryptoSupportedCoinsFullObj &&
        sellCryptoSupportedCoinsFullObj.some(coin => {
          const symbol = getExternalServiceSymbol(
            wallet.currencyAbbreviation.toLowerCase(),
            wallet.chain,
          );
          return coin.symbol === symbol;
        })
      ) {
        if (wallet.isComplete()) {
          if (allKeys[wallet.keyId].backupComplete) {
            if (wallet.balance?.satSpendable > 0) {
              _setSelectedWallet(wallet);
            } else {
              walletError('noSpendableFunds');
            }
          } else {
            walletError('needsBackup');
          }
        } else {
          walletError('walletNotCompleted');
        }
      } else {
        walletError('walletNotSupported');
      }
    }
  };

  useEffect(() => {
    if (autoSelectAttemptedRef.current) {
      return;
    }

    if (!context) {
      return;
    }

    if (
      context !== 'buyCrypto' &&
      !(preSetWallet?.id || fromCurrencyAbbreviation)
    ) {
      return;
    }

    // When coming from charts/exchange-rate with preselected coin, delay auto-select
    // until the supported coin lists are available.
    if (context === 'buyCrypto' && !buyCryptoSupportedCoins?.length) {
      return;
    }
    if (context === 'sellCrypto' && !sellCryptoSupportedCoinsFullObj?.length) {
      return;
    }

    autoSelectAttemptedRef.current = true;
    selectFirstAvailableWallet();
    // Intentionally only attempt auto-select once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    context,
    preSetWallet?.id,
    fromCurrencyAbbreviation,
    fromChain,
    buyCryptoSupportedCoins?.length,
    sellCryptoSupportedCoinsFullObj?.length,
  ]);

  const applyWalletSelection = async (
    newWallet?: Wallet,
    createNewWalletData?: AddWalletData | undefined,
  ) => {
    if (newWallet?.currencyAbbreviation) {
      setWallet(newWallet);
      dispatch(
        Analytics.track(
          context === 'buyCrypto'
            ? 'Buy - Clicked Crypto'
            : 'Sell  - Clicked Crypto',
          {
            coin: newWallet.currencyAbbreviation || 'unknown',
            chain: newWallet.chain || 'unknown',
            isExistingWallet: true,
          },
        ),
      );
    } else if (createNewWalletData && isTSSKey(createNewWalletData.key)) {
      await dispatch(
        showBottomNotificationModal(
          CustomErrorMessage({
            errMsg: t(
              'You cannot add new wallets to a TSS wallet key. To create another wallet, please start a new TSS wallet setup.',
            ),
            title: t('TSS Wallet Limitation'),
          }),
        ),
      );
    } else if (createNewWalletData) {
      try {
        if (createNewWalletData.key?.isPrivKeyEncrypted) {
          if (
            !(
              createNewWalletData.currency?.isToken &&
              createNewWalletData.associatedWallet
            )
          ) {
            logger.debug('Key is Encrypted. Trying to decrypt...');
            await sleep(500);
            const password = await dispatch(
              getDecryptPassword(createNewWalletData.key),
            );
            createNewWalletData.options.password = password;
          } else {
            logger.debug(
              'Key is Encrypted, but not neccessary for tokens. Trying to create wallet...',
            );
          }
        }

        await sleep(500);
        await showOngoingProcess('ADDING_WALLET');

        const createdToWallet = await dispatch(addWallet(createNewWalletData));
        logger.debug(
          `Added ${createdToWallet?.currencyAbbreviation} wallet from Buy Crypto`,
        );
        if (
          context === 'buyCrypto' &&
          createdToWallet?.receiveAddress &&
          createNewWalletData.key.evmAccountsInfo?.[
            createdToWallet.receiveAddress
          ]?.hideAccount
        ) {
          dispatch(
            toggleHideAccount({
              keyId: createNewWalletData.key.id,
              accountAddress: createdToWallet.receiveAddress,
              accountToggleSelected: false,
            }),
          );
        }
        dispatch(
          Analytics.track('Created Basic Wallet', {
            coin: createNewWalletData.currency.currencyAbbreviation,
            chain: createNewWalletData.currency.chain,
            isErc20Token: createNewWalletData.currency.isToken,
            context,
          }),
        );
        dispatch(
          Analytics.track(
            context === 'buyCrypto'
              ? 'Buy - Clicked Crypto'
              : 'Sell  - Clicked Crypto',
            {
              coin:
                createNewWalletData?.currency?.currencyAbbreviation ||
                'unknown',
              chain: createNewWalletData?.currency?.chain || 'unknown',
              isExistingWallet: false,
            },
          ),
        );
        setWallet(createdToWallet);
        await sleep(300);
        hideOngoingProcess();
      } catch (err: any) {
        hideOngoingProcess();
        await sleep(500);
        if (err.message === 'invalid password') {
          dispatch(showBottomNotificationModal(WrongPasswordError()));
        } else {
          walletError(err.message);
        }
      }
    }
  };

  const onDismiss = (
    newWallet?: Wallet,
    createNewWalletData?: AddWalletData,
  ) => {
    pendingWalletSelectionRef.current =
      newWallet || createNewWalletData
        ? {newWallet, createNewWalletData}
        : undefined;
    setWalletSelectorModalVisible(false);
  };

  const handleWalletSelectorModalHide = () => {
    const pendingSelection = pendingWalletSelectionRef.current;
    pendingWalletSelectionRef.current = undefined;

    if (pendingSelection) {
      applyWalletSelection(
        pendingSelection.newWallet,
        pendingSelection.createNewWalletData,
      );
    }
  };

  return (
    <ExternalServicesWalletSelectorContainer>
      {loading ? (
        <WalletSelector disabled>
          <WalletSelectorLeft>
            <ExternalServicesLoadingWalletSkeleton />
          </WalletSelectorLeft>
        </WalletSelector>
      ) : (
        <WalletSelector
          style={selectedWallet ? {} : {backgroundColor: Action}}
          onPressIn={
            context === 'buyCrypto' ? preloadBuyGlobalSelect : undefined
          }
          onPress={() => {
            setWalletSelectorModalVisible(true);
          }}>
          <WalletSelectorLeft>
            {selectedWallet ? (
              <>
                <CurrencyImage
                  img={selectedWallet.img}
                  badgeUri={getBadgeImg(
                    getCurrencyAbbreviation(
                      selectedWallet.currencyAbbreviation,
                      selectedWallet.chain,
                    ),
                    selectedWallet.chain,
                  )}
                  size={20}
                />
                <WalletSelectorName ellipsizeMode="tail" numberOfLines={1}>
                  {selectedWallet.walletName
                    ? selectedWallet.walletName
                    : selectedWallet.currencyName}
                </WalletSelectorName>
              </>
            ) : (
              <WalletSelectorName
                ellipsizeMode="tail"
                numberOfLines={1}
                style={{fontWeight: '500', color: White}}>
                {t('Choose Crypto')}
              </WalletSelectorName>
            )}
          </WalletSelectorLeft>
          <WalletSelectorRight>
            <ArrowContainer style={{marginRight: 10}}>
              <SelectorArrowRight
                {...{
                  width: 5,
                  height: 9,
                  color: selectedWallet
                    ? theme.dark
                      ? Slate
                      : SlateDark
                    : White,
                }}
              />
            </ArrowContainer>
          </WalletSelectorRight>
        </WalletSelector>
      )}

      <SheetModal
        modalLibrary="bottom-sheet"
        isVisible={walletSelectorModalVisible}
        onBackdropPress={() => onDismiss()}
        onModalHide={handleWalletSelectorModalHide}
        fullscreen>
        <GlobalSelectContainer>
          <GlobalSelect
            route={globalSelectRoute}
            navigation={navigation}
            modalContext={
              context === 'buyCrypto'
                ? 'buy'
                : context === 'sellCrypto'
                ? 'sell'
                : undefined
            }
            livenetOnly={!__DEV__}
            useAsModal={true}
            modalTitle={t('Select Crypto')}
            customToSelectCurrencies={
              context === 'buyCrypto'
                ? buyCryptoSupportedCoinsFullObj
                : undefined
            }
            preloadedCustomToSelectCurrenciesList={
              context === 'buyCrypto'
                ? buyGlobalSelectCacheRef.current
                : undefined
            }
            customSupportedCurrencies={
              context === 'sellCrypto' ? sellCryptoSupportedCoins : undefined
            }
            globalSelectOnDismiss={onDismiss}
          />
        </GlobalSelectContainer>
      </SheetModal>
    </ExternalServicesWalletSelectorContainer>
  );
};

export default ExternalServicesWalletSelector;
