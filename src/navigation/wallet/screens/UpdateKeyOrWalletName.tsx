import React, {useLayoutEffect} from 'react';
import {HeaderTitle} from '../../../components/styled/Text';
import {useNavigation} from '@react-navigation/native';
import styled from 'styled-components/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {WalletStackParamList} from '../WalletStack';
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
} from '../../../store/wallet/wallet.actions';
import {useTranslation} from 'react-i18next';

type UpdateKeyOrWalletNameScreenProps = NativeStackScreenProps<
  WalletStackParamList,
  'UpdateKeyOrWalletName'
>;

const UpdateContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollContainer = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const FormContainer = styled.View`
  margin-top: 20px;
`;

const ButtonContainer = styled.View`
  margin-top: 40px;
`;

const schema = yup.object().shape({
  name: yup.string().max(15).trim().required(),
});

const UpdateKeyOrWalletName: React.FC<UpdateKeyOrWalletNameScreenProps> = ({
  route,
}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const {key, wallet, context} = route.params;
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
      <ScrollContainer>
        <FormContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                placeholder={context === 'key' ? t('My Key') : t('My Wallet')}
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
