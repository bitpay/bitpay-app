import React, {
  ReactElement,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react';
import styled from 'styled-components/native';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {
  convertToFiat,
  formatFiatAmount,
  getCurrencyAbbreviation,
  keyExtractor,
  sleep,
} from '../../../utils/helper-methods';
import {FlatList, TouchableOpacity, View} from 'react-native';
import {AvailableWalletsPill} from '../../../components/list/GlobalSelectRow';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {
  ActiveOpacity,
  CurrencyColumn,
  CurrencyImageContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import _ from 'lodash';
import KeyWalletsRow, {
  KeyWallet,
  KeyWalletsRowProps,
} from '../../../components/list/KeyWalletsRow';
import merge from 'lodash.merge';
import cloneDeep from 'lodash.clonedeep';
import {
  Black,
  LightBlack,
  LuckySevens,
  Slate30,
  SlateDark,
  White,
} from '../../../styles/colors';
import {
  H4,
  TextAlign,
  BaseText,
  H7,
  H6,
  SubText,
} from '../../../components/styled/Text';
import {useNavigation, useTheme} from '@react-navigation/native';
import CloseModal from '../../../../assets/img/close-modal-icon.svg';
import InfoSvg from '../../../../assets/img/info.svg';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {useTranslation} from 'react-i18next';
import {findWalletById, toFiat} from '../../../store/wallet/utils/wallet';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import NestedArrowIcon from '../../../components/nested-arrow/NestedArrow';
import {SearchContainer} from '../../wallet/screens/CurrencySelection';
import {
  createHomeCardList,
  keyBackupRequired,
} from '../../tabs/home/components/Crypto';
import {AddWalletData} from '../../../store/wallet/effects/create/create';
import {Network} from '../../../constants';
import CurrencySelectionSearchInput from '../../wallet/components/CurrencySelectionSearchInput';
import {
  DescriptionRow,
  TokensHeading,
} from '../../../components/list/CurrencySelectionRow';
import {IsUtxoCoin} from '../../../store/wallet/utils/currency';
import {SUPPORTED_EVM_COINS} from '../../../constants/currencies';

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
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const WalletSelectMenuContainer = styled.View`
  padding: 0 ${ScreenGutter};
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  max-height: 75%;
`;

const WalletSelectMenuHeaderContainer = styled.View`
  padding: 20px;
`;

const WalletSelectMenuBodyContainer = styled.ScrollView`
  padding-bottom: 20px;
`;

const NoWalletsMsg = styled(BaseText)`
  font-size: 15px;
  text-align: center;
  margin-top: 20px;
`;

const RowContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
`;

const CurrencySubTitle = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? LuckySevens : SlateDark)};
  font-size: 12px;
`;

const ChainCointainer = styled.View`
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  border-radius: 12px;
  flex-direction: column;
  margin: 0 ${ScreenGutter} ${ScreenGutter};
  padding: 16px;
`;

const TokensFooter = styled.View`
  align-items: center;
`;

const ViewAllLink = styled(H6)`
  color: ${({theme}) => theme.colors.link};
  text-align: center;
`;

export interface ToWalletSelectorCustomCurrency {
  currencyAbbreviation: string;
  symbol: string;
  chain: string;
  name: string;
  logoUri?: any;
  tokenAddress?: string;
}

interface ToWalletSelectorCoinObj {
  id: string;
  chain: string;
  currencyAbbreviation: string;
  currencyName: string;
  tokenAddress?: string;
  img?: string | ((props?: any) => ReactElement);
  total: number;
  availableWalletsByKey: {
    [key in string]: Wallet[];
  };
}

interface ToWalletSelectorChainObj extends ToWalletSelectorCoinObj {
  tokens?: ToWalletSelectorCoinObj[];
}

const buildList = (
  category: ToWalletSelectorCustomCurrency[],
  wallets: Wallet[],
  context?: string,
) => {
  let coins: ToWalletSelectorCoinObj[] = [];
  let chains: ToWalletSelectorChainObj[] = [];
  category.forEach(coin => {
    const availableWallets = wallets.filter(
      wallet =>
        getCurrencyAbbreviation(wallet.currencyAbbreviation, wallet.chain) ===
        coin.symbol,
    );

    coins.push({
      id: Math.random().toString(),
      currencyAbbreviation: coin.currencyAbbreviation,
      currencyName: availableWallets.length
        ? availableWallets[0].currencyName
        : coin.name,
      img: availableWallets.length ? availableWallets[0].img : coin.logoUri,
      chain: coin.chain,
      total: availableWallets.length,
      availableWalletsByKey: _.groupBy(
        availableWallets,
        wallet => wallet.keyId,
      ),
      tokenAddress: coin.tokenAddress,
    });
  });

  chains =
    context === 'coinbase'
      ? coins
      : coins.filter(coin => coin.chain === coin.currencyAbbreviation);
  chains.forEach(chain => {
    if (SUPPORTED_EVM_COINS.includes(chain.currencyAbbreviation)) {
      chain.tokens = coins.filter(
        coin =>
          coin.chain === chain.currencyAbbreviation &&
          coin.chain !== coin.currencyAbbreviation,
      );
    }
  });

  return chains;
};

interface ToWalletSelectorModalProps {
  isVisible: boolean;
  modalTitle?: string;
  disabledChain?: string | undefined;
  customSupportedCurrencies?: ToWalletSelectorCustomCurrency[];
  onDismiss: (toWallet?: Wallet, createToWalletData?: AddWalletData) => void;
  modalContext?: string;
  livenetOnly?: boolean;
  onHelpPress?: () => void;
}

const ToWalletSelectorModal: React.FC<ToWalletSelectorModalProps> = ({
  isVisible,
  modalTitle,
  disabledChain,
  customSupportedCurrencies = [],
  onDismiss,
  modalContext,
  livenetOnly,
  onHelpPress,
}) => {
  const {t} = useTranslation();
  const context = modalContext;
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const {rates} = useAppSelector(({RATE}) => RATE);
  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);
  const [keySelectorModalVisible, setKeySelectorModalVisible] =
    useState<boolean>(false);
  const [viewAllChainSelected, setViewAllChainSelected] = useState<string>();
  const [addTokenToLinkedWallet, setAddTokenToLinkedWallet] =
    useState<ToWalletSelectorCoinObj>();
  const [cardsList, setCardsList] = useState<any>();
  const navigation = useNavigation();
  const [searchFilter, setSearchFilter] = useState('');
  const [walletSelectModalVisible, setWalletSelectModalVisible] =
    useState(false);

  const DESCRIPTIONS: Record<string, string> = {
    eth: t('TokensOnEthereumNetworkDescription'),
    matic: t('TokensOnPolygonNetworkDescription'),
  };
  // object to pass to select modal
  const [keyWallets, setKeysWallets] =
    useState<KeyWalletsRowProps<KeyWallet>[]>();

  // all wallets
  let wallets = Object.values(keys)
    .filter((key: any) => key.backupComplete)
    .flatMap((key: any) => key.wallets);

  // Filter hidden and incomplete wallets
  wallets = wallets.filter(wallet => !wallet.hideWallet && wallet.isComplete());

  if (livenetOnly) {
    wallets = wallets.filter(
      wallet => wallet.credentials.network === 'livenet',
    );
  }

  const supportedCoins = useMemo(
    () => buildList(customSupportedCurrencies, wallets, context),
    [wallets, customSupportedCurrencies],
  );

  const handleBasicWalletCreation = async (
    selectedCurrency: ToWalletSelectorChainObj,
    key: Key,
  ) => {
    if (!selectedCurrency?.currencyAbbreviation) {
      logger.warn('No adding coin provided. Aborting wallet creation');
      return;
    }

    // adds wallet and binds to key obj - creates eth wallet if needed
    const addWalletData: AddWalletData = {
      key,
      associatedWallet: undefined,
      currency: {
        currencyAbbreviation:
          selectedCurrency.currencyAbbreviation.toLowerCase(),
        isToken:
          selectedCurrency.currencyAbbreviation.toLowerCase() !==
          selectedCurrency.chain,
        chain: selectedCurrency.chain,
        tokenAddress: selectedCurrency.tokenAddress,
      },
      options: {
        network: Network.mainnet,
        useNativeSegwit: IsUtxoCoin(selectedCurrency.currencyAbbreviation),
        singleAddress: false,
        walletName: undefined,
      },
    };

    if (addWalletData) {
      onWalletSelect(undefined, addWalletData);
    }
  };

  const onKeySelected = async (
    selectedCurrency: ToWalletSelectorChainObj,
    selectedKey: Key,
  ) => {
    setKeySelectorModalVisible(false);
    if (selectedKey.backupComplete) {
      logger.debug(
        `Key selected. Adding ${selectedCurrency.currencyAbbreviation} wallet.`,
      );
      handleBasicWalletCreation(selectedCurrency, selectedKey);
    } else {
      logger.debug('Key selected. Needs backup.');
      if (onDismiss) {
        onDismiss();
      }
      await sleep(1000);
      dispatch(
        showBottomNotificationModal(
          keyBackupRequired(selectedKey, navigation, dispatch, context),
        ),
      );
    }
  };

  const openKeyWalletSelector = useCallback(
    (selectObj: ToWalletSelectorCoinObj) => {
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

  const onWalletSelect = async (
    wallet?: Wallet,
    addWalletData?: AddWalletData,
  ) => {
    if (onDismiss) {
      setWalletSelectModalVisible(false);
      await sleep(100);
      onDismiss(wallet, addWalletData);
      return;
    }
  };

  const onLinkedWalletSelect = async (linkedWallet: Wallet) => {
    if (!addTokenToLinkedWallet) {
      logger.warn('No Token data provided. Aborting token wallet creation');
      onWalletSelect(undefined, undefined);
      return;
    }
    logger.debug(
      `Linked wallet selected. Adding ${addTokenToLinkedWallet.currencyAbbreviation} wallet.`,
    );

    // Needed to prevent pointer issues
    const associatedWallet = findWalletById(
      keys[linkedWallet.keyId].wallets,
      linkedWallet.id,
    ) as Wallet;

    const addWalletData: AddWalletData = {
      key: keys[linkedWallet.keyId],
      associatedWallet: associatedWallet,
      currency: {
        currencyAbbreviation: addTokenToLinkedWallet.currencyAbbreviation,
        isToken: true,
        chain: addTokenToLinkedWallet.chain,
        tokenAddress: addTokenToLinkedWallet.tokenAddress,
      },
      options: {
        network: Network.mainnet,
        useNativeSegwit: undefined,
        singleAddress: false,
        walletName: undefined,
      },
    };

    if (addWalletData) {
      onWalletSelect(undefined, addWalletData);
    }
  };

  const openKeySelector = (
    currency: ToWalletSelectorChainObj | ToWalletSelectorCoinObj,
  ) => {
    setCardsList(
      createHomeCardList({
        navigation,
        keys: Object.values(keys),
        dispatch,
        linkedCoinbase: false,
        homeCarouselConfig: homeCarouselConfig || [],
        homeCarouselLayoutType: 'listView',
        hideKeyBalance: hideAllBalances,
        context: 'keySelector',
        onPress: onKeySelected,
        currency: currency,
      }),
    );
    setKeySelectorModalVisible(true);
  };

  const isChainDisabled = (currencySymbol: string): boolean => {
    // disabledChain to prevent show chain selected as source, but show the available tokens
    return (
      !!disabledChain &&
      SUPPORTED_EVM_COINS.includes(disabledChain) &&
      disabledChain === currencySymbol.toLowerCase()
    );
  };

  const handleCurrencyOnPress = (
    currency: ToWalletSelectorChainObj | ToWalletSelectorCoinObj,
  ): void => {
    if (
      isChainDisabled(
        getCurrencyAbbreviation(currency.currencyAbbreviation, currency.chain),
      )
    ) {
      logger.warn(
        `${disabledChain} is disabled, since it is the source of the Swap. Showing available tokens anyways`,
      );
      return;
    }
    // if only one wallet - skip wallet selector
    const wallets = Object.values(currency.availableWalletsByKey).flat();
    if (wallets.length === 1) {
      onWalletSelect(wallets[0]);
    } else if (wallets.length === 0) {
      // Case: ETH Token => show linked Eth wallets
      if (currency.chain === 'eth' && currency.currencyAbbreviation !== 'eth') {
        const linkedChain = supportedCoins.filter(
          coin => coin.currencyAbbreviation === 'eth' && coin.chain === 'eth',
        );
        if (
          linkedChain[0] &&
          Object.keys(linkedChain[0]?.availableWalletsByKey)[0]
        ) {
          setAddTokenToLinkedWallet(currency);
          openKeyWalletSelector(linkedChain[0]);
        } else {
          // Case: no ETH wallets available and the user wants to add a new token
          openKeySelector(currency);
        }
        // Case: MATIC Token => show linked Matic wallets
      } else if (
        currency.chain === 'matic' &&
        currency.currencyAbbreviation !== 'matic'
      ) {
        const linkedChain = supportedCoins.filter(
          coin =>
            coin.currencyAbbreviation === 'matic' && coin.chain === 'matic',
        );
        if (Object.keys(linkedChain[0]?.availableWalletsByKey)[0]) {
          setAddTokenToLinkedWallet(currency);
          openKeyWalletSelector(linkedChain[0]);
        } else {
          // Case: no MATIC wallets available and the user wants to add a new token
          openKeySelector(currency);
        }
      } else {
        // Case: create no token coin => Open Key Selector
        openKeySelector(currency);
      }
    } else {
      openKeyWalletSelector(currency);
    }
  };

  const onViewAllTokensPressed = (item: ToWalletSelectorChainObj) => {
    if (viewAllChainSelected === item.currencyAbbreviation) {
      setViewAllChainSelected('');
    } else {
      setViewAllChainSelected(item.currencyAbbreviation);
    }
  };

  const renderItem = ({item}: {item: ToWalletSelectorChainObj}) => {
    const {currencyName, currencyAbbreviation, total, img, tokens} = item;
    return (
      <ChainCointainer key={item.id}>
        <RowContainer
          activeOpacity={ActiveOpacity}
          onPress={() => {
            handleCurrencyOnPress(item);
          }}>
          <CurrencyImageContainer>
            <CurrencyImage img={img} size={40} />
          </CurrencyImageContainer>
          <CurrencyColumn>
            <H7 medium={true}>{currencyName}</H7>
            <CurrencySubTitle>
              {currencyAbbreviation.toUpperCase()}
            </CurrencySubTitle>
          </CurrencyColumn>
          {total >= 1 &&
          !isChainDisabled(
            getCurrencyAbbreviation(currencyAbbreviation, item.chain),
          ) ? (
            <AvailableWalletsPill>
              <H7 medium={true}>
                {total} {total === 1 ? t('Wallet') : t('Wallets')}
              </H7>
            </AvailableWalletsPill>
          ) : null}
        </RowContainer>
        {tokens && tokens.length > 0 ? (
          <>
            {DESCRIPTIONS[currencyAbbreviation] ? (
              <DescriptionRow>
                {DESCRIPTIONS[currencyAbbreviation]}
              </DescriptionRow>
            ) : null}
            {DESCRIPTIONS[currencyAbbreviation] ? (
              <TokensHeading>
                {t('PopularArgTokens', {currency: currencyName})}
              </TokensHeading>
            ) : null}
          </>
        ) : null}
        {tokens
          ? tokens.map(
              (token, index) =>
                index <=
                  (viewAllChainSelected === currencyAbbreviation
                    ? tokens.length
                    : 2) && (
                  <RowContainer
                    key={token.id}
                    style={{marginBottom: 24}}
                    activeOpacity={ActiveOpacity}
                    onPress={() => {
                      handleCurrencyOnPress(token);
                    }}>
                    <CurrencyImageContainer
                      style={{width: 20, marginRight: 16}}>
                      <NestedArrowIcon />
                    </CurrencyImageContainer>
                    <CurrencyImageContainer>
                      <CurrencyImage img={token.img} badgeUri={img} />
                    </CurrencyImageContainer>
                    <CurrencyColumn>
                      <H7 medium={true}>{token.currencyName}</H7>
                      <CurrencySubTitle>
                        {token.currencyAbbreviation.toUpperCase()}
                      </CurrencySubTitle>
                    </CurrencyColumn>
                    {token.total >= 1 && (
                      <AvailableWalletsPill>
                        <H7 medium={true}>
                          {token.total}{' '}
                          {token.total === 1 ? t('Wallet') : t('Wallets')}
                        </H7>
                      </AvailableWalletsPill>
                    )}
                  </RowContainer>
                ),
            )
          : null}
        {tokens && tokens.length > 3 ? (
          <TokensFooter>
            <ViewAllLink
              onPress={() => {
                onViewAllTokensPressed(item);
              }}>
              {viewAllChainSelected !== currencyAbbreviation
                ? t('ViewAllArgTokens', {currency: currencyName})
                : t('MinimizeArgTokens', {currency: currencyName})}
            </ViewAllLink>
          </TokensFooter>
        ) : null}
      </ChainCointainer>
    );
  };

  /**
   * Derived from allListItems, but with search filter applied.
   */
  const filteredListItems = useMemo(() => {
    // If no filter, return reference to allListItems.
    if (!searchFilter) {
      return supportedCoins;
    }

    // Else return a new array to trigger a rerender.
    return supportedCoins.reduce<ToWalletSelectorChainObj[]>((accum, item) => {
      let isCurrencyMatch =
        item.currencyAbbreviation.toLowerCase().includes(searchFilter) ||
        item.currencyName.toLowerCase().includes(searchFilter);

      // Search inside tokens list
      if (item.tokens) {
        item.tokens = item.tokens.reduce<ToWalletSelectorCoinObj[]>(
          (_accum, _item) => {
            const isTokenMatch =
              _item.currencyAbbreviation.toLowerCase().includes(searchFilter) ||
              _item.currencyName.toLowerCase().includes(searchFilter);

            if (isTokenMatch) {
              isCurrencyMatch = true;
              _accum.push({
                ..._item,
              });
            }
            return _accum;
          },
          [],
        );
      }

      // Display the item if the currency itself matches the filter or one of its tokens matches
      if (isCurrencyMatch) {
        accum.push({
          ...item,
        });
      }

      return accum;
    }, []);
  }, [searchFilter, supportedCoins]);

  useEffect(() => {
    if (isVisible) {
      setSearchFilter('');
      setViewAllChainSelected('');
      setAddTokenToLinkedWallet(undefined);
    }
  }, [isVisible]);

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onDismiss}>
      <GlobalSelectContainer>
        <SafeAreaView>
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
          {context === 'swapCrypto' && (
            <TextAlign
              style={{marginTop: 15, marginLeft: 5, marginRight: 5}}
              align={'center'}>
              <SubText>{t('swapToWalletsConditionMessage')}</SubText>
            </TextAlign>
          )}
          {context !== 'coinbase' && (
            <SearchContainer>
              <CurrencySelectionSearchInput
                onSearch={setSearchFilter}
                debounceWait={300}
              />
            </SearchContainer>
          )}
          <GlobalSelectContainer>
            {filteredListItems && [...filteredListItems].length > 0 && (
              <FlatList
                contentContainerStyle={{paddingBottom: 100}}
                data={[...filteredListItems]}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
              />
            )}
            {filteredListItems && [...filteredListItems].length === 0 && (
              <NoWalletsMsg>
                {t('There are no wallets available to use this feature.')}
              </NoWalletsMsg>
            )}

            <SheetModal
              isVisible={walletSelectModalVisible}
              onBackdropPress={() => {
                setAddTokenToLinkedWallet(undefined);
                setWalletSelectModalVisible(false);
              }}>
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
                    onPress={
                      addTokenToLinkedWallet?.currencyAbbreviation
                        ? onLinkedWalletSelect
                        : onWalletSelect
                    }
                  />
                </WalletSelectMenuBodyContainer>
              </WalletSelectMenuContainer>
            </SheetModal>

            <SheetModal
              isVisible={keySelectorModalVisible}
              onBackdropPress={() => setKeySelectorModalVisible(false)}>
              <WalletSelectMenuContainer>
                <WalletSelectMenuHeaderContainer>
                  <TextAlign align={'center'}>
                    <H4>
                      {context === 'swapCrypto'
                        ? t('Swap to')
                        : t('Select Destination')}
                    </H4>
                  </TextAlign>
                  <NoWalletsMsg>
                    {context === 'swapCrypto'
                      ? t('Choose a key you would like to swap the funds to')
                      : t(
                          'Choose a key you would like to deposit the funds to',
                        )}
                  </NoWalletsMsg>
                </WalletSelectMenuHeaderContainer>
                <WalletSelectMenuBodyContainer>
                  {cardsList?.list.map((data: any) => {
                    return <View key={data.id}>{data.component}</View>;
                  })}
                </WalletSelectMenuBodyContainer>
              </WalletSelectMenuContainer>
            </SheetModal>
          </GlobalSelectContainer>
        </SafeAreaView>
      </GlobalSelectContainer>
    </SheetModal>
  );
};

export default ToWalletSelectorModal;
