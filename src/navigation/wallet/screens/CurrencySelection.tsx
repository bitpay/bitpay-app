import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import {FlatList, ListRenderItem, TouchableOpacity} from 'react-native';
import {
  logSegmentEvent,
  startOnGoingProcessModal,
} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {BaseText, HeaderTitle, Link} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  SupportedCurrencyOptions,
  SupportedCurrencyOption,
} from '../../../constants/SupportedCurrencyOptions';
import {WalletScreens, WalletStackParamList} from '../WalletStack';
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
import {
  useAppSelector,
  useAppDispatch,
  AppDispatch,
} from '../../../utils/hooks';
import {BitpaySupportedTokenOpts} from '../../../constants/tokens';
import {useTranslation} from 'react-i18next';

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
  currencies: SupportedCurrencyOption[];
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

const SupportedMultisigCurrencyOptions = SupportedCurrencyOptions.filter(
  currency => currency.hasMultisig,
);

const CurrencySelection: React.VFC<CurrencySelectionScreenProps> = ({
  route,
}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {context, key} = route.params;
  const logger = useLogger();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';
  const [searchInput, setSearchInput] = useState('');
  const appTokenOptions = useAppSelector(({WALLET}) => WALLET.tokenOptions);
  const appCustomTokenOptions = useAppSelector(
    ({WALLET}) => WALLET.customTokenOptions,
  );

  const ALL_CUSTOM_TOKENS = useMemo(() => {
    const tokenOptions = {
      ...BitpaySupportedTokenOpts,
      ...appTokenOptions,
      ...appCustomTokenOptions,
    };

    return Object.values(tokenOptions)
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
      });
  }, [appTokenOptions, appCustomTokenOptions]);

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

  const supportedCurrenciesAndTokens = useMemo(() => {
    const _SupportedCurrencyOptions = SupportedCurrencyOptions.map(currency => {
      return {
        ...currency,
        checked: false,
      };
    });

    return [..._SupportedCurrencyOptions, ...ALL_CUSTOM_TOKENS];
  }, [ALL_CUSTOM_TOKENS]);

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
          currencies: supportedCurrenciesAndTokens,
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
          currencies: supportedCurrenciesAndTokens,
          headerTitle: t('Select Currency'),
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
          currencies: SupportedMultisigCurrencyOptions,
          headerTitle: t('Select Currency'),
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

  const [selectedCurrencies, setSelectedCurrencies] = useState<Array<string>>(
    [],
  );

  const DEFAULT_CURRENCY_OPTIONS = useMemo(
    () => currencies || [],
    [currencies],
  );

  const [currencyOptions, setCurrencyOptions] = useState<
    SupportedCurrencyOption[]
  >([...DEFAULT_CURRENCY_OPTIONS]);

  const resetSearch = () => {
    setSearchInput('');
    onSearchInputChange('');
  };

  const resetSearchRef = useRef(resetSearch);
  resetSearchRef.current = resetSearch;

  const selectionCtaRef = useRef(selectionCta);
  selectionCtaRef.current = selectionCta;

  const memoizedOnToggle = useMemo(() => {
    return ({
      currencyAbbreviation,
      currencyName,
      checked,
      isToken,
    }: CurrencySelectionToggleProps) => {
      if (selectionCtaRef.current) {
        resetSearchRef.current();
        selectionCtaRef.current({
          currencyAbbreviation,
          currencyName,
          isToken,
          navigation,
        });
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
  }, [navigation]);

  // Flat list
  const renderItem: ListRenderItem<SupportedCurrencyOption> = useCallback(
    ({item}) => (
      <CurrencySelectionRow
        key={item.id}
        item={item}
        onToggle={memoizedOnToggle}
        hideCheckbox={removeCheckbox}
      />
    ),
    [memoizedOnToggle, removeCheckbox],
  );

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
    [DEFAULT_CURRENCY_OPTIONS, selectedCurrencies],
  );

  return (
    <CurrencySelectionContainer>
      <SearchContainer>
        <SearchInput
          placeholder={t('Search Currency')}
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
          <FlatList<SupportedCurrencyOption>
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
            {t("We couldn't find a match for ")}
            <BaseText style={{fontWeight: 'bold'}}>{searchInput}</BaseText>.
          </NoResultsDescription>
          {key ? (
            <Link
              style={{marginTop: 10, height: 50}}
              onPress={() => {
                haptic('soft');
                navigation.navigate('Wallet', {
                  screen: 'AddWallet',
                  params: {key, isCustomToken: true, isToken: true},
                });
              }}>
              {t('Add custom token')}
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
