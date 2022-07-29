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
  CtaContainerAbsolute,
  HeaderRightContainer,
} from '../../../components/styled/Containers';
import CurrencySelectionRow, {
  CurrencySelectionItem,
  CurrencySelectionRowProps,
  CurrencySelectionToggleProps,
} from '../../../components/list/CurrencySelectionRow';

import Button from '../../../components/button/Button';
import {
  SUPPORTED_CURRENCIES,
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
import {BitpaySupportedTokenOpts} from '../../../constants/tokens';
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

interface ContextHandler {
  listItems: CurrencySelectionRowProps[];
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

export const ListContainer = styled.View`
  margin-top: 20px;
`;

export const SearchContainer = styled.View`
  align-items: center;
  padding: 4px 0;
  margin: 20px 10px 0;
`;

const SupportedMultisigCurrencyOptions: CurrencySelectionRowProps[] =
  SupportedCurrencyOptions.filter(currency => currency.hasMultisig).map(
    currency => {
      const item: CurrencySelectionRowProps = {
        currency: {
          ...currency,
          selected: false,
          disabled: false,
        },
      };

      return item;
    },
  );

const DESCRIPTIONS: Record<string, string> = {
  eth: 'TokensOnEthereumNetworkDescription',
  matic: 'TokensOnPolygonNetworkDescription',
};

const keyExtractor = (item: CurrencySelectionRowProps) => item.currency.id;

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
  const [allListItems, setAllListItems] = useState<CurrencySelectionRowProps[]>(
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
    return allListItems.reduce<CurrencySelectionRowProps[]>((accum, item) => {
      const currencyMatch =
        item.currency.currencyAbbreviation
          .toLowerCase()
          .includes(searchFilter) ||
        item.currency.currencyName.toLowerCase().includes(searchFilter);

      if (currencyMatch) {
        accum.push(item);
      } else if (item.tokens?.length) {
        const tokenMatch = item.tokens.filter(
          token =>
            token.currencyAbbreviation.toLowerCase().includes(searchFilter) ||
            token.currencyName.toLowerCase().includes(searchFilter),
        );

        if (tokenMatch.length) {
          accum.push({
            ...item,
            tokens: tokenMatch,
          });
        }
      }

      return accum;
    }, []);
  }, [searchFilter, allListItems]);

  // Format supported currencies and tokens into row item format.
  // Resets if tokenOptions or tokenData updates.
  useEffect(() => {
    const chainMap: Record<string, CurrencySelectionRowProps> = {};

    // Add all top level currencies to list
    const list: CurrencySelectionRowProps[] = SupportedCurrencyOptions.map(
      ({id, currencyAbbreviation, currencyName, img}) => {
        const item = {
          currency: {
            id,
            currencyAbbreviation,
            currencyName,
            img,
            selected: false,
            disabled: false,
          },
          tokens: [],
          description: DESCRIPTIONS[id] ? t(DESCRIPTIONS[id]) : '',
        };

        chainMap[id.toLowerCase()] = item;

        return item;
      },
    );

    // For each token, add it to the token list for its parent chain object
    const allTokenOptions = {
      ...BitpaySupportedTokenOpts,
      ...appTokenOptions,
      ...appCustomTokenOptions,
    };
    Object.entries(allTokenOptions).forEach(([k, tokenOpt]) => {
      if (
        SUPPORTED_CURRENCIES.includes(k) ||
        !(appTokenData[k] || appCustomTokenData[k])
      ) {
        return;
      }

      const tokenData = appTokenData[k] || appCustomTokenData[k];
      const chainData = chainMap[tokenData.chain.toLowerCase()];

      const token: CurrencySelectionItem = {
        id: k,
        currencyAbbreviation: tokenOpt.symbol,
        currencyName: tokenOpt.name,
        img: tokenOpt.logoURI || chainData?.currency.img || '',
        selected: false,
        disabled: false,
        isToken: true,
      };

      if (chainData) {
        if (!chainData.tokens) {
          chainData.tokens = [];
        }

        chainData.tokens.push(token);
      } else {
        // Parent chain currency not found, just push to the main list.
        list.push({
          currency: token,
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
        ethState?.tokens?.some(token => {
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

      item.tokens?.forEach(token => {
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
    const updated = allListItems.reduce<CurrencySelectionRowProps[]>(
      (accum, item) => {
        const isCurrencyMatch = item.currency.id === id;
        const isTokenMatch = item.tokens?.some(token => token.id === id);

        if (isCurrencyMatch) {
          item.currency = {
            ...item.currency,
            selected: !item.currency.selected,
          };
        } else if (isTokenMatch) {
          item.tokens = item.tokens?.reduce<CurrencySelectionItem[]>(
            (tokenAccum, token) => {
              if (token.id === id) {
                tokenAccum.push({
                  ...token,
                  selected: !token.selected,
                });
              } else {
                tokenAccum.push(token);
              }

              return tokenAccum;
            },
            [],
          );
        }

        accum.push(item);

        return accum;
      },
      [],
    );

    setAllListItems(updated);
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
    return (
      currency: CurrencySelectionItem,
      tokens: CurrencySelectionItem[],
    ) => {
      navigation.navigate('Wallet', {
        screen: WalletScreens.CURRENCY_TOKEN_SELECTION,
        params: {
          currency,
          tokens,
          onToggle: memoizedOnToggle,
        },
      });
    };
  }, [memoizedOnToggle, navigation]);

  const renderItem: ListRenderItem<CurrencySelectionRowProps> = useCallback(
    ({item}) => {
      return (
        <CurrencySelectionRow
          key={item.currency.id}
          currency={item.currency}
          tokens={item.tokens}
          description={item.description}
          onToggle={memoizedOnToggle}
          hideCheckbox={hideCheckbox}
          onViewAllTokensPressed={memoizedOnViewAllPressed}
        />
      );
    },
    [memoizedOnToggle, memoizedOnViewAllPressed, hideCheckbox],
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
          <FlatList<CurrencySelectionRowProps>
            contentContainerStyle={{paddingBottom: 100}}
            data={listItems}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
          />
        </ListContainer>
      ) : (
        <CurrencySelectionNoResults query={searchInput} walletKey={key} />
      )}

      {bottomCta && !hideBottomCta && (
        <CtaContainerAbsolute
          background={true}
          style={{
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 4},
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
          }}>
          <Button
            onPress={() =>
              bottomCta({selectedCurrencies, dispatch, navigation})
            }
            buttonStyle={'primary'}
            disabled={!selectedCurrencies.length}>
            {ctaTitle}
          </Button>
        </CtaContainerAbsolute>
      )}
    </CurrencySelectionContainer>
  );
};

export default CurrencySelection;
