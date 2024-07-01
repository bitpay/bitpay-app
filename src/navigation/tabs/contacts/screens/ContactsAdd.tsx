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
  CurrencyColumn,
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
  formatCurrencyAbbreviation,
} from '../../../../utils/helper-methods';
import CurrencySelectionRow, {
  CurrencySelectionItem,
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
import {ContactsScreens, ContactsGroupParamList} from '../ContactsGroup';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  SupportedCurrencyOption,
  SupportedChainOption,
  SupportedChainsOptions,
  SupportedTokenOptions,
  SupportedCoinsOptions,
  SupportedEvmCurrencyOptions,
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
  margin-bottom: 60px;
`;

const Container = styled.SafeAreaView`
  flex: 1;
`;

const ScrollContainer = styled.ScrollView`
  padding: 0 20px;
  margin-top: 20px;
`;

const AddressBadge = styled.View`
  position: absolute;
  right: 13px;
  top: 50%;
`;

const ScanButtonContainer = styled.TouchableOpacity`
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
  destinationTag: yup.string().trim(),
  address: yup.string().trim().required(),
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

const CurrencyTitleColumn = styled(CurrencyColumn)`
  flex-direction: column;
  align-items: flex-start;
`;

const CurrencySubTitle = styled(BaseText)`
  color: #9ba3ae;
  font-size: 12px;
  margin-left: 10px;
`;

const ContactsAdd = ({
  route,
}: NativeStackScreenProps<ContactsGroupParamList, ContactsScreens.ADD>) => {
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
  const [tokenAddressValue, setTokenAddressValue] = useState<
    string | undefined
  >();
  const [networkValue, setNetworkValue] = useState('');

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
      .map(([k, {symbol, name, logoURI, address}]) => {
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
          tokenAddress: address,
        } as CurrencySelectionItem;
      });
  }, [tokenOptionsByAddress]);

  const SUPPORTED_TOKEN_OPTIONS = useMemo(() => {
    return Object.entries(SupportedTokenOptions).map(
      ([
        id,
        {
          img,
          currencyName,
          currencyAbbreviation,
          chain,
          isToken,
          badgeUri,
          tokenAddress,
        },
      ]) => {
        return {
          id,
          coin: currencyAbbreviation,
          currencyAbbreviation: currencyAbbreviation,
          currencyName,
          img,
          isToken,
          chain,
          badgeUri,
          tokenAddress,
        } as CurrencySelectionItem;
      },
    );
  }, [tokenOptionsByAddress]);

  const ALL_TOKENS = useMemo(
    () => [...SUPPORTED_TOKEN_OPTIONS, ...ALL_CUSTOM_TOKENS],
    [ALL_CUSTOM_TOKENS],
  );

  const [allTokenOptions, setAllTokenOptions] = useState(ALL_TOKENS);
  const [selectedToken, setSelectedToken] = useState(ALL_TOKENS[0]);
  const [selectedChain, setSelectedChain] = useState(SupportedChainsOptions[0]);
  const [selectedCurrency, setSelectedCurrency] = useState<
    SupportedCurrencyOption | CurrencySelectionItem
  >(SupportedCoinsOptions[0]);

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
    currencyAbbreviation: string,
    network: string,
    chain: string,
    tokenAddress: string | undefined,
  ) => {
    setValidAddress(true);
    setAddressValue(address);
    setNetworkValue(network);
    setTokenAddressValue(tokenAddress);

    _setSelectedChain(chain);
    _setSelectedCurrency(currencyAbbreviation, chain, tokenAddress);

    switch (chain) {
      case 'eth':
      case 'matic':
      case 'arb':
      case 'base':
      case 'op':
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
    tokenAddress?: string,
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
            tokenAddress,
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
              tokenAddress,
            );
          }
        }
      } else {
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

    if (
      selectedCurrency.currencyAbbreviation &&
      selectedChain.chain &&
      networkValue
    ) {
      contact.coin = selectedCurrency.currencyAbbreviation;
      contact.chain = selectedChain.chain;
      contact.network = networkValue;
      contact.tokenAddress = tokenAddressValue;
    } else {
      setError('address', {
        type: 'manual',
        message: t('Coin or Network invalid'),
      });
      return;
    }

    if (
      selectedCurrency.currencyAbbreviation === 'xrp' &&
      contact.destinationTag &&
      isNaN(contact.destinationTag)
    ) {
      setError('destinationTag', {
        type: 'manual',
        message: t('Only numbers are allowed'),
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
        selectedCurrency.currencyAbbreviation,
        networkValue,
        selectedChain.chain,
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

  const _setSelectedChain = (_chain: string) => {
    const _selectedChain = SupportedChainsOptions.filter(
      ({chain}) => chain === _chain,
    );
    setSelectedChain(_selectedChain[0]);
  };

  const _setSelectedCurrency = (
    _currencyAbbreviation: string,
    _chain: string,
    tokenAddress: string | undefined,
  ) => {
    let _selectedCurrency;
    if (!tokenAddress) {
      _selectedCurrency = SupportedCoinsOptions.filter(
        ({currencyAbbreviation, chain}) =>
          currencyAbbreviation === _currencyAbbreviation && chain === _chain,
      );
      setSelectedCurrency(_selectedCurrency[0]);
    } else {
      _selectedCurrency = ALL_TOKENS.find(
        ({tokenAddress: _tokenAddress}) =>
          _tokenAddress?.toLowerCase() === tokenAddress.toLowerCase(),
      );
      setSelectedCurrency(_selectedCurrency!);
    }
  };

  const _setSelectedToken = (
    currencyAbbreviation: string,
    chain: string,
    tokenAddress: string | undefined,
  ) => {
    const _selectedToken = allTokenOptions.find(
      token => tokenAddress === token.tokenAddress && chain === token.chain,
    );
    const token = _selectedToken || allTokenOptions[0];
    setSelectedToken(token);
    setTokenAddressValue(tokenAddress);
    _setSelectedChain(chain);
    _setSelectedCurrency(
      token?.currencyAbbreviation || currencyAbbreviation,
      chain,
      tokenAddress,
    );
    setTokenModalVisible(false);
  };

  const currencyChainSelected = (
    currencyAbbreviation: string,
    chain: string,
    isTokenAddress: boolean,
  ) => {
    if (isTokenAddress) {
      const firstTokenOption = allTokenOptions.find(t => t.chain === chain);
      _setSelectedToken(
        firstTokenOption?.currencyAbbreviation!,
        chain,
        firstTokenOption?.tokenAddress,
      );
    } else {
      _setSelectedChain(chain);
      _setSelectedCurrency(currencyAbbreviation, chain, undefined);
    }
    setCurrencyModalVisible(false);
  };

  const networkSelected = ({id}: NetworkSelectionProps) => {
    setNetworkValue(id);
    setNetworkModalVisible(false);
  };

  const _setIsTokenAddress = () => {
    setIsTokenAddress(!isTokenAddress);
    if (!isTokenAddress) {
      const isSelectedEvmCurrencyOption = SupportedEvmCurrencyOptions.find(
        ({chain}) => {
          return chain === selectedCurrency.chain;
        },
      );
      const currencyAbbreviation = isSelectedEvmCurrencyOption
        ? selectedCurrency.currencyAbbreviation
        : SupportedEvmCurrencyOptions[0].currencyAbbreviation;
      const chain = isSelectedEvmCurrencyOption
        ? selectedCurrency.chain
        : SupportedEvmCurrencyOptions[0].chain;
      currencyChainSelected(currencyAbbreviation, chain, true);
    } else {
      currencyChainSelected(
        selectedCurrency.chain,
        selectedCurrency.chain,
        false,
      );
    }
  };

  // Flat list
  const renderTokenItem = useCallback(
    ({item}: {item: CurrencySelectionItem}) => (
      <TokenSelectionRow
        token={item}
        onToggle={_setSelectedToken}
        key={item.id}
        hideCheckbox={true}
        hideArrow={true}
        badgeUri={item.badgeUri}
      />
    ),
    [],
  );

  const renderItem = useCallback(
    ({item}: {item: SupportedCurrencyOption | SupportedChainOption}) => (
      <CurrencySelectionRow
        currency={item as CurrencySelectionItem}
        onToggle={(currencyAbbreviaton, chain) =>
          currencyChainSelected(currencyAbbreviaton, chain, isTokenAddress)
        }
        key={item.id}
        hideCheckbox={true}
      />
    ),
    [isTokenAddress],
  );

  const renderNetworkItem = useCallback(
    ({item}: {item: {id: string; name: string}}) => (
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
    navigation.navigate('ScanRoot', {
      onScanComplete: address => {
        setValue('address', address, {shouldDirty: true});
        processAddress(address);
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
        contact.tokenAddress,
      );
      setValue('address', contact.address!, {shouldDirty: true});
      setValue('name', contact.name || '');
      setValue('email', contact.email);
      setValue('chain', contact.chain!);
      setValue('destinationTag', contact.tag || contact.destinationTag);
    }
  }, [contact]);

  return (
    <Container>
      <ScrollContainer keyboardShouldPersistTaps="handled">
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
                    const trimmedValue = newValue.trim();
                    onChange(trimmedValue);
                    processAddress(trimmedValue);
                  }}
                  error={errors.address?.message}
                  value={value}
                  paddingRight={38}
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
            <Label>{isTokenAddress ? t('NETWORK') : t('CURRENCY')}</Label>
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
                {isTokenAddress ? (
                  <Row style={{alignItems: 'center'}}>
                    {selectedChain ? (
                      <View>
                        <CurrencyImage img={selectedChain.img} size={30} />
                      </View>
                    ) : null}
                    <CurrencyName>
                      {selectedChain?.chain?.toUpperCase()}
                    </CurrencyName>
                  </Row>
                ) : (
                  <Row style={{alignItems: 'center'}}>
                    {selectedCurrency ? (
                      <View>
                        <CurrencyImage
                          img={selectedCurrency.img}
                          badgeUri={selectedCurrency.badgeUri}
                          size={30}
                        />
                      </View>
                    ) : null}
                    <CurrencyName>
                      {selectedCurrency?.currencyAbbreviation?.toUpperCase()}
                    </CurrencyName>
                  </Row>
                )}
                <WalletIcons.DownToggle />
              </Row>
            </CurrencyContainer>
          </CurrencySelectorContainer>
        ) : null}

        {!contact && isTokenAddress ? (
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
                  <CurrencyTitleColumn>
                    <CurrencyName>{selectedToken?.currencyName}</CurrencyName>
                    <CurrencySubTitle>
                      {formatCurrencyAbbreviation(
                        selectedToken.currencyAbbreviation,
                      )}
                    </CurrencySubTitle>
                  </CurrencyTitleColumn>
                </Row>
                <WalletIcons.DownToggle />
              </Row>
            </CurrencyContainer>
          </CurrencySelectorContainer>
        ) : null}

        {!contact ? (
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
        ) : null}

        <ActionContainer>
          <Button onPress={onSubmit}>
            {contact ? t('Save Contact') : t('Add Contact')}
          </Button>
        </ActionContainer>
      </ScrollContainer>
      <SheetModal
        isVisible={currencyModalVisible}
        onBackdropPress={() => setCurrencyModalVisible(false)}>
        <CurrencySelectionModalContainer>
          <TextAlign align={'center'} style={{paddingBottom: 20}}>
            <H4>
              {isTokenAddress ? t('Select a Network') : t('Select a Coin')}
            </H4>
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
            data={allTokenOptions.filter(t => t.chain === selectedChain.chain)}
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
