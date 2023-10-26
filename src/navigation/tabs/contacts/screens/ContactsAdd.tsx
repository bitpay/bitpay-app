import React, {
  useState,
  useMemo,
  useCallback,
  useLayoutEffect,
  useEffect,
} from 'react';
import {FlatList, View, TouchableOpacity} from 'react-native';
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
  Column,
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
import SuccessIcon from '../../../../../assets/img/success.svg';
import SearchSvg from '../../../../../assets/img/search.svg';
import ScanSvg from '../../../../../assets/img/onboarding/scan.svg';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {
  keyExtractor,
  findContact,
  getBadgeImg,
  getChainUsingSuffix,
} from '../../../../utils/helper-methods';
import CurrencySelectionRow, {
  TokenSelectionRow,
} from '../../../../components/list/CurrencySelectionRow';
import NetworkSelectionRow, {
  NetworkSelectionProps,
} from '../../../../components/list/NetworkSelectionRow';
import {LightBlack, NeutralSlate, Slate} from '../../../../styles/colors';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import WalletIcons from '../../../wallet/components/WalletIcons';
import {BitpaySupportedTokens} from '../../../../constants/currencies';
import {BitpaySupportedTokenOptsByAddress} from '../../../../constants/tokens';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import debounce from 'lodash.debounce';
import {useTranslation} from 'react-i18next';
import {ContactsStackParamList} from '../ContactsStack';
import {StackScreenProps} from '@react-navigation/stack';
import {
  SupportedCurrencyOption,
  SupportedEvmCurrencyOptions,
  SupportedTokenOptions,
} from '../../../../constants/SupportedCurrencyOptions';
import Checkbox from '../../../../components/checkbox/Checkbox';
import {IsERCToken} from '../../../../store/wallet/utils/currency';
import {Analytics} from '../../../../store/analytics/analytics.effects';

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
  right: 13px;
  top: 50%;
`;

const ScanButtonContainer = styled.TouchableOpacity`
  background: ${({theme}) => (theme && theme.dark ? '#000' : '#fff')};
  position: absolute;
  right: 5px;
  top: 32px;
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
  name: yup.string().required().trim(),
  email: yup.string().email().trim(),
  destinationTag: yup.number(),
  address: yup.string().required(),
});

const SearchImageContainer = styled.View`
  width: 50px;
  align-items: center;
`;

const IsTokenAddressContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
`;

const IsTokenAddressTitle = styled(BaseText)`
  font-size: 16px;
  color: ${({theme}) => (theme && theme.dark ? theme.colors.text : '#434d5a')};
