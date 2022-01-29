import React, {useCallback, useLayoutEffect, useMemo, useState} from 'react';
import styled from 'styled-components/native';
import {
  CtaContainerAbsolute,
  HeaderRightContainer,
} from '../../../components/styled/Containers';
import CurrencySelectionRow from '../../../components/list/CurrencySelectionRow';

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
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {RootState} from '../../../store';
import {WalletStackParamList} from '../WalletStack';
import {Dispatch} from 'redux';
import {RootStackParamList} from '../../../Root';
import {dismissOnGoingProcessModal} from '../../../store/app/app.actions';
import {Key} from '../../../store/wallet/wallet.models';
import {StackScreenProps} from '@react-navigation/stack';

type CurrencySelectionScreenProps = StackScreenProps<
  WalletStackParamList,
  'CurrencySelection'
>;

type CurrencySelectionContext = 'onboarding' | 'createNewKey';

export type CurrencySelectionParamList = {
  context: CurrencySelectionContext;
};

interface CtaProps {
  selectedCurrencies: string[];
  dispatch: Dispatch<any>;
  navigation: NavigationProp<RootStackParamList>;
}

const CurrencySelectionContainer = styled.SafeAreaView`
  flex: 1;
`;

const ListContainer = styled.View`
  margin-top: 20px;
`;

const keyExtractor = (item: {id: string}) => item.id;

const contextHandler = (
  context: CurrencySelectionContext,
): {ctaTitle: string; cta: (props: CtaProps) => void} => {
  switch (context) {
    case 'onboarding':
    case 'createNewKey':
      return {
        ctaTitle: 'Create Key',
        cta: async ({selectedCurrencies, dispatch, navigation}) => {
          try {
            const currencies = selectedCurrencies.map(selected =>
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
};

const CurrencySelection: React.FC<CurrencySelectionScreenProps> = ({route}) => {
  // setting context
  const navigation = useNavigation();
  const {context} = route.params;
  const {cta, ctaTitle} = contextHandler(context);

  // Configuring Header
  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>Select Currencies</HeaderTitle>,
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

  // TODO search
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
    currency,
    checked,
  }: {
    currency: string;
    checked: boolean;
  }) => {
    setSelectedCurrencies(currencies => {
      // reset asset in list
      currencies = currencies.filter(selected => selected !== currency);
      // add if checked
      if (checked) {
        currencies = [...currencies, currency];
      }
      // if token selected set eth asset selected
      return checkAndToggleEthIfTokenSelected(currencies);
    });
  };
  // Flat list
  const renderItem = useCallback(
    ({item}) => (
      <CurrencySelectionRow item={item} emit={currencyToggled} key={item.id} />
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
          onPress={() => cta({selectedCurrencies, dispatch, navigation})}
          buttonStyle={'primary'}
          disabled={!selectedCurrencies.length}>
          {ctaTitle}
        </Button>
      </CtaContainerAbsolute>
    </CurrencySelectionContainer>
  );
};

export default CurrencySelection;
