import React, {useLayoutEffect} from 'react';
import {HeaderTitle} from '../../../components/styled/Text';
import {useNavigation} from '@react-navigation/native';
import styled from 'styled-components/native';
import {StackScreenProps} from '@react-navigation/stack';
import {WalletStackParamList} from '../WalletStack';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import {Controller, useForm} from 'react-hook-form';
import {yupResolver} from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {useAppDispatch} from '../../../utils/hooks';
import {titleCasing} from '../../../utils/helper-methods';
import {ScreenGutter} from '../../../components/styled/Containers';
import {
  updateKeyName,
  updateWalletName,
} from '../../../store/wallet/wallet.actions';

type UpdateKeyOrWalletNameScreenProps = StackScreenProps<
  WalletStackParamList,
  'UpdateKeyOrWalletName'
>;

const UpdateContainer = styled.View`
  flex: 1;
  padding: 0 ${ScreenGutter};
`;

const FormContainer = styled.View`
  margin-top: 20px;
`;

const ButtonContainer = styled.View`
  margin-top: 40px;
`;

const schema = yup.object().shape({
  name: yup.string().max(15).trim(),
});

const UpdateKeyOrWalletName: React.FC<UpdateKeyOrWalletNameScreenProps> = ({
  route,
}) => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const {key, wallet, context} = route.params;
  const {walletName, walletId} = wallet || {};
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>Update {titleCasing(context)} Name</HeaderTitle>
      ),
    });
  }, [navigation]);

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<{name: string}>({resolver: yupResolver(schema)});

  const placeholder = context === 'key' ? key.keyName : walletName;

  const updateName = ({name}: {name: string}) => {
    if (context === 'key') {
      dispatch(updateKeyName({keyId: key.id, name}));
    } else {
      walletId && dispatch(updateWalletName({keyId: key.id, walletId, name}));
    }
    navigation.goBack();
  };

  return (
    <UpdateContainer>
      <FormContainer>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              placeholder={context === 'key' ? 'My Key' : 'My Wallet'}
              label={`${context.toUpperCase()} NAME`}
              onBlur={onBlur}
              onChangeText={(text: string) => onChange(text)}
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
          Update
        </Button>
      </ButtonContainer>
    </UpdateContainer>
  );
};

export default UpdateKeyOrWalletName;
