import React, {
  useState,
  useMemo,
  useCallback,
  useLayoutEffect,
  useEffect,
} from 'react';
import {FlatList} from 'react-native';
import {yupResolver} from '@hookform/resolvers/yup';
import yup from '../../../../lib/yup';
import styled, {useTheme} from 'styled-components/native';
import {Controller, useForm} from 'react-hook-form';
import Button from '../../../../components/button/Button';
import BoxInput from '../../../../components/form/BoxInput';
import {
  TextAlign,
  H4,
  BaseText,
  HeaderTitle,
} from '../../../../components/styled/Text';
import {
  SheetContainer,
  Row,
  ActiveOpacity,
  SearchContainer,
  SearchInput,
} from '../../../../components/styled/Containers';
import {ValidateCoinAddress} from '../../../../store/wallet/utils/validations';
import {GetCoinAndNetwork} from '../../../../store/wallet/effects/address/address';
import {ContactRowProps} from '../../../../components/list/ContactRow';
import {useNavigation} from '@react-navigation/core';
import {RootState} from '../../../../store';
import {
  createContact,
  updateContact,
} from '../../../../store/contact/contact.actions';
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import SuccessIcon from '../../../../../assets/img/success.svg';
import SearchSvg from '../../../../../assets/img/search.svg';
import Icons from '../../../../components/modal/transact-menu/TransactMenuIcons';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {keyExtractor, findContact} from '../../../../utils/helper-methods';
import CurrencySelectionRow from '../../../../components/list/CurrencySelectionRow';
import NetworkSelectionRow, {
  NetworkSelectionProps,
} from '../../../../components/list/NetworkSelectionRow';
import {LightBlack, NeutralSlate, Slate} from '../../../../styles/colors';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import WalletIcons from '../../../wallet/components/WalletIcons';
import {SUPPORTED_CURRENCIES} from '../../../../constants/currencies';
import {BitpaySupportedTokenOpts} from '../../../../constants/tokens';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {GetChain} from '../../../../store/wallet/utils/currency';
import {TouchableOpacity} from 'react-native-gesture-handler';
import debounce from 'lodash.debounce';
import {useTranslation} from 'react-i18next';
import {logSegmentEvent} from '../../../../store/app/app.effects';
import {ContactsStackParamList} from '../ContactsStack';
import {StackScreenProps} from '@react-navigation/stack';

const InputContainer = styled.View<{hideInput?: boolean}>`
  display: ${({hideInput}) => (!hideInput ? 'flex' : 'none')};
  margin: 10px 0;
`;

const ActionContainer = styled.View`
  margin-top: 30px;
`;

const Container = styled.ScrollView`
  flex: 1;
  padding: 0 20px;
  margin-top: 20px;
`;

const AddressBadge = styled.View`
  background: ${({theme}) => (theme && theme.dark ? '#000' : '#fff')};
  position: absolute;
  right: 5px;
  top: 50%;
`;

const ScanButtonContainer = styled.TouchableOpacity`
  position: absolute;
  right: 5px;
  top: 27.5px;
`;

const CurrencySelectionModalContainer = styled(SheetContainer)`
  padding: 15px;
  min-height: 200px;
`;

const CurrencySelectorContainer = styled.View<{hideSelector?: boolean}>`
  display: ${({hideSelector}) => (!hideSelector ? 'flex' : 'none')};
  margin: 10px 0 20px 0;
  position: relative;
`;

const Label = styled(BaseText)`
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  top: 0;
  left: 1px;
  margin-bottom: 3px;
  color: ${({theme}) => (theme && theme.dark ? theme.colors.text : '#434d5a')};
`;

const CurrencyContainer = styled.TouchableOpacity`
  background: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
  padding: 0 20px 0 10px;
  height: 55px;
  border: 0.75px solid ${({theme}) => (theme.dark ? LightBlack : Slate)};
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
`;

const CurrencyName = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  margin-left: 10px;
  color: #9ba3ae;
`;

const NetworkName = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  color: #9ba3ae;
  text-transform: uppercase;
`;