`;

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
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
  const isDev = __DEV__;

  const theme = useTheme();
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';

  const contacts = useAppSelector(({CONTACT}: RootState) => CONTACT.list);
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const [validAddress, setValidAddress] = useState(false);
  const [xrpValidAddress, setXrpValidAddress] = useState(false);
  const [evmValidAddress, setEvmValidAddress] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const [addressValue, setAddressValue] = useState('');
  const [coinValue, setCoinValue] = useState('');
  const [tokenAddressValue, setTokenAddressValue] = useState(
    undefined as string | undefined,
  );
  const [networkValue, setNetworkValue] = useState('');
  const [chainValue, setChainValue] = useState('');

  const [tokenModalVisible, setTokenModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [networkModalVisible, setNetworkModalVisible] = useState(false);
  const [isTokenAddress, setIsTokenAddress] = useState(
    IsERCToken(contact?.coin || '', contact?.chain || ''),
  );

  const tokenOptionsByAddress = useAppSelector(({WALLET}: RootState) => {
    return {
      ...BitpaySupportedTokenOptsByAddress,
      ...WALLET.tokenOptionsByAddress,
      ...WALLET.customTokenOptionsByAddress,
    };
  });

  const ALL_CUSTOM_TOKENS = useMemo(() => {
    return Object.entries(tokenOptionsByAddress)
      .filter(([k]) => !BitpaySupportedTokens[k])
      .map(([k, {symbol, name, logoURI}]) => {
        const chain = getChainUsingSuffix(k);
        return {
          id: Math.random().toString(),
          coin: symbol.toLowerCase(),
          currencyAbbreviation: symbol,
          currencyName: name,
          img: logoURI || '',
          isToken: true,
          chain,
          badgeUri: getBadgeImg(symbol.toLowerCase(), chain),
        } as SupportedCurrencyOption;
      });
  }, [tokenOptionsByAddress]);

  const ALL_TOKENS = useMemo(
    () => [...SupportedTokenOptions, ...ALL_CUSTOM_TOKENS],
    [ALL_CUSTOM_TOKENS],
  );

  const [allTokenOptions, setAllTokenOptions] = useState(ALL_TOKENS);
  const [selectedToken, setSelectedToken] = useState(ALL_TOKENS[0]);
  const [selectedCurrency, setSelectedCurrency] = useState(
    SupportedEvmCurrencyOptions[0],
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
          _searchList = ALL_TOKENS.filter(
            ({currencyAbbreviation, currencyName}) =>
              currencyAbbreviation.toLowerCase().includes(search) ||
              currencyName.toLowerCase().includes(search),
          );
        } else {
          _searchList = ALL_TOKENS;
        }
        setAllTokenOptions(_searchList);
      }, 300),
    [ALL_TOKENS],
  );

  const setValidValues = (
    address: string,
    coin: string,
    network: string,
    chain: string,
  ) => {
    setValidAddress(true);
    setAddressValue(address);
    setCoinValue(coin);
    setNetworkValue(network);
    setChainValue(chain);

    _setSelectedCurrency(coin);

    switch (chain) {
      case 'eth':
      case 'matic':
        setEvmValidAddress(true);
        return;
      case 'xrp':
        setXrpValidAddress(true);
        return;
      default:
        return;
    }
  };

  const processAddress = (
    address?: string,
    coin?: string,
    network?: string,
    chain?: string,
  ) => {
    if (address) {
      const coinAndNetwork = GetCoinAndNetwork(address, undefined, chain);
      if (coinAndNetwork) {
        const isValid = ValidateCoinAddress(
          address,
          coinAndNetwork.coin,
          coinAndNetwork.network,
        );
        if (isValid) {
          setValidValues(
            address,
            coin || coinAndNetwork.coin,
            network || coinAndNetwork.network,
            chain || coinAndNetwork.coin,
          );
        } else {
          // try testnet
          const isValidTest = ValidateCoinAddress(
            address,
            coinAndNetwork.coin,
            'testnet',
          );
          if (isValidTest) {
            setValidValues(
              address,
              coin || coinAndNetwork.coin,
              network || 'testnet',
              chain || coinAndNetwork.coin,
            );
          }
        }
      } else {
        setCoinValue('');
        setNetworkValue('');
        setAddressValue('');
        setTokenAddressValue(undefined);
        setValidAddress(false);
        setEvmValidAddress(false);
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

    if (coinValue && chainValue && networkValue) {
      contact.coin = coinValue;
      contact.chain = chainValue;
      contact.network = networkValue;
      contact.tokenAddress = tokenAddressValue;
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

    if (
      findContact(
        contacts,
        addressValue,
        coinValue,
        networkValue,
        chainValue,
        tokenAddressValue,
      )
    ) {
      setError('address', {
        type: 'manual',
        message: t('Contact already exists'),
      });
      return;
    }

    dispatch(createContact(contact));
    navigation.goBack();
  });

  const _setSelectedToken = (currencyAbbreviation: string, chain: string) => {
    const _selectedToken = allTokenOptions.find(
      token =>
        token.currencyAbbreviation === currencyAbbreviation &&
        token.chain === chain,
    );
    setSelectedToken(_selectedToken || allTokenOptions[0]);
  };

  const _setSelectedCurrency = (currencyAbbreviation: string) => {
    const _selectedCurrency = SupportedEvmCurrencyOptions.filter(
      currency => currency.currencyAbbreviation === currencyAbbreviation,
    );
    setSelectedCurrency(_selectedCurrency[0]);
  };

  const tokenSelected = (
    currencyAbbreviation: string,
    chain: string,
    tokenAddress: string | undefined,
  ) => {
    _setSelectedToken(currencyAbbreviation, chain);
    setCoinValue(currencyAbbreviation);
    setTokenAddressValue(tokenAddress);
    setTokenModalVisible(false);
  };

  const currencySelected = (
    currencyAbbreviation: string,
    isTokenAddress: boolean,
  ) => {
    _setSelectedCurrency(currencyAbbreviation);
    if (isTokenAddress) {
      setChainValue(currencyAbbreviation);
      tokenSelected(
        allTokenOptions.find(t => t.chain === currencyAbbreviation)
          ?.currencyAbbreviation!,
        currencyAbbreviation,
        undefined,
      );
    } else {
      setCoinValue(currencyAbbreviation);
    }
    setCurrencyModalVisible(false);
  };

  const networkSelected = ({id}: NetworkSelectionProps) => {
    setNetworkValue(id);
    setNetworkModalVisible(false);
  };

  const _setIsTokenAddress = () => {
    setIsTokenAddress(!isTokenAddress);
    currencySelected(selectedCurrency.currencyAbbreviation, true);
  };

  // Flat list
  const renderTokenItem = useCallback(
    ({item}) => (
      <TokenSelectionRow
        token={item}
        onToggle={tokenSelected}
        key={item.id}
        hideCheckbox={true}
        hideArrow={true}
        badgeUri={item.badgeUri}
      />
    ),
    [],
  );

  const renderItem = useCallback(
    ({item}) => (
      <CurrencySelectionRow
        currency={item}
        onToggle={currencyAbbreviaton =>
          currencySelected(currencyAbbreviaton, isTokenAddress)
        }
        key={item.id}
        hideCheckbox={true}
      />
    ),
    [isTokenAddress],
  );

  const renderNetworkItem = useCallback(
    ({item}) => (
      <NetworkSelectionRow item={item} emit={networkSelected} key={item.id} />
    ),
    [],
  );

  const goToScan = () => {
    dispatch(
      Analytics.track('Open Scanner', {
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
    if (contact) {
      processAddress(
        contact.address,
        contact.coin,
        contact.network,
        contact.chain,
      );
      setValue('address', contact.address!, {shouldDirty: true});
      setValue('name', contact.name || '');
      setValue('email', contact.email);
      setValue('chain', contact.chain!);
      setValue('destinationTag', contact.tag || contact.destinationTag);
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
              <ScanSvg />
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

      {!contact && evmValidAddress ? (
        <IsTokenAddressContainer
          onPress={() => {
            _setIsTokenAddress();
          }}>
          <Column>
            <IsTokenAddressTitle>
              {t('Is this a token address?')}
            </IsTokenAddressTitle>
          </Column>
          <CheckBoxContainer>
            <Checkbox
              checked={isTokenAddress}
              onPress={() => {
                _setIsTokenAddress();
              }}
            />
          </CheckBoxContainer>
        </IsTokenAddressContainer>
      ) : null}

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
        <CurrencySelectorContainer hideSelector={!evmValidAddress}>
          <Label>{isTokenAddress ? t('CHAIN') : t('CURRENCY')}</Label>
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
                {selectedCurrency ? (
                  <View>
                    <CurrencyImage img={selectedCurrency.img} size={30} />
                  </View>
                ) : null}
                <CurrencyName>
                  {selectedCurrency?.currencyAbbreviation.toUpperCase()}
                </CurrencyName>
              </Row>
              <WalletIcons.DownToggle />
            </Row>
          </CurrencyContainer>
        </CurrencySelectorContainer>
      ) : null}

      {isTokenAddress ? (
        <CurrencySelectorContainer hideSelector={!evmValidAddress}>
          <Label>{t('TOKEN')}</Label>
          <CurrencyContainer
            activeOpacity={ActiveOpacity}
            onPress={() => {
              setTokenModalVisible(true);
            }}>
            <Row
              style={{
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Row style={{alignItems: 'center'}}>
                {selectedToken ? (
                  <View>
                    <CurrencyImage
                      img={selectedToken?.img}
                      imgSrc={
                        typeof selectedToken?.imgSrc === 'number'
                          ? selectedToken?.imgSrc
                          : undefined
                      }
                      size={30}
                      badgeUri={selectedToken?.badgeUri}
                    />
                  </View>
                ) : null}
                <CurrencyName>{selectedToken?.currencyName}</CurrencyName>
              </Row>
              <WalletIcons.DownToggle />
            </Row>
          </CurrencyContainer>
        </CurrencySelectorContainer>
      ) : null}

      <CurrencySelectorContainer
        hideSelector={!isDev || !(xrpValidAddress || evmValidAddress)}>
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
            <H4>{isTokenAddress ? t('Select a Chain') : t('Select a Coin')}</H4>
          </TextAlign>
          <FlatList
            contentContainerStyle={{minHeight: '100%'}}
            data={SupportedEvmCurrencyOptions}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
          />
        </CurrencySelectionModalContainer>
      </SheetModal>
      <SheetModal
        isVisible={tokenModalVisible}
        onBackdropPress={() => setTokenModalVisible(false)}>
        <CurrencySelectionModalContainer>
          <TextAlign align={'center'} style={{paddingBottom: 20}}>
            <H4>{t('Select a Token')}</H4>
          </TextAlign>
          <SearchContainer>
            <SearchInput
              placeholder={t('Search Token')}
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
            data={allTokenOptions.filter(t => t.chain === chainValue)}
            keyExtractor={keyExtractor}
            renderItem={renderTokenItem}
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
            renderItem={renderNetworkItem}
          />
        </CurrencySelectionModalContainer>
      </SheetModal>
    </Container>
  );
};

export default ContactsAdd;
