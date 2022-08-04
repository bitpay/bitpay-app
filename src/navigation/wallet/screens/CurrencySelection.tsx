import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components/native';
import {
  CtaContainer,
  HeaderRightContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import CurrencySelectionRow, {
  CurrencySelectionItem,
  CurrencySelectionRowProps,
  CurrencySelectionToggleProps,
} from '../../../components/list/CurrencySelectionRow';

import Button from '../../../components/button/Button';
import {
  Currencies,
  SUPPORTED_TOKENS,
  SupportedCurrencies,
} from '../../../constants/currencies';
import {startCreateKey} from '../../../store/wallet/effects';
import {FlatList, ListRenderItem} from 'react-native';
import {
  logSegmentEvent,
  startOnGoingProcessModal,
} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {HeaderTitle} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {WalletScreens, WalletStackParamList} from '../WalletStack';
import {RootStackParamList} from '../../../Root';
import {
  dismissOnGoingProcessModal,
  setHomeCarouselConfig,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {Key} from '../../../store/wallet/wallet.models';
import {StackScreenProps} from '@react-navigation/stack';
import {sleep} from '../../../utils/helper-methods';
import {useLogger} from '../../../utils/hooks/useLogger';
import debounce from 'lodash.debounce';
import {
  useAppSelector,
  useAppDispatch,
  AppDispatch,
} from '../../../utils/hooks';
import {BitpaySupportedTokenOpts, TokenEx} from '../../../constants/tokens';
import {useTranslation} from 'react-i18next';
import CurrencySelectionSearchInput from '../components/CurrencySelectionSearchInput';
import CurrencySelectionNoResults from '../components/CurrencySelectionNoResults';

type CurrencySelectionScreenProps = StackScreenProps<
  WalletStackParamList,
  WalletScreens.CURRENCY_SELECTION
>;

type CurrencySelectionContextWithoutKey = 'onboarding' | 'createNewKey';
type CurrencySelectionContextWithKey = 'addWallet' | 'addWalletMultisig';
export type CurrencySelectionParamList =
  | {
      context: CurrencySelectionContextWithoutKey;
      key?: undefined;
    }
  | {
      context: CurrencySelectionContextWithKey;
      key: Key;
    };

type CurrencySelectionRowItem = Omit<CurrencySelectionRowProps, 'tokens'> & {
  /**
   * All tokens for this chain currency.
   */
  tokens: CurrencySelectionItem[];

  /**
   * Popular tokens for this chain currency. Needs to be kept in sync with tokens.
   * Using a separate property instead of deriving due to performance reasons.
   */
  popularTokens: CurrencySelectionItem[];
};

interface ContextHandler {
  listItems: CurrencySelectionRowItem[];
  headerTitle?: string;
  ctaTitle?: string;
  bottomCta?: (props: {
    selectedCurrencies: string[];
    dispatch: AppDispatch;
    navigation: NavigationProp<RootStackParamList>;
  }) => void;
  selectionCta?: (props: {
    currencyAbbreviation: string;
    currencyName: string;
    isToken?: boolean;
    navigation: NavigationProp<RootStackParamList>;
  }) => void;
  hideBottomCta?: boolean;
  hideCheckbox?: boolean;
}

export const CurrencySelectionContainer = styled.View`
  flex: 1;
`;

const ListContainer = styled.View`
  flex-shrink: 1;
`;

export const SearchContainer = styled.View`
  align-items: center;
  padding: 4px 0;
  margin: 20px ${ScreenGutter} 20px;
`;

const SupportedChainCurrencyOptions = SupportedCurrencyOptions.filter(
  currency => {
    return !currency.isToken;
  },
);

const SupportedMultisigCurrencyOptions: CurrencySelectionRowItem[] =
  SupportedCurrencyOptions.filter(currency => currency.hasMultisig).map(
    currency => {
      const item: CurrencySelectionRowItem = {
        currency: {
          ...currency,
          imgSrc: undefined,
          selected: false,
          disabled: false,
        },
        tokens: [],
        popularTokens: [],
      };

      return item;
    },
  );

const DESCRIPTIONS: Record<string, string> = {
  eth: 'TokensOnEthereumNetworkDescription',
  matic: 'TokensOnPolygonNetworkDescription',
};

const POPULAR_TOKENS: Record<string, string[]> = {
  eth: ['usdc', 'busd', 'gusd'],
  matic: ['usdc', 'busd', 'gusd'],
};

const keyExtractor = (item: CurrencySelectionRowItem) => item.currency.id;

const CurrencySelection: React.VFC<CurrencySelectionScreenProps> = ({
  route,
}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {context, key} = route.params;
  const logger = useLogger();
  const dispatch = useAppDispatch();

  /**
   * The state for rendering the input text component. This value updates immediately.
   */
  const [searchInput, setSearchInput] = useState('');
  const searchInputRef = useRef(searchInput);
  searchInputRef.current = searchInput;

  /**
   * The state for the value applied as a filter. This value is debounced.
   */
  const [searchFilter, setSearchFilter] = useState('');
  const appTokenOptions = useAppSelector(({WALLET}) => WALLET.tokenOptions);
  const appTokenData = useAppSelector(({WALLET}) => WALLET.tokenData);
  const appCustomTokenOptions = useAppSelector(
    ({WALLET}) => WALLET.customTokenOptions,
  );
  const appCustomTokenData = useAppSelector(
    ({WALLET}) => WALLET.customTokenData,
  );

  /**
   * Source of truth for which currencies are selected.
   */
  const [allListItems, setAllListItems] = useState<CurrencySelectionRowItem[]>(
    [],
  );
  const allListItemsRef = useRef(allListItems);
  allListItemsRef.current = allListItems;

  /**
   * Derived from allListItems, but with search filter applied.
   */
  const filteredListItems = useMemo(() => {
    // If no filter, return reference to allListItems.
    if (!searchFilter) {
      return allListItems;
    }

    // Else return a new array to trigger a rerender.
    return allListItems.reduce<CurrencySelectionRowItem[]>((accum, item) => {
      const isCurrencyMatch =
        item.currency.currencyAbbreviation
          .toLowerCase()
          .includes(searchFilter) ||
        item.currency.currencyName.toLowerCase().includes(searchFilter);
      const matchingTokens = item.popularTokens.filter(
        token =>
          token.currencyAbbreviation.toLowerCase().includes(searchFilter) ||
          token.currencyName.toLowerCase().includes(searchFilter),
      );

      // Display the item if the currency itself matches the filter or one of its tokens matches
      if (isCurrencyMatch || matchingTokens.length) {
        accum.push({
          ...item,
          popularTokens: matchingTokens,
        });
      }

      return accum;
    }, []);
  }, [searchFilter, allListItems]);

  // Format supported currencies and tokens into row item format.
  // Resets if tokenOptions or tokenData updates.
  useEffect(() => {
    const chainMap: Record<string, CurrencySelectionRowItem> = {};

    // Add all chain currencies to list
    const list: CurrencySelectionRowItem[] = SupportedChainCurrencyOptions.map(
      ({id, currencyAbbreviation, currencyName, img}) => {
        const item: CurrencySelectionRowItem = {
          currency: {
            id,
            currencyAbbreviation,
            currencyName,
            img,
            selected: false,
            disabled: false,
          },
          tokens: [],
          popularTokens: [],
          description: DESCRIPTIONS[id] ? t(DESCRIPTIONS[id]) : '',
        };

        chainMap[id.toLowerCase()] = item;

        return item;
      },
    );

    // For each token, add it to the token list for its parent chain object
    const allTokenOptions: Record<string, TokenEx> = {
      ...BitpaySupportedTokenOpts,
      ...appTokenOptions,
      ...appCustomTokenOptions,
    };
    Object.entries(allTokenOptions).forEach(([k, tokenOpt]) => {
      if (!(Currencies[k] || appTokenData[k] || appCustomTokenData[k])) {
        return;
      }

      const tokenData =
        Currencies[k] || appTokenData[k] || appCustomTokenData[k];
      const chainData = chainMap[tokenData.chain.toLowerCase()];

      const token: CurrencySelectionItem = {
        id: k,
        currencyAbbreviation: tokenOpt.symbol,
        currencyName: tokenOpt.name,
        img: tokenOpt.logoURI || chainData.currency.img || '',
        imgSrc: tokenOpt.logoSource || undefined,
        selected: false,
        disabled: false,
        isToken: true,
      };

      if (chainData) {
        if (!chainData.tokens) {
          chainData.tokens = [];
        }

        chainData.tokens.push(token);

        if (POPULAR_TOKENS[tokenData.chain.toLowerCase()].includes(token.id)) {
          chainData.popularTokens.push(token);
        }
      } else {
        // Parent chain currency not found, just push to the main list.
        list.push({
          currency: token,
          tokens: [],
          popularTokens: [],
        });
      }
    });

    setAllListItems(list);
  }, [
    t,
    appTokenData,
    appTokenOptions,
    appCustomTokenOptions,
    appCustomTokenData,
  ]);

  const showErrorModal = (e: string) => {
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: t('Something went wrong'),
        message: e,
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('OK'),
            action: () => {},
            primary: true,
          },
        ],
      }),
    );
  };

  const checkEthIfTokenSelected = (
    currencies: Array<string>,
  ): Array<string> => {
    const isEthSelected = currencies.some(c => c.toLowerCase() === 'eth');

    if (isEthSelected) {
      return currencies;
    }

    const ethState = allListItems.find(
      item => item.currency.id.toLowerCase() === 'eth',
    );

    const isEthTokenSelected = currencies.some(c => {
      const selectedLower = c.toLowerCase();

      return (
        SUPPORTED_TOKENS.includes(selectedLower) ||
        ethState?.tokens.some(token => {
          return token.id.toLowerCase() === selectedLower && token.selected;
        })
      );
    });

    if (isEthTokenSelected) {
      currencies.push('ETH');
    }

    return currencies;
  };

  const contextHandler = (): ContextHandler | undefined => {
    switch (context) {
      case 'onboarding':
      case 'createNewKey': {
        return {
          // @ts-ignore
          listItems: filteredListItems,
          ctaTitle: t('Create Key'),
          bottomCta: async ({selectedCurrencies, dispatch, navigation}) => {
            try {
              const currencies = checkEthIfTokenSelected(
                selectedCurrencies,
              )?.map(selected =>
                selected.toLowerCase(),
              ) as Array<SupportedCurrencies>;

              await dispatch(
                startOnGoingProcessModal(
                  // t('Creating Key')
                  t(OnGoingProcessMessages.CREATING_KEY),
                ),
              );
              const key = await dispatch(startCreateKey(currencies));

              dispatch(setHomeCarouselConfig({id: key.id, show: true}));

              navigation.navigate(
                context === 'onboarding' ? 'Onboarding' : 'Wallet',
                {
                  screen: 'BackupKey',
                  params: {context, key},
                },
              );
              dispatch(
                logSegmentEvent('track', 'Created Key', {
                  context,
                  coins: currencies,
                }),
              );
              dispatch(dismissOnGoingProcessModal());
            } catch (e: any) {
              logger.error(e.message);
              dispatch(dismissOnGoingProcessModal());
              await sleep(500);
              showErrorModal(e.message);
            }
          },
        };
      }

      case 'addWallet': {
        return {
          // @ts-ignore
          listItems: filteredListItems,
          headerTitle: t('Select Currency'),
          hideBottomCta: true,
          hideCheckbox: true,
          selectionCta: async ({
            currencyAbbreviation,
            currencyName,
            isToken,
            navigation,
          }) => {
            if (!key) {
              // TODO
              console.error('add wallet - key not found');
            } else {
              navigation.navigate('Wallet', {
                screen: 'AddWallet',
                params: {key, currencyAbbreviation, currencyName, isToken},
              });
            }
          },
        };
      }
      case 'addWalletMultisig': {
        return {
          listItems: SupportedMultisigCurrencyOptions,
          headerTitle: t('Select Currency'),
          hideBottomCta: true,
          hideCheckbox: true,
          selectionCta: async ({currencyAbbreviation, navigation}) => {
            navigation.navigate('Wallet', {
              screen: 'CreateMultisig',
              params: {currency: currencyAbbreviation, key},
            });
          },
        };
      }
    }
  };

  const {
    listItems = [],
    bottomCta,
    ctaTitle,
    headerTitle,
    hideBottomCta,
    selectionCta,
    hideCheckbox,
  } = contextHandler() || {};

  // Configuring Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>{headerTitle || t('Select Currencies')}</HeaderTitle>
      ),
      headerTitleAlign: 'center',
      headerRight: () =>
        context === 'onboarding' && (
          <HeaderRightContainer>
            <Button
              buttonType={'pill'}
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('Onboarding', {
                  screen: 'TermsOfUse',
                  params: {
                    context: 'TOUOnly',
                  },
                });
              }}>
              {t('Skip')}
            </Button>
          </HeaderRightContainer>
        ),
    });
  }, [navigation, t, context, headerTitle]);

  const selectedCurrencies = useMemo(() => {
    return allListItems.reduce<string[]>((accum, item) => {
      if (item.currency.selected) {
        accum.push(item.currency.currencyAbbreviation);
      }

      item.tokens.forEach(token => {
        if (token.selected) {
          accum.push(token.currencyAbbreviation);
        }
      });
      return accum;
    }, []);
  }, [allListItems]);

  const resetSearch = () => {
    setSearchInput('');
    debouncedSetSearchFilter('');
  };

  const toggleCurrency = (id: string) => {
    setAllListItems(previous =>
      previous.map(item => {
        const isCurrencyMatch = item.currency.id === id;
        const tokenMatch = item.tokens.find(token => token.id === id);

        if (isCurrencyMatch) {
          item.currency = {
            ...item.currency,
            selected: !item.currency.selected,
          };
        } else if (tokenMatch) {
          const updatedToken = {
            ...tokenMatch,
            selected: !tokenMatch.selected,
          };

          // update token state
          item.tokens = item.tokens.map(token => {
            return token.id === id ? updatedToken : token;
          });

          // update popular token state
          // add tokens once selected so user can see their entire selection
          // don't remove tokens once added so user doesn't have to hunt for it again if they toggle it on/off
          let appendToPopular = true;
          item.popularTokens = item.popularTokens.map(token => {
            if (token.id === id) {
              appendToPopular = false;
            }

            return token.id === id ? updatedToken : token;
          });

          if (appendToPopular) {
            item.popularTokens.push(updatedToken);
          }
        }

        return item;
      }),
    );
  };

  const onToggle = ({
    id,
    currencyName,
    currencyAbbreviation,
    isToken,
  }: CurrencySelectionToggleProps) => {
    if (selectionCta) {
      resetSearch();
      selectionCta({
        currencyAbbreviation,
        currencyName,
        isToken,
        navigation,
      });
    } else {
      toggleCurrency(id);
    }
  };
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;

  const memoizedOnToggle = useCallback((args: CurrencySelectionToggleProps) => {
    onToggleRef.current(args);
  }, []);

  const memoizedOnViewAllPressed = useMemo(() => {
    return (currency: CurrencySelectionItem) => {
      const item = allListItemsRef.current.find(
        i => i.currency.id === currency.id,
      );

      if (!item) {
        return;
      }

      const sortedTokens = item.tokens.map(token => ({...token}));

      // sorted selected tokens to the top for ease of use
      sortedTokens.sort((a, b) => {
        if (a.selected && !b.selected) {
          return -1;
        }
        if (b.selected && !a.selected) {
          return 1;
        }

        return 0;
      });

      navigation.navigate('Wallet', {
        screen: WalletScreens.CURRENCY_TOKEN_SELECTION,
        params: {
          currency: {...currency},
          tokens: sortedTokens,
          description: item.description,
          hideCheckbox: hideCheckbox,
          onToggle: memoizedOnToggle,
        },
      });
    };
  }, [memoizedOnToggle, navigation, hideCheckbox]);

  const renderItem: ListRenderItem<CurrencySelectionRowItem> = useCallback(
    ({item}) => {
      return (
        <CurrencySelectionRow
          key={item.currency.id}
          currency={item.currency}
          tokens={item.popularTokens}
          description={item.description}
          onToggle={memoizedOnToggle}
          hideCheckbox={hideCheckbox}
          onViewAllTokensPressed={memoizedOnViewAllPressed}
        />
      );
    },
    [t, memoizedOnToggle, memoizedOnViewAllPressed, hideCheckbox],
  );

  const debouncedSetSearchFilter = useMemo(
    () =>
      debounce((search: string) => {
        // after debouncing, if current search is null, ignore the previous search
        searchInputRef.current ? setSearchFilter(search.toLowerCase()) : null;
      }, 300),
    [],
  );

  return (
    <CurrencySelectionContainer>
      <SearchContainer>
        <CurrencySelectionSearchInput
          value={searchInput}
          onChangeText={text => {
            setSearchInput(text);

            // if 2+ char, filter search
            // else if 1 char, do nothing
            // else if 0 char, clear search immediately
            if (!text) {
              setSearchFilter(text);
            } else if (text.length > 1) {
              debouncedSetSearchFilter(text);
            }
          }}
          onSearchPress={search => {
            if (search) {
              setSearchInput('');
              setSearchFilter('');
            }
          }}
        />
      </SearchContainer>

      {listItems.length ? (
        <ListContainer>
          <FlatList<CurrencySelectionRowItem>
            data={listItems}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
          />
        </ListContainer>
      ) : (
        <CurrencySelectionNoResults query={searchFilter} walletKey={key} />
      )}

      {bottomCta && !hideBottomCta && (
        <CtaContainer
          style={{
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 4},
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
            marginTop: 16,
          }}>
          <Button
            onPress={() =>
              bottomCta({selectedCurrencies, dispatch, navigation})
            }
            buttonStyle={'primary'}
            disabled={!selectedCurrencies.length}>
            {ctaTitle}
          </Button>
        </CtaContainer>
      )}
    </CurrencySelectionContainer>
  );
};

export default CurrencySelection;