const schema = yup.object().shape({
  name: yup.string().required(),
  email: yup.string().email().trim(),
  destinationTag: yup.number(),
  address: yup.string().required(),
});

const SearchImageContainer = styled.View`
  width: 50px;
  align-items: center;
`;
const ContactsAdd = ({
  route,
}: StackScreenProps<ContactsStackParamList, 'ContactsAdd'>) => {
  const {t} = useTranslation();
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: {errors, dirtyFields},
  } = useForm<ContactRowProps>({resolver: yupResolver(schema)});
  const {contact, context, onEditComplete} = route.params || {};

  const theme = useTheme();
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';

  const contacts = useAppSelector(({CONTACT}: RootState) => CONTACT.list);
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const [validAddress, setValidAddress] = useState(false);
  const [xrpValidAddress, setXrpValidAddress] = useState(false);
  const [ethValidAddress, setEthValidAddress] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const [addressValue, setAddressValue] = useState('');
  const [coinValue, setCoinValue] = useState('');
  const [networkValue, setNetworkValue] = useState('');

  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [networkModalVisible, setNetworkModalVisible] = useState(false);

  const tokenOptions = useAppSelector(({WALLET}: RootState) => {
    return {
      ...BitpaySupportedTokenOpts,
      ...WALLET.tokenOptions,
      ...WALLET.customTokenOptions,
    };
  });

  const ALL_CUSTOM_TOKENS = useMemo(
    () =>
      Object.values(tokenOptions)
        .filter(
          token => !SUPPORTED_CURRENCIES.includes(token.symbol.toLowerCase()),
        )
        .map(({symbol, name, logoURI}) => {
          return {
            id: symbol.toLowerCase(),
            currencyAbbreviation: symbol,
            currencyName: name,
            img: logoURI,
            isToken: true,
            checked: false,
          };
        }),
    [tokenOptions],
  );

  const ALL_CURRENCIES = useMemo(
    () => [...SupportedCurrencyOptions, ...ALL_CUSTOM_TOKENS],
    [ALL_CUSTOM_TOKENS],
  );

  const ETH_CHAIN_CURRENCIES = useMemo(
    () =>
      ALL_CURRENCIES.filter(
        currency =>
          dispatch(GetChain(currency.currencyAbbreviation)).toLowerCase() ===
          'eth',
      ),
    [ALL_CURRENCIES, dispatch],
  );

  const [ethCurrencyOptions, setEthCurrencyOptions] = useState<Array<any>>([
    ...ETH_CHAIN_CURRENCIES,
  ]);

  const [selectedCurrency, setSelectedCurrency] = useState(
    ETH_CHAIN_CURRENCIES[0],
  );

  const networkOptions = [
    {id: 'livenet', name: 'Livenet'},
    {id: 'testnet', name: 'Testnet'},
  ];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>
          {contact ? t('Edit Contact') : t('New Contact')}
        </HeaderTitle>
      ),
    });
  }, [navigation, t, contact]);

  const onSearchInputChange = useMemo(
    () =>
      debounce((search: string) => {
        let _searchList: Array<any> = [];
        if (search) {
          search = search.toLowerCase();
          _searchList = ethCurrencyOptions.filter(
            ({currencyAbbreviation, currencyName}) =>
              currencyAbbreviation.toLowerCase().includes(search) ||
              currencyName.toLowerCase().includes(search),
          );
        } else {
          _searchList = ethCurrencyOptions;
        }
        setEthCurrencyOptions(_searchList);
      }, 300),
    [ethCurrencyOptions],
  );

  const setValidValues = (address: string, coin: string, network: string) => {
    setValidAddress(true);
    setAddressValue(address);
    setCoinValue(coin);
    setNetworkValue(network);

    // Selected current coin
    _setSelectedCurrency(coin);

    switch (coin) {
      case 'eth':
        setEthValidAddress(true);
        return;
      case 'xrp':
        setXrpValidAddress(true);
        return;
      default:
        return;
    }
  };

  const processAddress = (address?: string) => {
    if (address) {
      const coinAndNetwork = GetCoinAndNetwork(address);
      if (coinAndNetwork) {
        const isValid = ValidateCoinAddress(
          address,
          coinAndNetwork.coin,
          coinAndNetwork.network,
        );
        if (isValid) {
          setValidValues(address, coinAndNetwork.coin, coinAndNetwork.network);
        } else {
          // try testnet
          const isValidTest = ValidateCoinAddress(
            address,
            coinAndNetwork.coin,
            'testnet',
          );
          if (isValidTest) {
            setValidValues(address, coinAndNetwork.coin, 'testnet');
          }
        }
      } else {
        setCoinValue('');
        setNetworkValue('');
        setAddressValue('');
        setValidAddress(false);
        setEthValidAddress(false);
        setXrpValidAddress(false);
      }
    }
  };

  const onSubmit = handleSubmit((contact: ContactRowProps) => {
    if (!validAddress) {
      setError('address', {
        type: 'manual',
        message: t('Invalid address'),
      });
      return;
    }

    if (coinValue && networkValue) {
      contact.coin = coinValue;
      contact.network = networkValue;
    } else {
      setError('address', {
        type: 'manual',
        message: t('Coin or Network invalid'),
      });
      return;
    }

    if (coinValue === 'xrp' && !contact.destinationTag) {
      setError('destinationTag', {
        type: 'manual',
        message: t('Tag number is required for XRP address'),
      });
      return;
    }

    if (context === 'edit') {
      dispatch(updateContact(contact));
      navigation.goBack();
      onEditComplete && onEditComplete(contact);
      return;
    }

    if (findContact(contacts, addressValue, coinValue, networkValue)) {
      setError('address', {
        type: 'manual',
        message: t('Contact already exists'),
      });
      return;
    }

    dispatch(createContact(contact));
    navigation.goBack();
  });

  const _setSelectedCurrency = (id: string) => {
    const _selectedCurrency = ethCurrencyOptions.filter(
      currency => currency.id === id,
    );
    setSelectedCurrency(_selectedCurrency[0]);
  };

  const currencySelected = (id: string) => {
    _setSelectedCurrency(id);
    setCoinValue(id);
    setCurrencyModalVisible(false);
  };

  const networkSelected = ({id}: NetworkSelectionProps) => {
    setNetworkValue(id);
    setNetworkModalVisible(false);
  };

  // Flat list
  const renderItem = useCallback(
    ({item}) => (
      <CurrencySelectionRow
        currency={item}
        onToggle={currencySelected}
        key={item.id}
        hideCheckbox={true}
      />
    ),
    [],
  );

  const renderItemNetowrk = useCallback(
    ({item}) => (
      <NetworkSelectionRow item={item} emit={networkSelected} key={item.id} />
    ),
    [],
  );

  const goToScan = () => {
    dispatch(
      logSegmentEvent('track', 'Open Scanner', {
        context: 'contactsAdd',
      }),
    );
    navigation.navigate('Scan', {
      screen: 'Root',
      params: {
        onScanComplete: address => {
          setValue('address', address, {shouldDirty: true});
          processAddress(address);
        },
      },
    });
  };

  useEffect(() => {
    if (contact?.address) {
      setValue('address', contact.address, {shouldDirty: true});
      setValue('name', contact.name || '');
      setValue('email', contact.email);
      setValue('destinationTag', contact.tag || contact.destinationTag);
      if (contact.coin) {
        currencySelected(contact.coin);
      }
      processAddress(contact.address);
    }
  }, [contact]);

  return (
    <Container keyboardShouldPersistTaps="handled">
      <InputContainer>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              placeholder={'Satoshi Nakamoto'}
              label={t('NAME')}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.name?.message}
              value={value}
              autoCorrect={false}
            />
          )}
          name="name"
          defaultValue=""
        />
      </InputContainer>
      <InputContainer>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              placeholder={'satoshi@example.com'}
              label={t('EMAIL (OPTIONAL)')}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.email?.message}
              value={value}
            />
          )}
          name="email"
          defaultValue=""
        />
      </InputContainer>
      {!contact ? (
        <InputContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                placeholder={'Crypto address'}
                label={t('ADDRESS')}
                onBlur={onBlur}
                onChangeText={(newValue: string) => {
                  onChange(newValue);
                  processAddress(newValue);
                }}
                error={errors.address?.message}
                value={value}
              />
            )}
            name="address"
            defaultValue=""
          />
          {addressValue && dirtyFields.address ? (
            <AddressBadge>
              <SuccessIcon />
            </AddressBadge>
          ) : (
            <ScanButtonContainer onPress={goToScan}>
              <Icons.Scan />
            </ScanButtonContainer>
          )}
        </InputContainer>
      ) : (
        <InputContainer>
          <Controller
            control={control}
            render={({field: {value}}) => (
              <BoxInput disabled={true} label={t('ADDRESS')} value={value} />
            )}
            name="address"
            defaultValue=""
          />
        </InputContainer>
      )}

      <InputContainer hideInput={!xrpValidAddress}>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              placeholder={'Tag'}
              label={t('TAG')}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.destinationTag?.message}
              keyboardType={'number-pad'}
              type={'number'}
              maxLength={9}
              value={value?.toString()}
            />
          )}
          name="destinationTag"
        />
      </InputContainer>

      {!contact ? (
        <CurrencySelectorContainer hideSelector={!ethValidAddress}>
          <Label>{t('CURRENCY')}</Label>
          <CurrencyContainer
            activeOpacity={ActiveOpacity}
            onPress={() => {
              setCurrencyModalVisible(true);
            }}>
            <Row
              style={{
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Row style={{alignItems: 'center'}}>
                {selectedCurrency?.img ? (
                  <CurrencyImage img={selectedCurrency.img} size={30} />
                ) : null}
                <CurrencyName>
                  {selectedCurrency?.currencyAbbreviation}
                </CurrencyName>
              </Row>
              <WalletIcons.DownToggle />
            </Row>
          </CurrencyContainer>
        </CurrencySelectorContainer>
      ) : null}

      <CurrencySelectorContainer hideSelector={true}>
        <Label>{t('NETWORK')}</Label>
        <CurrencyContainer
          activeOpacity={ActiveOpacity}
          onPress={() => {
            setNetworkModalVisible(true);
          }}>
          <Row
            style={{
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <Row style={{alignItems: 'center'}}>
              <NetworkName>{networkValue}</NetworkName>
            </Row>
            <WalletIcons.DownToggle />
          </Row>
        </CurrencyContainer>
      </CurrencySelectorContainer>

      <ActionContainer>
        <Button onPress={onSubmit}>
          {contact ? t('Save Contact') : t('Add Contact')}
        </Button>
      </ActionContainer>
      <SheetModal
        isVisible={currencyModalVisible}
        onBackdropPress={() => setCurrencyModalVisible(false)}>
        <CurrencySelectionModalContainer>
          <TextAlign align={'center'} style={{paddingBottom: 20}}>
            <H4>{t('Select a Coin')}</H4>
          </TextAlign>
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
                  <WalletIcons.Delete />
                </TouchableOpacity>
              )}
            </SearchImageContainer>
          </SearchContainer>
          <FlatList
            contentContainerStyle={{minHeight: '100%'}}
            data={ethCurrencyOptions}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
          />
        </CurrencySelectionModalContainer>
      </SheetModal>
      <SheetModal
        isVisible={networkModalVisible}
        onBackdropPress={() => setNetworkModalVisible(false)}>
        <CurrencySelectionModalContainer>
          <TextAlign align={'center'}>
            <H4>{t('Select a Network')}</H4>
          </TextAlign>
          <FlatList
            contentContainerStyle={{paddingTop: 20, paddingBottom: 20}}
            data={networkOptions}
            keyExtractor={keyExtractor}
            renderItem={renderItemNetowrk}
          />
        </CurrencySelectionModalContainer>
      </SheetModal>
    </Container>
  );
};

export default ContactsAdd;
