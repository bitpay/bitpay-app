import React, {useCallback, useLayoutEffect, useMemo, useState} from 'react';
import styled, {useTheme} from 'styled-components/native';
import {
  ActiveOpacity,
  CtaContainerAbsolute,
  HeaderRightContainer,
  SearchInput,
  NoResultsContainer,
  NoResultsImgContainer,
  NoResultsDescription,
} from '../../../components/styled/Containers';
import CurrencySelectionRow, {
  CurrencySelectionToggleProps,
} from '../../../components/list/CurrencySelectionRow';

import Button from '../../../components/button/Button';
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_TOKENS,
  SupportedCurrencies,
} from '../../../constants/currencies';
import {startCreateKey} from '../../../store/wallet/effects';
import {FlatList, TouchableOpacity} from 'react-native';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {BaseText, HeaderTitle, Link} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  SupportedCurrencyOptions,
  SupportedCurrencyOption,
} from '../../../constants/SupportedCurrencyOptions';
import {RootState} from '../../../store';
import {WalletStackParamList} from '../WalletStack';
import {Dispatch} from 'redux';
import {RootStackParamList} from '../../../Root';
import {
  dismissOnGoingProcessModal,
  setHomeCarouselConfig,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {Key} from '../../../store/wallet/wallet.models';
import {StackScreenProps} from '@react-navigation/stack';
import {keyExtractor} from '../../../utils/helper-methods';
import {sleep} from '../../../utils/helper-methods';
import {useLogger} from '../../../utils/hooks/useLogger';
import {NeutralSlate} from '../../../styles/colors';
import debounce from 'lodash.debounce';
import Icons from '../components/WalletIcons';
import SearchSvg from '../../../../assets/img/search.svg';
import GhostSvg from '../../../../assets/img/ghost-cheeky.svg';
import {useAppSelector, useAppDispatch} from '../../../utils/hooks';

type CurrencySelectionScreenProps = StackScreenProps<
  WalletStackParamList,
  'CurrencySelection'
>;

type CurrencySelectionContext =
  | 'onboarding'
  | 'createNewKey'
  | 'addWallet'
  | 'addWalletMultisig'
  | 'joinWalletMultisig';

export type CurrencySelectionParamList = {
  context: CurrencySelectionContext;
  key?: Key;
};

interface ContextHandler {
  currencies: SupportedCurrencyOption[];
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

const CurrencySelectionContainer = styled.View`
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

const CurrencySelection: React.FC<CurrencySelectionScreenProps> = ({route}) => {
  // setting context
  const navigation = useNavigation();
  const {context, key} = route.params;
  const logger = useLogger();
  const dispatch = useAppDispatch();

  const theme = useTheme();
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';
  const [searchInput, setSearchInput] = useState('');

  const tokenOptions = useAppSelector(
    ({WALLET}: RootState) => WALLET.tokenOptions,
  );

  const ALL_CUSTOM_TOKENS = useMemo(
    () =>
      Object.values(tokenOptions)
        .filter(
          token => !SUPPORTED_CURRENCIES.includes(token.symbol.toLowerCase()),
        )
        .map(({symbol, name, logoURI}) => {
          return {
            id: Math.random(),
            currencyAbbreviation: symbol,
            currencyName: name,
            img: logoURI,
            isToken: true,
            checked: false,
          };
        }),
    [tokenOptions],
  );

  const showErrorModal = (e: string) => {
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: 'Something went wrong',
        message: e,
        enableBackdropDismiss: true,
        actions: [
          {
            text: 'OK',
            action: () => {},
            primary: true,
          },
        ],
      }),
    );
  };

  const _SupportedCurrencyOptions = useMemo(
    () =>
      SupportedCurrencyOptions.map(currency => {
        return {
          ...currency,
          checked: false,
        };
      }),
    [],
  );

  const _currencies = useMemo(
    () => [..._SupportedCurrencyOptions, ...ALL_CUSTOM_TOKENS],
    [_SupportedCurrencyOptions, ALL_CUSTOM_TOKENS],
  );

  const _multiSigCurrencies = useMemo(
    () => SupportedCurrencyOptions.filter(currency => currency.hasMultisig),
    [],
  );

  const checkEthIfTokenSelected = (
    currencies: Array<string>,
  ): Array<string> => {
    if (!currencies.includes('ETH')) {
      for (const selected of currencies) {
        if (
          SUPPORTED_TOKENS.includes(selected.toLowerCase()) ||
          ALL_CUSTOM_TOKENS.some(
            token => token.currencyAbbreviation === selected,
          )
        ) {
          currencies = [...currencies, 'ETH'];
          break;
        }
      }
    }
    return currencies;
  };

  const contextHandler = (): ContextHandler | undefined => {
    switch (context) {
      case 'onboarding':
      case 'createNewKey': {
        return {
          // @ts-ignore
          currencies: _currencies,
          ctaTitle: 'Create Key',
          bottomCta: async ({selectedCurrencies, dispatch, navigation}) => {
            try {
              const currencies = checkEthIfTokenSelected(
                selectedCurrencies,
              )?.map(selected =>
                selected.toLowerCase(),
              ) as Array<SupportedCurrencies>;

              await dispatch(
                startOnGoingProcessModal(OnGoingProcessMessages.CREATING_KEY),
              );
              const key = (await dispatch<any>(
                startCreateKey(currencies),
              )) as Key;

              dispatch(setHomeCarouselConfig({id: key.id, show: true}));

              navigation.navigate(
                context === 'onboarding' ? 'Onboarding' : 'Wallet',
                {
                  screen: 'BackupKey',
                  params: {context, key},
                },
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
          currencies: _currencies,
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
      case 'addWalletMultisig': {
        return {
          currencies: _multiSigCurrencies,
          headerTitle: 'Select Currency',
          hideBottomCta: true,
          removeCheckbox: true,
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
    currencies = [],
    bottomCta,
    ctaTitle,
    headerTitle,
    hideBottomCta,
    selectionCta,
    removeCheckbox,
  } = contextHandler() || {};

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

  const [selectedCurrencies, setSelectedCurrencies] = useState<Array<string>>(
    [],
  );

  const DEFAULT_CURRENCY_OPTIONS = useMemo(
    () => currencies || [],
    [currencies],
  );

  const [currencyOptions, setCurrencyOptions] = useState<Array<any>>([
    ...DEFAULT_CURRENCY_OPTIONS,
  ]);

  const currencyToggled = ({
    currencyAbbreviation,
    currencyName,
    checked,
    isToken,
  }: CurrencySelectionToggleProps) => {
    if (selectionCta) {
      resetSearch();
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

        return currencies;
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

  const resetSearch = () => {
    setSearchInput('');
    onSearchInputChange('');
  };

  const onSearchInputChange = useMemo(
    () =>
      debounce((search: string) => {
        let _searchList: Array<any> = [];

        if (search) {
          search = search.toLowerCase();
          _searchList = DEFAULT_CURRENCY_OPTIONS.filter(
            ({currencyAbbreviation, currencyName}) =>
              currencyAbbreviation.toLowerCase().includes(search) ||
              currencyName.toLowerCase().includes(search),
          );
        } else {
          _searchList = DEFAULT_CURRENCY_OPTIONS;
        }

        _searchList.forEach(currency => {
          if (selectedCurrencies.includes(currency.currencyAbbreviation)) {
            currency.checked = true;
            currency.id = Math.random();
          } else {
            currency.checked = false;
          }
          return currency;
        });

        setCurrencyOptions(_searchList);
      }, 300),
    [currencies, selectedCurrencies],
  );

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
              onPress={() => {
                setSearchInput('');
                onSearchInputChange('');
              }}>
              <Icons.Delete />
            </TouchableOpacity>
          )}
        </SearchImageContainer>
      </SearchContainer>

      {currencyOptions.length ? (
        <ListContainer>
          <FlatList
            contentContainerStyle={{paddingBottom: 100}}
            data={currencyOptions}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
          />
        </ListContainer>
      ) : (
        <NoResultsContainer>
          <NoResultsImgContainer>
            <GhostSvg style={{marginTop: 20}} />
          </NoResultsImgContainer>
          <NoResultsDescription>
            {"We couldn't find a match for "}
            <BaseText style={{fontWeight: 'bold'}}>{searchInput}</BaseText>.
          </NoResultsDescription>
          {key ? (
            <Link
              style={{marginTop: 10}}
              onPress={() => {
                navigation.navigate('Wallet', {
                  screen: 'AddWallet',
                  params: {key, isCustomToken: true, isToken: true},
                });
              }}>
              Add custom token
            </Link>
          ) : null}
        </NoResultsContainer>
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
