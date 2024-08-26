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
} from '../../../components/list/CurrencySelectionRow';

import Button from '../../../components/button/Button';
import {BitpaySupportedTokens} from '../../../constants/currencies';
import {startCreateKey} from '../../../store/wallet/effects';
import {
  FlatList,
  ImageRequireSource,
  ImageSourcePropType,
  ListRenderItem,
} from 'react-native';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {useNavigation} from '@react-navigation/native';
import {HeaderTitle, Link} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  SupportedCoinsOptions,
  SupportedCurrencyOption,
  SupportedCurrencyOptions,
  SupportedTokenOptions,
} from '../../../constants/SupportedCurrencyOptions';
import {WalletScreens, WalletGroupParamList} from '../WalletGroup';
import {
  dismissOnGoingProcessModal,
  setHomeCarouselConfig,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {Key, Token} from '../../../store/wallet/wallet.models';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {addTokenChainSuffix, sleep} from '../../../utils/helper-methods';
import {useLogger} from '../../../utils/hooks/useLogger';
import {useAppSelector, useAppDispatch} from '../../../utils/hooks';
import {BitpaySupportedTokenOptsByAddress} from '../../../constants/tokens';
import {useTranslation} from 'react-i18next';
import CurrencySelectionSearchInput from '../components/CurrencySelectionSearchInput';
import CurrencySelectionNoResults from '../components/CurrencySelectionNoResults';
import {orderBy} from 'lodash';
import {Analytics} from '../../../store/analytics/analytics.effects';
import SearchComponent, {
  SearchableItem,
} from '../../../components/chain-search/ChainSearch';
import {ignoreGlobalListContextList} from '../../../components/modal/chain-selector/ChainSelector';
import cloneDeep from 'lodash.clonedeep';

type CurrencySelectionScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
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

type CurrencySelectionListItem = SearchableItem &
  CurrencySelectionRowProps & {
    /**
     * All tokens for this chain currency.
     */
    tokens: CurrencySelectionItem[];

    /**
     * Popular tokens for this chain currency. Needs to be kept in sync with tokens.
     * Using a separate property instead of deriving due to performance reasons.
     */
    popularTokens: CurrencySelectionItem[];
    filteredTokens?: CurrencySelectionItem[];
  };

export type CurrencySelectionMode = 'single' | 'multi';

interface SelectedCurrencies {
  chain: string;
  currencyAbbreviation: string;
  isToken: boolean;
  tokenAddress?: string;
}

export interface ContextHandler {
  headerTitle?: string;
  ctaTitle?: string;
  onCtaPress?: () => void;
  selectionMode: CurrencySelectionMode;
  selectedCurrencies: SelectedCurrencies[];
}

export const CurrencySelectionContainer = styled.SafeAreaView`
  flex: 1;
`;

const ListContainer = styled.View`
  flex-shrink: 1;
`;

const LinkContainer = styled.View`
  align-items: center;
  margin-top: 15px;
`;

export const SearchContainer = styled.View`
  align-items: center;
  padding: 4px 0;
  margin: 20px ${ScreenGutter} 20px;
`;

const SearchComponentContainer = styled.View`
  margin: 15px;
`;

const SupportedMultisigCurrencyOptions: SupportedCurrencyOption[] =
  SupportedCurrencyOptions.filter(currency => {
    return currency.hasMultisig;
  });

const POPULAR_TOKENS: Record<string, string[]> = {
  eth: [
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48_e', // usdc_e
    '0x4fabb145d64652a948d72533023f6e7a623c7c53_e', // busd_e
    '0x4d224452801aced8b2f0aebe155379bb5d594381_e',
  ], // ape_e
  matic: [
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174_m', // usdc_m
    '0xdab529f40e671a1d4bf91361c21bf9f0c9712ab7_m', // busd_m
    '0xb7b31a6bc18e48888545ce79e83e06003be70930_m',
  ], // ape_m
  arb: [
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831_arb', // usdc_arb
    '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f_arb', // wbtc_arb
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9_arb', // usdt_arb
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1_arb', // weth_arb
  ],
  base: [
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913_base', // usdc_base
    '0x4200000000000000000000000000000000000006_base', // weht_base
  ],
  op: [
    '0x0b2c639c533813f4aa9d7837caf62653d097ff85_op', // usdc_op
    '0x68f180fcce6836688e9084f035309e29bf0a2095_op', // wbtc_op
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58_op', // usdt_op
    '0x4200000000000000000000000000000000000006_op', // weth_op
  ],
};

const keyExtractor = (item: CurrencySelectionListItem) => item.currency.id;

const CurrencySelection = ({route}: CurrencySelectionScreenProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {context, key} = route.params;
  const logger = useLogger();
  const dispatch = useAppDispatch();
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState(
    [] as CurrencySelectionListItem[],
  );
  const selectedChainFilterOption = useAppSelector(({APP}) =>
    ignoreGlobalListContextList.includes(context)
      ? APP.selectedLocalChainFilterOption
      : APP.selectedChainFilterOption,
  );

  const appTokenOptionsByAddress = useAppSelector(
    ({WALLET}) => WALLET.tokenOptionsByAddress,
  );
  const appTokenDataByAddress = useAppSelector(
    ({WALLET}) => WALLET.tokenDataByAddress,
  );
  const appCustomTokenOptionsByAddress = useAppSelector(
    ({WALLET}) => WALLET.customTokenOptionsByAddress,
  );
  const appCustomTokenDataByAddress = useAppSelector(
    ({WALLET}) => WALLET.customTokenDataByAddress,
  );
  const DESCRIPTIONS: Record<string, string> = {
    eth: t(
      'Tokens on the Ethereum network need an Ethereum wallet to pay for fees.',
    ),
    matic: t(
      'Tokens on the Polygon network need a Polygon wallet to pay for fees.',
    ),
    base: t(
      'Tokens on the Base network need an Ethereum wallet to pay for fees.',
    ),
    op: t(
      'Tokens on the Optimism network need an Ethereum wallet to pay for fees.',
    ),
    arb: t(
      'Tokens on the Arbitrum network need an Ethereum wallet to pay for fees.',
    ),
  };
  /**
   * Source of truth for which currencies are selected.
   */
  const [allListItems, setAllListItems] = useState<CurrencySelectionListItem[]>(
    [],
  );
  const allListItemsRef = useRef(allListItems);
  allListItemsRef.current = allListItems;

  // Initialize supported currencies and tokens into row item format.
  // Resets if tokenOptions or tokenData updates.
  useEffect(() => {
    if (context === 'addWalletMultisig') {
      const items = SupportedMultisigCurrencyOptions.map(currency => {
        const item: CurrencySelectionListItem = {
          currency: {
            ...currency,
            imgSrc: undefined,
            selected: false,
            disabled: false,
            chain: currency.currencyAbbreviation,
          },
          tokens: [],
          popularTokens: [],
        };

        return item;
      });

      setAllListItems(items);
      return;
    }

    const chainMap: Record<string, CurrencySelectionListItem> = {};

    // Add all chain currencies to list
    const list: CurrencySelectionListItem[] = SupportedCoinsOptions.map(
      ({
        id,
        chain,
        currencyAbbreviation,
        currencyName,
        chainName,
        img,
        badgeUri,
      }) => {
        const _chain = chain.toLowerCase();
        const item: CurrencySelectionListItem = {
          currency: {
            id,
            currencyAbbreviation,
            currencyName,
            img,
            badgeUri,
            selected: false,
            disabled: false,
            chain: _chain,
            chainName,
            tokenAddress: undefined,
          },
          tokens: [],
          popularTokens: [],
          description: DESCRIPTIONS[chain] || '',
        };

        chainMap[chain] = item;

        return item;
      },
    );

    // For each token, add it to the token list for its parent chain object
    const tokenOptionsByAddress: Record<string, Token> = {
      ...BitpaySupportedTokenOptsByAddress,
      ...appTokenOptionsByAddress,
      ...appCustomTokenOptionsByAddress,
    };

    Object.entries(tokenOptionsByAddress).forEach(([k, tokenOpt]) => {
      if (
        !(
          BitpaySupportedTokens[k] ||
          appTokenDataByAddress[k] ||
          appCustomTokenDataByAddress[k]
        )
      ) {
        return;
      }

      const tokenData =
        BitpaySupportedTokens[k] ||
        appTokenDataByAddress[k] ||
        appCustomTokenDataByAddress[k];

      const chainData = chainMap[tokenData.chain.toLowerCase()];
      const imgSrc = SupportedTokenOptions.find(
        c => addTokenChainSuffix(c.tokenAddress!, tokenData.chain) === k,
      )?.imgSrc;
      const isReqSrc = (
        src: ImageSourcePropType | undefined,
      ): src is ImageRequireSource => typeof src === 'number';

      const token: CurrencySelectionItem = {
        id: k,
        currencyAbbreviation: tokenOpt.symbol.toLowerCase(),
        currencyName: tokenOpt.name,
        img: tokenOpt.logoURI || chainData.currency.img || '',
        imgSrc: isReqSrc(imgSrc) ? imgSrc : undefined,
        selected: false,
        disabled: false,
        isToken: true,
        chain: tokenData.chain.toLowerCase(),
        tokenAddress: tokenOpt.address,
      };

      if (chainData) {
        if (!chainData.tokens) {
          chainData.tokens = [];
        }

        chainData.tokens.push(token);

        const key = addTokenChainSuffix(
          tokenOpt.address,
          tokenData.chain.toLowerCase(),
        );

        if (POPULAR_TOKENS[tokenData.chain.toLowerCase()].includes(key)) {
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
    appTokenOptionsByAddress,
    appTokenDataByAddress,
    appCustomTokenOptionsByAddress,
    appCustomTokenDataByAddress,
    context,
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

  const selectedCurrencies = useMemo(() => {
    return allListItems.reduce<
      Array<{
        chain: string;
        currencyAbbreviation: string;
        isToken: boolean;
        tokenAddress?: string;
      }>
    >((accum, item) => {
      if (item.currency.selected) {
        accum.push({
          chain: item.currency.chain.toLowerCase(),
          currencyAbbreviation:
            item.currency.currencyAbbreviation.toLowerCase(),
          isToken: false,
        });
      }

      item.tokens.forEach(token => {
        if (token.selected) {
          accum.push({
            chain: item.currency.chain.toLowerCase(),
            currencyAbbreviation: token.currencyAbbreviation.toLowerCase(),
            tokenAddress: token.tokenAddress!.toLowerCase(),
            isToken: true,
          });
        }
      });
      return accum;
    }, []);
  }, [allListItems]);

  const contextHandler = (): ContextHandler => {
    switch (context) {
      case 'onboarding':
      case 'createNewKey': {
        return {
          selectionMode: 'multi',
          ctaTitle:
            selectedCurrencies?.length > 1
              ? t('AddArgWallets', {
                  walletsLength: selectedCurrencies?.length,
                })
              : t('Add Wallet'),
          onCtaPress: async () => {
            try {
              await dispatch(startOnGoingProcessModal('CREATING_KEY'));
              const createdKey = await dispatch(
                startCreateKey(selectedCurrencies),
              );

              dispatch(setHomeCarouselConfig({id: createdKey.id, show: true}));

              navigation.navigate('BackupKey', {context, key: createdKey});
              dispatch(
                Analytics.track('Created Key', {
                  context,
                  coins: selectedCurrencies,
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
          selectedCurrencies,
        };
      }

      case 'addWallet': {
        return {
          selectionMode: 'single',
          headerTitle: t('Select Currency'),
          ctaTitle: t('Add Wallet'),
          onCtaPress: async () => {
            if (!key) {
              // TODO
              console.error('add wallet - key not found');
              return;
            }

            if (!selectedCurrencies.length) {
              showErrorModal(t('Select a currency'));
              return;
            }

            const chain = selectedCurrencies[0].chain;
            const currencyAbbreviation =
              selectedCurrencies[0].currencyAbbreviation;
            const isToken = selectedCurrencies[0].isToken;

            let selectedId: string;
            let selectedCurrencyAbbreviation: string;
            let selectedChain: string;
            if (isToken) {
              selectedId = selectedCurrencies[0].tokenAddress!;
            } else {
              selectedCurrencyAbbreviation = currencyAbbreviation.toLowerCase();
              selectedChain = chain.toLowerCase();
            }

            const item = allListItems.find(i => {
              if (isToken) {
                const hasToken = i.tokens.some(token => {
                  return (
                    token.tokenAddress === selectedId && token.chain === chain
                  );
                });
                return hasToken;
              } else {
                return (
                  i.currency.currencyAbbreviation.toLowerCase() ===
                    selectedCurrencyAbbreviation &&
                  i.currency.chain.toLowerCase() === selectedChain
                );
              }
            });

            let currency: CurrencySelectionItem | undefined;

            if (!item) {
              showErrorModal(t('Select a currency'));
              return;
            }

            if (isToken) {
              currency = item.tokens.find(
                token =>
                  token.tokenAddress === selectedId && token.chain === chain,
              );
            } else {
              currency = item.currency;
            }
            if (!currency) {
              showErrorModal(t('Select a currency'));
              return;
            }

            navigation.navigate('AddWallet', {
              key,
              currencyAbbreviation: currency.currencyAbbreviation.toLowerCase(),
              currencyName: currency.currencyName,
              isToken: !!currency.isToken,
              chain: currency.chain,
              tokenAddress: currency.tokenAddress,
            });
          },
          selectedCurrencies,
        };
      }
      case 'addWalletMultisig': {
        return {
          selectionMode: 'single',
          headerTitle: t('Select Currency'),
          ctaTitle: t('Create Wallet'),
          onCtaPress: async () => {
            if (!selectedCurrencies.length) {
              showErrorModal(t('Select a currency'));
              return;
            }

            navigation.navigate('CreateMultisig', {
              currency: selectedCurrencies[0].currencyAbbreviation,
              key,
            });
          },
          selectedCurrencies,
        };
      }
    }
  };

  const {onCtaPress, ctaTitle, headerTitle, selectionMode} =
    contextHandler() || {};

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
              accessibilityLabel="skip-button"
              buttonType={'pill'}
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('TermsOfUse', {
                  context: 'TOUOnly',
                });
              }}>
              {t('Skip')}
            </Button>
          </HeaderRightContainer>
        ),
    });
  }, [navigation, t, context, headerTitle]);

  const onToggle = (
    currencyAbbreviation: string,
    chain?: string,
    tokenAddress?: string,
  ) => {
    setAllListItems(previous =>
      previous.map(item => {
        const isCurrencyMatch =
          item.currency.currencyAbbreviation === currencyAbbreviation &&
          item.currency.chain === chain;
        const tokenMatch = item.tokens.find(
          token =>
            token.currencyAbbreviation === currencyAbbreviation &&
            item.currency.chain === chain &&
            token.tokenAddress === tokenAddress,
        );

        // if multi, just toggle the selected item and rerender
        if (selectionMode === 'multi') {
          if (isCurrencyMatch) {
            const hasSelectedTokens = item.tokens.some(token => token.selected);

            if (item.currency.selected && hasSelectedTokens) {
              // do nothing
            } else {
              item.currency = {
                ...item.currency,
                selected: !item.currency.selected,
              };
            }
          }

          if (tokenMatch) {
            // if selecting a token, make sure its chain is also selected
            if (!item.currency.selected) {
              item.currency = {
                ...item.currency,
                selected: true,
              };
            }

            const updatedToken = {
              ...tokenMatch,
              selected: !tokenMatch.selected,
            };

            // update token state
            item.tokens = item.tokens.map(token => {
              return token.tokenAddress === tokenAddress ? updatedToken : token;
            });

            // update popular token state
            // append tokens once selected so user can see their entire selection
            let appendToPopular = true;
            item.popularTokens = item.popularTokens.map(token => {
              if (token.tokenAddress === tokenAddress) {
                appendToPopular = false;
              }

              return token.tokenAddress === tokenAddress ? updatedToken : token;
            });

            if (appendToPopular) {
              item.popularTokens.push(updatedToken);
            }
          }
        }

        // if single, toggle the selected item, deselect any selected items, and rerender
        if (selectionMode === 'single') {
          if (isCurrencyMatch) {
            item.currency = {
              ...item.currency,
              selected: !item.currency.selected,
            };

            // deselect any selected tokens
            if (item.tokens.some(token => token.selected)) {
              item.tokens = item.tokens.map(token => {
                return token.selected ? {...token, selected: false} : token;
              });
            }

            // deselect any selected popular tokens
            if (item.popularTokens.some(token => token.selected)) {
              item.popularTokens = item.popularTokens.map(token => {
                return token.selected ? {...token, selected: false} : token;
              });
            }
          } else {
            // deselect this item's currency
            if (item.currency.selected) {
              item.currency = {
                ...item.currency,
                selected: false,
              };
            }
          }

          if (tokenMatch) {
            const updatedToken = {
              ...tokenMatch,
              selected: !tokenMatch.selected,
            };

            // update token state
            item.tokens = item.tokens.map(token => {
              if (token.tokenAddress === tokenAddress) {
                return updatedToken;
              }

              return token.selected ? {...token, selected: false} : token;
            });

            // update popular token state
            // append tokens once selected so user can see their entire selection
            let appendToPopular = true;
            item.popularTokens = item.popularTokens.map(token => {
              if (token.tokenAddress === tokenAddress) {
                appendToPopular = false;
                return updatedToken;
              }

              return token.selected ? {...token, selected: false} : token;
            });

            if (appendToPopular) {
              item.popularTokens.push(updatedToken);
            }
          }

          // if selecting a token, make sure deselect any other token selected
          if (
            !tokenMatch &&
            !isCurrencyMatch &&
            item.currency.chain !== chain &&
            item.tokens.length > 0
          ) {
            item.popularTokens = item.popularTokens.map(token => {
              return token.selected ? {...token, selected: false} : token;
            });
            item.tokens = item.tokens.map(token => {
              return token.selected ? {...token, selected: false} : token;
            });
          }
        }

        return item;
      }),
    );
  };

  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;

  const memoizedOnToggle = useCallback(
    (currencyAbbreviation: string, chain?: string, tokenAddress?: string) => {
      onToggleRef.current(currencyAbbreviation, chain, tokenAddress);
    },
    [],
  );

  const memoizedOnViewAllPressed = useMemo(() => {
    return (currency: CurrencySelectionItem) => {
      const item = allListItemsRef.current.find(
        i =>
          i.currency.currencyAbbreviation === currency.currencyAbbreviation &&
          i.currency.chain === currency.chain,
      );

      if (!item) {
        return;
      }

      // sorted selected tokens to the top for ease of use
      const sortedTokens = orderBy(
        item.tokens.map(token => ({...token})),
        'selected',
        'desc',
      );

      navigation.navigate(WalletScreens.CURRENCY_TOKEN_SELECTION, {
        key,
        currency: {...currency},
        tokens: sortedTokens,
        description: item.description,
        selectionMode,
        onToggle: memoizedOnToggle,
      });
    };
  }, [memoizedOnToggle, navigation, key, selectionMode]);

  const renderItem: ListRenderItem<CurrencySelectionListItem> = useCallback(
    ({item}) => {
      return (
        <CurrencySelectionRow
          key={item.currency.id}
          currency={item.currency}
          tokens={
            !searchVal && !selectedChainFilterOption
              ? item.popularTokens
              : item.tokens
          }
          filterSelected={!!searchVal || !!selectedChainFilterOption}
          description={item.description}
          selectionMode={selectionMode}
          onToggle={memoizedOnToggle}
          onViewAllTokensPressed={memoizedOnViewAllPressed}
          disableCheckbox={!!key?.hardwareSource}
        />
      );
    },
    [
      memoizedOnToggle,
      memoizedOnViewAllPressed,
      selectionMode,
      searchVal,
      selectedChainFilterOption,
    ],
  );

  const filterAndSortTokens = (
    tokens: CurrencySelectionItem[],
    searchVal: string,
  ): CurrencySelectionItem[] => {
    const filteredTokens = tokens.filter(
      item =>
        item.currencyAbbreviation.toLowerCase().includes(searchVal) ||
        item.currencyName.toLowerCase().includes(searchVal) ||
        item.tokenAddress?.toLowerCase().includes(searchVal),
    );
    return filteredTokens.sort((a, b) => {
      const aStarts = a.currencyAbbreviation
        .toLowerCase()
        .startsWith(searchVal);
      const bStarts = b.currencyAbbreviation
        .toLowerCase()
        .startsWith(searchVal);
      if (aStarts && bStarts) {
        return a.currencyAbbreviation.localeCompare(b.currencyAbbreviation);
      }
      if (aStarts && !bStarts) {
        return -1;
      }
      if (!aStarts && bStarts) {
        return 1;
      }
      return a.currencyAbbreviation.localeCompare(b.currencyAbbreviation);
    });
  };

  const filteredItems = useMemo(() => {
    const _allListItems = cloneDeep(allListItems);
    if (!selectedChainFilterOption && !searchVal) {
      return _allListItems;
    }
    if (selectedChainFilterOption && !searchVal) {
      return _allListItems.filter(
        item => item.currency.chain === selectedChainFilterOption,
      );
    }

    return _allListItems
      .map(allListItem => {
        if (
          selectedChainFilterOption &&
          selectedChainFilterOption !== allListItem.currency.chain
        ) {
          return null;
        }
        const searchValLowerCase = searchVal.toLowerCase();
        const currency = allListItem.currency;
        const matchesSearch = [
          currency.currencyAbbreviation,
          currency.chain,
          currency.chainName,
          currency.currencyName,
        ].some((property: string | undefined) =>
          property?.toLowerCase()?.includes(searchValLowerCase),
        );
        if (allListItem.tokens.length > 0) {
          allListItem.tokens = filterAndSortTokens(
            allListItem.tokens,
            searchValLowerCase,
          );
          return allListItem.tokens.length > 0 || matchesSearch
            ? allListItem
            : null;
        } else {
          return matchesSearch ? allListItem : null;
        }
      })
      .filter(Boolean) as CurrencySelectionListItem[];
  }, [searchVal, selectedChainFilterOption, allListItems]);

  return (
    <CurrencySelectionContainer accessibilityLabel="currency-selection-container">
      {context !== 'addWalletMultisig' ? (
        <SearchComponentContainer>
          <SearchComponent<CurrencySelectionListItem>
            searchVal={searchVal}
            setSearchVal={setSearchVal}
            searchResults={searchResults}
            setSearchResults={setSearchResults}
            searchFullList={allListItems}
            context={context}
          />
        </SearchComponentContainer>
      ) : null}

      {allListItems.length > 0 || filteredItems.length > 0 ? (
        <ListContainer>
          <FlatList<CurrencySelectionListItem>
            contentContainerStyle={
              context === 'addWalletMultisig' ? {marginTop: 20} : undefined
            }
            data={
              !searchVal && !selectedChainFilterOption
                ? allListItems
                : filteredItems
            }
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListFooterComponent={() => {
              return searchVal && key ? (
                <LinkContainer>
                  <Link
                    accessibilityLabel="add-custom-token-button"
                    onPress={() => {
                      haptic('soft');
                      navigation.navigate('AddWallet', {
                        key,
                        isCustomToken: true,
                        isToken: true,
                      });
                    }}>
                    {t('Add Custom Token')}
                  </Link>
                </LinkContainer>
              ) : null;
            }}
          />
        </ListContainer>
      ) : (
        <CurrencySelectionNoResults query={searchVal} walletKey={key} />
      )}

      {onCtaPress && selectedCurrencies.length > 0 ? (
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
            accessibilityLabel="on-cta-press-button"
            onPress={onCtaPress}
            buttonStyle={'primary'}>
            {ctaTitle || t('Continue')}
          </Button>
        </CtaContainer>
      ) : null}
    </CurrencySelectionContainer>
  );
};

export default CurrencySelection;
