import React, {useCallback, useLayoutEffect, useMemo, useState} from 'react';
import styled from 'styled-components/native';
import {
  CtaContainerAbsolute,
  HeaderRightContainer,
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
import {FlatList} from 'react-native';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {HeaderTitle} from '../../../components/styled/Text';
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
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {Key} from '../../../store/wallet/wallet.models';
import {StackScreenProps} from '@react-navigation/stack';
import {keyExtractor} from '../../../utils/helper-methods';
import {sleep} from '../../../utils/helper-methods';
import {useLogger} from '../../../utils/hooks/useLogger';

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

const CurrencySelectionContainer = styled.SafeAreaView`
  flex: 1;
`;

const ListContainer = styled.View`
  margin-top: 20px;
`;

const CurrencySelection: React.FC<CurrencySelectionScreenProps> = ({route}) => {
  // setting context
  const navigation = useNavigation();
  const {context, key} = route.params;
  const logger = useLogger();
  const dispatch = useDispatch();

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

  const contextHandler = (
    context: CurrencySelectionContext,
    key?: Key,
    CURATED_TOKENS?: {
      id: number;
      currencyAbbreviation: string;
      currencyName: string;
      img: string;
      isToken: boolean;
    }[],
  ): ContextHandler | undefined => {
    switch (context) {
      case 'onboarding':
      case 'createNewKey': {
        return {
          // @ts-ignore
          currencies: [...SupportedCurrencyOptions, ...CURATED_TOKENS],
          ctaTitle: 'Create Key',
          bottomCta: async ({selectedCurrencies, dispatch, navigation}) => {
            try {
              const currencies = selectedCurrencies?.map(selected =>
                selected.toLowerCase(),
              ) as Array<SupportedCurrencies>;
              await dispatch(
                startOnGoingProcessModal(OnGoingProcessMessages.CREATING_KEY),
              );
              const key = (await dispatch<any>(
                startCreateKey(currencies),
              )) as Key;

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
          currencies: [...SupportedCurrencyOptions, ...CURATED_TOKENS],
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
          currencies: SupportedCurrencyOptions.filter(
            currency => currency.hasMultisig,
          ),
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
    currencies,
    bottomCta,
    ctaTitle,
    headerTitle,
    hideBottomCta,
    selectionCta,
    removeCheckbox,
  } = contextHandler(context, key, CURATED_TOKENS) || {};

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

  const DEFAULT_CURRENCY_OPTIONS = useMemo(() => currencies || [], []);

  // TODO search
  // const ALL_CURRENCY_OPTIONS = useMemo(
  //   () => [...SupportedCurrencyOptions, ...ALL_CUSTOM_TOKENS],
  //   [],
  // );

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

  return (
    <CurrencySelectionContainer>
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
