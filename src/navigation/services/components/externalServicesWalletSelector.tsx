import React, {useEffect, useRef, useState} from 'react';
import styled, {useTheme} from 'styled-components/native';
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

const GlobalSelectContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const ArrowContainer = styled.View`
  margin-left: 10px;
`;

export const ExternalServicesWalletSelectorContainer = styled.View`
  margin: 8px 16px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

export const WalletSelector = styled(TouchableOpacity)`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  height: 36px;
  border-radius: 27.5px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  min-width: 146px;
`;

export const WalletSelectorLeft = styled.View`
  display: flex;
  justify-content: left;
  flex-direction: row;
  align-items: center;
`;

export const WalletSelectorRight = styled.View`
  display: flex;
  justify-content: right;
  flex-direction: row;
  align-items: center;
`;

export const WalletSelectorName = styled.Text`
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-left: 8px;
`;

interface ExternalServicesWalletSelectorScreenProps {
  navigation: any;
  route: any;
  context: ExternalServicesContext | undefined;
  buyCryptoSupportedCoins: string[];
  buyCryptoSupportedCoinsFullObj: ToWalletSelectorCustomCurrency[];
  sellCryptoSupportedCoins: string[] | undefined;
  sellCryptoSupportedCoinsFullObj?: SellCryptoCoin[] | undefined;
  onWalletSelected?: (wallet: Wallet) => void;
  fromWallet?: any;
  currencyAbbreviation?: string | undefined; // used from charts and deeplinks.
  chain?: string | undefined; // used from charts and deeplinks.
  partner?: BuyCryptoExchangeKey | undefined; // used from deeplinks.
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
  currencyAbbreviation,
  chain,
}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const logger = useLogger();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const allKeys: {[key: string]: Key} = useAppSelector(
    ({WALLET}: RootState) => WALLET.keys,
  );

  const preSetWallet = fromWallet;
  const fromCurrencyAbbreviation = currencyAbbreviation?.toLowerCase();
  const fromChain = chain?.toLowerCase();
  const [selectedWallet, setSelectedWallet] = useState<Wallet>();
  const [walletSelectorModalVisible, setWalletSelectorModalVisible] =
    useState(false);
  const autoSelectAttemptedRef = useRef(false);

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

  const selectFirstAvailableWallet = async () => {
    const keysList: Key[] = Object.values(allKeys).filter(
      key => key.backupComplete,
    );

    if (!keysList[0]) {
      await sleep(500);
      walletError('emptyKeyList');
      return;
    }

    if (preSetWallet?.id) {
      // Selected wallet from Wallet Details
      let fromWalletData;
      let allWallets: Wallet[] = [];

      keysList.forEach(key => {
        allWallets = [...allWallets, ...key.wallets];
      });

      fromWalletData = allWallets.find(wallet => wallet.id === preSetWallet.id);
      if (fromWalletData) {
        setWallet(fromWalletData);
        await sleep(500);
        hideOngoingProcess();
      } else {
        walletError(
          context === 'sellCrypto'
            ? 'walletNotSupported'
            : 'walletNotSupportedToBuy',
        );
      }
    } else {
      const availableKeys = keysList.filter(key => {
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
        }

        if (
          fromCurrencyAbbreviation &&
          (context === 'sellCrypto'
            ? sellCryptoSupportedCoinsFullObj?.some(
                coin =>
                  coin.symbol ===
                  (fromChain
                    ? getExternalServiceSymbol(
                        fromCurrencyAbbreviation,
                        fromChain,
                      )
                    : fromCurrencyAbbreviation),
              )
            : buyCryptoSupportedCoins.includes(
                fromChain
                  ? getExternalServiceSymbol(
                      fromCurrencyAbbreviation,
                      fromChain,
                    )
                  : fromCurrencyAbbreviation,
              ))
        ) {
          allowedWallets = allowedWallets.filter(
            wallet =>
              wallet.currencyAbbreviation === fromCurrencyAbbreviation &&
              (fromChain ? wallet.chain === fromChain : true),
          );
        }
        if (allowedWallets[0]) {
          _setSelectedWallet(allowedWallets[0]);
          await sleep(500);
          hideOngoingProcess();
        } else {
          walletError(
            context === 'sellCrypto'
              ? 'noWalletsAbleToSell'
              : 'noWalletsAbleToBuy',
            fromCurrencyAbbreviation,
          );
        }
      } else {
        walletError(
          context === 'sellCrypto'
            ? 'keysNoSupportedWalletToSell'
            : 'keysNoSupportedWallet',
          fromCurrencyAbbreviation,
        );
      }
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
      (!fromCurrencyAbbreviation ||
        (wallet.currencyAbbreviation === fromCurrencyAbbreviation &&
          (fromChain ? wallet.chain === fromChain : true)))
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

    if (!(preSetWallet?.id || fromCurrencyAbbreviation)) {
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

  const onDismiss = async (
    newWallet?: Wallet,
    createNewWalletData?: AddWalletData | undefined,
  ) => {
    setWalletSelectorModalVisible(false);
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

  return (
    <ExternalServicesWalletSelectorContainer>
      <WalletSelector
        style={selectedWallet ? {} : {backgroundColor: Action}}
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

      <SheetModal
        modalLibrary="bottom-sheet"
        isVisible={walletSelectorModalVisible}
        onBackdropPress={() => onDismiss()}
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
