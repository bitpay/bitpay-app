import React, {useState, useLayoutEffect, useEffect} from 'react';
import {yupResolver} from '@hookform/resolvers/yup';
import yup from '../../../../lib/yup';
import styled from 'styled-components/native';
import {Controller, useForm} from 'react-hook-form';
import Button from '../../../../components/button/Button';
import BoxInput from '../../../../components/form/BoxInput';
import {HeaderTitle} from '../../../../components/styled/Text';
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
import {findContact} from '../../../../utils/helper-methods';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import {ContactsScreens, ContactsGroupParamList} from '../ContactsGroup';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
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

  const contacts = useAppSelector(({CONTACT}: RootState) => CONTACT.list);
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const [validAddress, setValidAddress] = useState(false);
  const [xrpValidAddress, setXrpValidAddress] = useState(false);
  const [addressValue, setAddressValue] = useState('');
  const [coinValue, setCoinValue] = useState('');
  const [chainValue, setChainValue] = useState('');
  const [networkValue, setNetworkValue] = useState('');

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
    coin: string,
    network: string,
    chain: string,
  ) => {
    setValidAddress(true);
    setAddressValue(address);
    setCoinValue(coin);
    setChainValue(chain);
    setNetworkValue(network);
    setXrpValidAddress(chain === 'xrp');
  };
  const processAddress = (address: string) => {
    if (address) {
      const coinAndNetwork = GetCoinAndNetwork(address);
      if (coinAndNetwork) {
        const isValid = ValidateCoinAddress(
          address,
          coinAndNetwork.coin,
          coinAndNetwork.network,
        );
        if (isValid) {
          setValidValues(
            address,
            coinAndNetwork.coin,
            coinAndNetwork.network,
            coinAndNetwork.coin,
          );
        } else {
          const isValidTest = ValidateCoinAddress(
            address,
            coinAndNetwork.coin,
            'testnet',
          );
          if (isValidTest) {
            setValidValues(
              address,
              coinAndNetwork.coin,
              'testnet',
              coinAndNetwork.coin,
            );
          }
        }
      } else {
        setAddressValue('');
        setCoinValue('');
        setChainValue('');
        setNetworkValue('');
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

    contact.coin = coinValue;
    contact.chain = chainValue;
    contact.network = networkValue;

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
      processAddress(contact.address!!);
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

        <ActionContainer>
          <Button onPress={onSubmit}>
            {contact ? t('Save Contact') : t('Add Contact')}
          </Button>
        </ActionContainer>
      </ScrollContainer>
    </Container>
  );
};

export default ContactsAdd;
