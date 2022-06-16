import React, {useCallback} from 'react';
import styled from 'styled-components/native';
import {Caution} from '../../../styles/colors';
import {BaseText, ImportTitle} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';
import {
  showBottomNotificationModal,
  dismissOnGoingProcessModal,
  setHomeCarouselConfig,
} from '../../../store/app/app.actions';
import {yupResolver} from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {useForm, Controller} from 'react-hook-form';
import BoxInput from '../../../components/form/BoxInput';
import {KeyOptions, Status} from '../../../store/wallet/wallet.models';
import {useNavigation, useRoute, CommonActions} from '@react-navigation/native';
import {
  ActiveOpacity,
  CtaContainer as _CtaContainer,
  HeaderContainer,
  ScanContainer,
} from '../../../components/styled/Containers';
import {
  startJoinMultisig,
  addWalletJoinMultisig,
  getDecryptPassword,
} from '../../../store/wallet/effects';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {sleep} from '../../../utils/helper-methods';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import ScanSvg from '../../../../assets/img/onboarding/scan.svg';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {
  CustomErrorMessage,
  WrongPasswordError,
} from '../components/ErrorMessages';
import {useAppDispatch} from '../../../utils/hooks';
import {useTranslation} from 'react-i18next';

export type JoinMultisigParamList = {
  key?: Key;
  invitationCode?: string;
};

const schema = yup.object().shape({
  myName: yup.string().required(),
  invitationCode: yup
    .string()
    .required()
    .matches(/^[0-9A-HJ-NP-Za-km-z]{70,80}$/, 'Invalid invitation code'),
});

const Gutter = '10px';
export const JoinContainer = styled.View`
  padding: ${Gutter} 0;
`;

const ScrollViewContainer = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  padding: 5px 0 0 10px;
`;

const CtaContainer = styled(_CtaContainer)`
  padding: 10px 0;
`;

const JoinMultisig = () => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'JoinMultisig'>>();
  const {key, invitationCode} = route.params || {};

  const {
    control,
    handleSubmit,
    setValue,
    formState: {errors},
  } = useForm({resolver: yupResolver(schema)});

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const onSubmit = (formData: {invitationCode: string; myName: string}) => {
    const {invitationCode, myName} = formData;
    let opts: Partial<KeyOptions> = {};
    opts.invitationCode = invitationCode;
    opts.myName = myName;

    JoinMultisigWallet(opts);
  };

  const JoinMultisigWallet = async (
    opts: Partial<KeyOptions>,
  ): Promise<void> => {
    try {
      if (key) {
        if (key.isPrivKeyEncrypted) {
          opts.password = await dispatch(getDecryptPassword(key));
        }

        dispatch(startOnGoingProcessModal(OnGoingProcessMessages.JOIN_WALLET));

        const wallet = (await dispatch<any>(
          addWalletJoinMultisig({
            key,
            opts,
          }),
        )) as Wallet;

        wallet.getStatus(
          {network: wallet.network},
          async (err: any, status: Status) => {
            if (err) {
              navigation.dispatch(
                CommonActions.reset({
                  index: 1,
                  routes: [
                    {
                      name: 'Tabs',
                      params: {screen: 'Home'},
                    },
                    {
                      name: 'Wallet',
                      params: {screen: 'KeyOverview', params: {id: key.id}},
                    },
                  ],
                }),
              );
            } else if (status.wallet && status.wallet.status === 'complete') {
              wallet.openWallet({}, () => {
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
                        params: {screen: 'KeyOverview', params: {id: key.id}},
                      },
                      {
                        name: 'Wallet',
                        params: {
                          screen: 'WalletDetails',
                          params: {walletId: wallet.id, key},
                        },
                      },
                    ],
                  }),
                );
              });
            } else {
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
                      params: {screen: 'KeyOverview', params: {id: key.id}},
                    },
                    {
                      name: 'Wallet',
                      params: {
                        screen: 'Copayers',
                        params: {wallet: wallet, status: status.wallet},
                      },
                    },
                  ],
                }),
              );
            }
            dispatch(dismissOnGoingProcessModal());
          },
        );
      } else {
        dispatch(startOnGoingProcessModal(OnGoingProcessMessages.JOIN_WALLET));

        const multisigKey = (await dispatch<any>(
          startJoinMultisig(opts),
        )) as Key;

        dispatch(setHomeCarouselConfig({id: multisigKey.id, show: true}));

        navigation.navigate('Wallet', {
          screen: 'BackupKey',
          params: {context: 'createNewKey', key: multisigKey},
        });
        dispatch(dismissOnGoingProcessModal());
      }
    } catch (e: any) {
      dispatch(dismissOnGoingProcessModal());
      if (e.message === 'invalid password') {
        dispatch(showBottomNotificationModal(WrongPasswordError()));
      } else {
        await sleep(500);
        await showErrorMessage(
          CustomErrorMessage({
            errMsg: BWCErrorMessage(e),
            title: t('Uh oh, something went wrong'),
          }),
        );
      }
      return;
    }
  };

  return (
    <ScrollViewContainer>
      <JoinContainer>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              label={t('YOUR NAME')}
              onChangeText={(text: string) => onChange(text)}
              onBlur={onBlur}
              value={value}
            />
          )}
          name="myName"
          defaultValue=""
        />

        {errors?.myName?.message && (
          <ErrorText>{errors?.myName?.message}</ErrorText>
        )}

        <HeaderContainer>
          <ImportTitle>{t('Wallet invitation')}</ImportTitle>

          <ScanContainer
            activeOpacity={ActiveOpacity}
            onPress={() =>
              navigation.navigate('Scan', {
                screen: 'Root',
                params: {
                  onScanComplete: data => {
                    setValue('invitationCode', data, {
                      shouldValidate: true,
                    });
                  },
                },
              })
            }>
            <ScanSvg />
          </ScanContainer>
        </HeaderContainer>

        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              onChangeText={(text: string) => onChange(text)}
              onBlur={onBlur}
              value={value}
            />
          )}
          name="invitationCode"
          defaultValue={invitationCode}
        />

        {errors?.invitationCode?.message && (
          <ErrorText>{errors?.invitationCode?.message}</ErrorText>
        )}

        <CtaContainer>
          <Button buttonStyle={'primary'} onPress={handleSubmit(onSubmit)}>
            {t('Join')}
          </Button>
        </CtaContainer>
      </JoinContainer>
    </ScrollViewContainer>
  );
};

export default JoinMultisig;
