import React, {useState} from 'react';
import styled from 'styled-components/native';
import {CtaContainerAbsolute} from '../../../components/styled/Containers';
import CurrencySelectionRow from '../../../components/list/CurrencySelectionRow';
import {CurrencySelectionOptions} from '../../../constants/CurrencySelectionOptions';
import Button from '../../../components/button/Button';
import {
  SUPPORTED_TOKENS,
  SupportedCurrencies,
} from '../../../constants/currencies';
import {useDispatch} from 'react-redux';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {startCreateKey} from '../../../store/wallet/effects';
import {FlatList} from 'react-native';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {useNavigation} from '@react-navigation/native';

const CurrencySelectionContainer = styled.SafeAreaView`
  flex: 1;
`;

const ListContainer = styled.View`
  margin-top: 20px;
`;

const CurrencySelection = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const [currencyOptions, setCurrencyOptions] = useState(
    CurrencySelectionOptions,
  );
  const [selectedCurrencies, setSelectedCurrencies] = useState<Array<string>>(
    [],
  );

  const checkAndNotifyEthRequired = (currency: string) => {
    if (
      currency === 'ETH' &&
      selectedCurrencies.filter(selected =>
        SUPPORTED_TOKENS.includes(selected.toLowerCase()),
      ).length
    ) {
      dispatch(
        showBottomNotificationModal({
          type: 'info',
          title: 'Currency required',
          message:
            'To remove this currency you must first remove your selected tokens.',
          enableBackdropDismiss: false,
          actions: [
            {
              text: 'OK',
              action: () => {},
              primary: true,
            },
          ],
        }),
      );
    }
  };

  const checkAndToggleEthIfTokenSelected = (
    currencies: Array<string>,
  ): Array<string> => {
    // if selecting token force eth wallet
    for (const selected of currencies) {
      if (SUPPORTED_TOKENS.includes(selected.toLowerCase())) {
        if (!currencies.includes('ETH')) {
          setCurrencyOptions(
            CurrencySelectionOptions.map(currency => {
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
    // if token selected show warning
    checkAndNotifyEthRequired(currency);
    // reset asset in list
    let currencies = selectedCurrencies.filter(
      selected => selected !== currency,
    );
    // add if checked
    if (checked) {
      currencies = [...currencies, currency];
    }
    // if token selected set eth asset selected
    setSelectedCurrencies(checkAndToggleEthIfTokenSelected(currencies));
  };

  const createWallet = async () => {
    const currencies = selectedCurrencies.map(selected =>
      selected.toLowerCase(),
    ) as Array<SupportedCurrencies>;
    await dispatch(
      startOnGoingProcessModal(OnGoingProcessMessages.CREATING_KEY),
    );
    await dispatch(startCreateKey(currencies));
    navigation.navigate('Onboarding', {screen: 'BackupKey'});
  };

  return (
    <CurrencySelectionContainer>
      <ListContainer>
        <FlatList
          contentContainerStyle={{paddingBottom: 100}}
          data={currencyOptions}
          renderItem={({item}) => (
            <CurrencySelectionRow
              item={item}
              emit={currencyToggled}
              key={item.id}
            />
          )}
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
