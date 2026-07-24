import React, {useLayoutEffect} from 'react';
import {HeaderTitle} from '../../../components/styled/Text';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView, ScrollView, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {WalletGroupParamList} from '../WalletGroup';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import {Controller, useForm} from 'react-hook-form';
import {yupResolver} from '@hookform/resolvers/yup';
import yup from '../../../lib/yup';
import {useAppDispatch} from '../../../utils/hooks';
import {titleCasing} from '../../../utils/helper-methods';
import {ScreenGutter} from '../../../components/styled/Containers';
import {
  updateKeyName,
  updateWalletName,
  updateAccountName,
} from '../../../store/wallet/wallet.actions';
import {useTranslation} from 'react-i18next';

type UpdateKeyOrWalletNameScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  'UpdateKeyOrWalletName'
>;

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  updateContainer: {
    flex: 1,
  },
  scrollContainer: {
    marginTop: 20,
    paddingHorizontal: gutter,
  },
  formContainer: {
    marginTop: 20,
  },
  buttonContainer: {
    marginTop: 40,
  },
});

const UpdateContainer: React.FC<React.ComponentProps<typeof SafeAreaView>> = ({
  style,
  ...rest
}) => <SafeAreaView style={[styles.updateContainer, style]} {...rest} />;

const ScrollContainer: React.FC<React.ComponentProps<typeof ScrollView>> = ({
  style,
  ...rest
}) => <ScrollView style={[styles.scrollContainer, style]} {...rest} />;

const FormContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.formContainer, style]} {...rest} />;

const ButtonContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.buttonContainer, style]} {...rest} />;

const schema = yup.object().shape({
  name: yup.string().max(40).trim().required(),
});

const UpdateKeyOrWalletName: React.FC<UpdateKeyOrWalletNameScreenProps> = ({
  route,
}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const {key, wallet, accountItem, context} = route.params;
  const {walletName, walletId} = wallet || {};
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>
          {t('Update Name', {context: titleCasing(context)})}
        </HeaderTitle>
      ),
    });
  }, [navigation, t, context]);

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<{name: string}>({resolver: yupResolver(schema)});

  const setPlaceholderName = (context: string) => {
    switch (context) {
      case 'key':
        return key.keyName;
      case 'wallet':
        return walletName;
      case 'account':
        return accountItem?.accountName;
      default:
        return '';
    }
  };

  const placeholder = setPlaceholderName(context);

  const updateName = ({name}: {name: string}) => {
    if (context === 'key') {
      dispatch(updateKeyName({keyId: key.id, name}));
    } else if (context === 'wallet') {
      walletId && dispatch(updateWalletName({keyId: key.id, walletId, name}));
    } else if (context === 'account' && accountItem?.receiveAddress) {
      dispatch(
        updateAccountName({
          keyId: key.id,
          name,
          accountAddress: accountItem.receiveAddress,
        }),
      );
    }
    navigation.goBack();
  };

  return (
    <UpdateContainer>
      <ScrollContainer>
        <FormContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                placeholder={
                  context === 'key'
                    ? t('My Key')
                    : context === 'wallet'
                    ? t('My Wallet')
                    : t('My Account')
                }
                label={context.toUpperCase() + t(' NAME')}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.name?.message}
                value={value}
                onSubmitEditing={handleSubmit(updateName)}
              />
            )}
            name="name"
            defaultValue={placeholder}
          />
        </FormContainer>
        <ButtonContainer>
          <Button onPress={handleSubmit(updateName)} buttonStyle={'primary'}>
            {t('Update')}
          </Button>
        </ButtonContainer>
      </ScrollContainer>
    </UpdateContainer>
  );
};

export default UpdateKeyOrWalletName;
