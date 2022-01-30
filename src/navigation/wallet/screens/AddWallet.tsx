import React, {useLayoutEffect} from 'react';
import {HeaderTitle} from '../../../components/styled/Text';
import {CommonActions, useNavigation, useTheme} from '@react-navigation/native';
import styled from 'styled-components/native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {ScreenGutter} from '../../../components/styled/Containers';
import {useDispatch} from 'react-redux';
import {StackScreenProps} from '@react-navigation/stack';
import {WalletStackParamList} from '../WalletStack';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {dismissOnGoingProcessModal} from '../../../store/app/app.actions';
import {addWallet} from '../../../store/wallet/effects';
import {Network} from '../../../constants';
import {Controller, useForm} from 'react-hook-form';
import {yupResolver} from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {buildUIFormattedWallet} from './KeyOverview';

type AddWalletScreenProps = StackScreenProps<WalletStackParamList, 'AddWallet'>;

export type AddWalletParamList = {
  currencyAbbreviation: string;
  currencyName: string;
  key: Key;
};

const CreateWalletContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const ButtonContainer = styled.View`
  margin: 20% 0;
`;

const schema = yup.object().shape({
  customName: yup.string(),
});

const AddWallet: React.FC<AddWalletScreenProps> = ({route}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {currencyAbbreviation, currencyName, key} = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>Create {currencyAbbreviation} Wallet</HeaderTitle>
      ),
    });
  }, [navigation]);
  const theme = useTheme();
  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<{customName: string}>({resolver: yupResolver(schema)});

  const add = handleSubmit(async ({customName}) => {
    try {
      await dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.ADDING_WALLET),
      );

      const wallet = (await dispatch<any>(
        addWallet({
          key,
          currency: currencyAbbreviation.toLowerCase(),
          options: {
            network: Network.testnet,
            customName: customName === currencyName ? undefined : customName,
          },
        }),
      )) as Wallet;

      navigation.dispatch(
        CommonActions.reset({
          index: 2,
          routes: [
            {
              name: 'Tabs',
              params: {screen: 'Home'},
            },
            {
              name: 'Wallet',
              params: {screen: 'KeyOverview', params: {key}},
            },
            {
              name: 'Wallet',
              params: {
                screen: 'WalletDetails',
                params: {wallet: buildUIFormattedWallet(wallet)},
              },
            },
          ],
        }),
      );
    } catch (err) {
      // TODO
      console.error(err);
    } finally {
      dispatch(dismissOnGoingProcessModal());
    }
  });

  return (
    <CreateWalletContainer>
      <ScrollView>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              theme={theme}
              placeholder={`${currencyAbbreviation} Wallet`}
              label={'WALLET NAME'}
              onBlur={onBlur}
              onChangeText={(text: string) => onChange(text)}
              error={errors.customName?.message}
              value={value}
            />
          )}
          name="customName"
          defaultValue={`${currencyName}`}
        />
        <ButtonContainer>
          <Button onPress={add} buttonStyle={'primary'}>
            Add Wallet
          </Button>
        </ButtonContainer>
      </ScrollView>
    </CreateWalletContainer>
  );
};

export default AddWallet;
