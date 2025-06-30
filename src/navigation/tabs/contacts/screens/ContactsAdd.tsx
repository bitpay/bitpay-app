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
import styled from 'styled-components/native';
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
} from '../../../../components/styled/Containers';
import {
  IsValidEVMAddress,
  IsValidSVMAddress,
  ValidateCoinAddress,
} from '../../../../store/wallet/utils/validations';
import {GetCoinAndNetwork} from '../../../../store/wallet/effects/address/address';
import {ContactRowProps} from '../../../../components/list/ContactRow';
import {useNavigation} from '@react-navigation/core';
import {RootState} from '../../../../store';
import {
  createContact,
  updateContact,
} from '../../../../store/contact/contact.actions';
import SuccessIcon from '../../../../../assets/img/success.svg';
import ScanSvg from '../../../../../assets/img/onboarding/scan.svg';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {
  keyExtractor,
  findContact,
  getBadgeImg,
  getChainFromTokenByAddressKey,
} from '../../../../utils/helper-methods';
import {CurrencySelectionItem} from '../../../../components/list/CurrencySelectionRow';
import NetworkSelectionRow, {
  NetworkSelectionProps,
} from '../../../../components/list/NetworkSelectionRow';
import {LightBlack, NeutralSlate, Slate} from '../../../../styles/colors';
import WalletIcons from '../../../wallet/components/WalletIcons';
import {BitpaySupportedTokens} from '../../../../constants/currencies';
import {BitpaySupportedTokenOptsByAddress} from '../../../../constants/tokens';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import {ContactsScreens, ContactsGroupParamList} from '../ContactsGroup';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  SupportedCurrencyOption,
  SupportedChainsOptions,
  SupportedTokenOptions,
  SupportedCoinsOptions,
} from '../../../../constants/SupportedCurrencyOptions';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

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
  padding: 0 10px;
`;

const ScanButtonContainer = styled(TouchableOpacity)``;

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

const CurrencyContainer = styled(TouchableOpacity)`
  background: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
  padding: 0 20px 0 10px;
  height: 55px;
  border: 0.75px solid ${({theme}) => (theme.dark ? LightBlack : Slate)};
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
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
  notes: yup.string().trim(),
});

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

  const contacts = useAppSelector(({CONTACT}: RootState) => CONTACT.list);
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const [validAddress, setValidAddress] = useState(false);
  const [xrpValidAddress, setXrpValidAddress] = useState(false);

  const [addressValue, setAddressValue] = useState('');
  const [tokenAddressValue, setTokenAddressValue] = useState<
    string | undefined
  >();
  const [networkValue, setNetworkValue] = useState('');

  const [networkModalVisible, setNetworkModalVisible] = useState(false);

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
        const chain = getChainFromTokenByAddressKey(k);
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

    if (findContact(contacts, addressValue)) {
      setError('address', {
        type: 'manual',
        message: t('Contact already exists'),
      });
      return;
    }

    if (IsValidEVMAddress(addressValue)) {
      contact.notes = 'EVM compatible address\n';
    }

    if (IsValidSVMAddress(addressValue)) {
      contact.notes = 'Solana address\n';
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

  const networkSelected = ({id}: NetworkSelectionProps) => {
    setNetworkValue(id);
    setNetworkModalVisible(false);
  };

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
                maxLength={50}
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
                  suffix={() =>
                    addressValue && dirtyFields.address ? (
                      <AddressBadge>
                        <SuccessIcon />
                      </AddressBadge>
                    ) : (
                      <ScanButtonContainer onPress={goToScan}>
                        <ScanSvg />
                      </ScanButtonContainer>
                    )
                  }
                />
              )}
              name="address"
              defaultValue=""
            />
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
          <CurrencySelectorContainer hideSelector={!isDev || !xrpValidAddress}>
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
