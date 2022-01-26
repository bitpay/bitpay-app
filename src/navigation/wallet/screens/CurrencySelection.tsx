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
import {useNavigation} from '@react-navigation/native';
import {HeaderTitle} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {RootState} from '../../../store';

const CurrencySelectionContainer = styled.SafeAreaView`
  flex: 1;
`;

const ListContainer = styled.View`
  margin-top: 20px;
`;

const keyExtractor = (item: {id: string}) => item.id;

const CurrencySelection = () => {
  const navigation = useNavigation();
  // Configuring Header
  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>Select Currencies</HeaderTitle>,
      headerTitleAlign: 'center',
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            buttonType={'pill'}
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('Onboarding', {
                screen: 'TermsOfUse',
                params: {
                  context: 'skip',
                },
              });
            }}>
            Skip
          </Button>
        </HeaderRightContainer>
      ),
    });
  });

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

  const createWallet = async () => {
    const currencies = selectedCurrencies.map(selected =>
      selected.toLowerCase(),
    ) as Array<SupportedCurrencies>;
    console.log(currencies);
    await dispatch(
      startOnGoingProcessModal(OnGoingProcessMessages.CREATING_KEY),
    );
    await dispatch(startCreateKey(currencies));
    navigation.navigate('Onboarding', {screen: 'BackupKey'});
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
          onPress={createWallet}
          buttonStyle={'primary'}
          disabled={!selectedCurrencies.length}>
          Create Key
        </Button>
      </CtaContainerAbsolute>
    </CurrencySelectionContainer>
  );
};

export default CurrencySelection;
