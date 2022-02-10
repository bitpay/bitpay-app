import React, {useCallback, useLayoutEffect, useMemo, useState} from 'react';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  CtaContainerAbsolute,
  HeaderRightContainer,
  SearchInput,
} from '../../../components/styled/Containers';
import CurrencySelectionRow, {
  CurrencySelectionToggleProps,
} from '../../../components/list/CurrencySelectionRow';

import Button from '../../../components/button/Button';
import {
  POPULAR_TOKENS,
  SUPPORTED_TOKENS,
  SupportedCurrencies,
} from '../../../constants/currencies';
import {useDispatch, useSelector} from 'react-redux';
import {startCreateKey} from '../../../store/wallet/effects';
import {FlatList, TouchableOpacity} from 'react-native';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {
  NavigationProp,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import {HeaderTitle} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {RootState} from '../../../store';
import {WalletStackParamList} from '../WalletStack';
import {Dispatch} from 'redux';
import {RootStackParamList} from '../../../Root';
import {dismissOnGoingProcessModal} from '../../../store/app/app.actions';
import {Key} from '../../../store/wallet/wallet.models';
import {StackScreenProps} from '@react-navigation/stack';
import {keyExtractor} from '../../../utils/helper-methods';
import {NeutralSlate} from '../../../styles/colors';
import debounce from 'lodash.debounce';
import SearchSvg from '../../../../assets/img/search.svg';
import Icons from '../components/WalletIcons';

type CurrencySelectionScreenProps = StackScreenProps<
  WalletStackParamList,
  'CurrencySelection'
>;

type CurrencySelectionContext = 'onboarding' | 'createNewKey' | 'addWallet';

export type CurrencySelectionParamList = {
  context: CurrencySelectionContext;
  key?: Key;
};

interface ContextHandler {
  headerTitle?: string;
  ctaTitle?: string;
  bottomCta?: (props: {
    selectedCurrencies: string[];
    dispatch: Dispatch<any>;
    navigation: NavigationProp<RootStackParamList>;
  }) => void;
  selectionCta?: (props: {
    currencyAbbreviation: string;
    currencyName: string;
    isToken?: boolean;
    navigation: NavigationProp<RootStackParamList>;
  }) => void;
  hideBottomCta?: boolean;
  removeCheckbox?: boolean;
}

const CurrencySelectionContainer = styled.SafeAreaView`
  flex: 1;
`;

const ListContainer = styled.View`
  margin-top: 20px;
`;

const SearchContainer = styled.View`
  flex-direction: row;
  border: 1px solid #9ba3ae;
  align-items: center;
  border-top-right-radius: 4px;
  border-top-left-radius: 4px;
  padding: 4px 0;
  margin: 20px 10px 0;
  height: 60px;
`;

const SearchImageContainer = styled.View`
  width: 50px;
  align-items: center;
`;

const contextHandler = (
  context: CurrencySelectionContext,
  key?: Key,
): ContextHandler => {
  switch (context) {
    case 'onboarding':
    case 'createNewKey': {
      return {
        ctaTitle: 'Create Key',
        bottomCta: async ({selectedCurrencies, dispatch, navigation}) => {
          try {
            const currencies = selectedCurrencies?.map(selected =>
              selected.toLowerCase(),
            ) as Array<SupportedCurrencies>;
            await dispatch(
              startOnGoingProcessModal(OnGoingProcessMessages.CREATING_KEY),
            );
            // @ts-ignore
            const key = await dispatch<Key>(startCreateKey(currencies));
            navigation.navigate(
              context === 'onboarding' ? 'Onboarding' : 'Wallet',
              {
                screen: 'BackupKey',
                params: {context, key},
              },
            );
          } catch (err) {
            // TODO
          } finally {
            dispatch(dismissOnGoingProcessModal());
          }
        },
      };
    }

    case 'addWallet': {
      return {
        headerTitle: 'Select Currency',
        hideBottomCta: true,
        removeCheckbox: true,
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
  }
};

const CurrencySelection: React.FC<CurrencySelectionScreenProps> = ({route}) => {
  // setting context
  const navigation = useNavigation();
  const {context, key} = route.params;
  const {
    bottomCta,
    ctaTitle,
    headerTitle,
    hideBottomCta,
    selectionCta,
    removeCheckbox,
  } = contextHandler(context, key) || {};

  // Configuring Header
  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => (
        <HeaderTitle>{headerTitle || 'Select Currencies'}</HeaderTitle>
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
              Skip
            </Button>
          </HeaderRightContainer>
        ),
    });
  }, [navigation]);

  const theme = useTheme();
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';
  const [searchInput, setSearchInput] = useState('');

  const dispatch = useDispatch();
  const [selectedCurrencies, setSelectedCurrencies] = useState<Array<string>>(
    [],
  );

  const tokenOptions = useSelector(
    ({WALLET}: RootState) => WALLET.tokenOptions,
  );

  const ALL_CUSTOM_TOKENS = useMemo(
    () =>
      Object.values(tokenOptions)
        .filter(token => !SUPPORTED_TOKENS.includes(token.symbol.toLowerCase()))
        .map(({symbol, name, logoURI}) => {
          return {
            id: Math.random(),
            currencyAbbreviation: symbol,
            currencyName: name,
            img: logoURI,
            isToken: true,
          };
        }),
    [],
  );

  const CURATED_TOKENS = useMemo(
    () =>
      ALL_CUSTOM_TOKENS.filter(token =>
        POPULAR_TOKENS.includes(token.currencyAbbreviation),
      ),
    [],
  );

  const DEFAULT_CURRENCY_OPTIONS = useMemo(
    () => [...SupportedCurrencyOptions, ...CURATED_TOKENS],
    [],
  );

  const ALL_CURRENCY_OPTIONS = useMemo(
    () => [...SupportedCurrencyOptions, ...ALL_CUSTOM_TOKENS],
    [],
  );

  const [currencyOptions, setCurrencyOptions] = useState<Array<any>>([
    ...DEFAULT_CURRENCY_OPTIONS,
  ]);

  const checkAndToggleEthIfTokenSelected = (
    currencies: Array<string>,
  ): Array<string> => {
    // if selecting token force eth wallet
    for (const selected of currencies) {
      if (
        SUPPORTED_TOKENS.includes(selected.toLowerCase()) ||
        ALL_CUSTOM_TOKENS.some(token => token.currencyAbbreviation === selected)
      ) {
        if (!currencies.includes('ETH')) {
          setCurrencyOptions(
            DEFAULT_CURRENCY_OPTIONS.map(currency => {
              if (currency.id === 'eth') {
                return {
                  ...currency,
                  // to force rerender
                  id: Math.random(),
                  checked: true,
                };
              }
              return currency;
            }),
          );
          currencies = [...currencies, 'ETH'];
        }
        break;
      }
    }
    return currencies;
  };

  const currencyToggled = ({
    currencyAbbreviation,
    currencyName,
    checked,
    isToken,
  }: CurrencySelectionToggleProps) => {
    if (selectionCta) {
      // Reset search input
      setSearchInput('');

      selectionCta({currencyAbbreviation, currencyName, isToken, navigation});
    } else {
      setSelectedCurrencies(currencies => {
        // reset asset in list
        currencies = currencies.filter(
          selected => selected !== currencyAbbreviation,
        );
        // add if checked
        if (checked) {
          currencies = [...currencies, currencyAbbreviation];
        }

        // if token selected set eth asset selected
        return checkAndToggleEthIfTokenSelected(currencies);
      });
    }
  };
  // Flat list
  const renderItem = useCallback(
    ({item}) => (
      <CurrencySelectionRow
        item={item}
        emit={currencyToggled}
        key={item.id}
        removeCheckbox={removeCheckbox}
      />
    ),
    [],
  );

  const onSearchInputChange = debounce((search: string) => {
    if (search) {
      search = search.toLowerCase();
      const filteredList = ALL_CURRENCY_OPTIONS.filter(
        ({currencyAbbreviation, currencyName}) =>
          currencyAbbreviation.toLowerCase().includes(search) ||
          currencyName.toLowerCase().includes(search),
      );
      setCurrencyOptions([...filteredList]);
    } else {
      setCurrencyOptions([...DEFAULT_CURRENCY_OPTIONS]);
    }
  }, 300);

  return (
    <CurrencySelectionContainer>
      <SearchContainer>
        <SearchInput
          placeholder={'Search Currency'}
          placeholderTextColor={placeHolderTextColor}
          value={searchInput}
          onChangeText={(text: string) => {
            setSearchInput(text);
            onSearchInputChange(text);
          }}
        />
        <SearchImageContainer>
          {!searchInput ? (
            <SearchSvg />
          ) : (
            <TouchableOpacity
              activeOpacity={ActiveOpacity}
              onPress={() => setSearchInput('')}>
              <Icons.Delete />
            </TouchableOpacity>
          )}
        </SearchImageContainer>
      </SearchContainer>

      <ListContainer>
        <FlatList
          contentContainerStyle={{paddingBottom: 100}}
          data={currencyOptions}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
        />
      </ListContainer>

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
