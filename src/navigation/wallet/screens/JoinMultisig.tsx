import React, {useCallback} from 'react';
import styled from 'styled-components/native';
import {ImportTitle} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';
import {
  showBottomNotificationModal,
  dismissOnGoingProcessModal,
  setHomeCarouselConfig,
} from '../../../store/app/app.actions';
import {yupResolver} from '@hookform/resolvers/yup';
import yup from '../../../lib/yup';
import {useForm, Controller} from 'react-hook-form';
import BoxInput from '../../../components/form/BoxInput';
import {KeyOptions, Status} from '../../../store/wallet/wallet.models';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CommonActions} from '@react-navigation/native';
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
import {fixWalletAddresses, sleep} from '../../../utils/helper-methods';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import ScanSvg from '../../../../assets/img/onboarding/scan.svg';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {
  CustomErrorMessage,
  WrongPasswordError,
} from '../components/ErrorMessages';
import {useAppDispatch} from '../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../../navigation/tabs/TabsStack';

export type JoinMultisigParamList = {
  key?: Key;
  invitationCode?: string;
};

type JoinScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.JOIN_MULTISIG
>;

export const JoinContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollViewContainer = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
`;

const CtaContainer = styled(_CtaContainer)`
  padding: 10px 0;
`;

const JoinMultisig = ({navigation, route}: JoinScreenProps) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const {key, invitationCode} = route.params || {};

  const schema = yup.object().shape({
    myName: yup.string().required().trim(),
    invitationCode: yup
      .string()
      .required()
      .trim()
      .test('valid-invitation-code', t('InvalidInvitationCode'), value => {
        if (!value) {
          return false;
        }
        const partToValidate = value.slice(0, -4); // assuming network + chain is always 4 characters eg Lbtc
        const regex = /^[0-9A-HJ-NP-Za-km-z]{70,80}$/;
        return regex.test(partToValidate);
      }),
  });
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

        dispatch(startOnGoingProcessModal('JOIN_WALLET'));

        const wallet = (await dispatch<any>(
          addWalletJoinMultisig({
            key,
            opts,
          }),
        )) as Wallet;

        dispatch(
          Analytics.track('Join Multisig Wallet success', {
            addedToExistingKey: true,
          }),
        );

        wallet.getStatus(
          {network: wallet.network},
          async (err: any, status: Status) => {
            if (err) {
              navigation.dispatch(
                CommonActions.reset({
                  index: 1,
                  routes: [
                    {
                      name: RootStacks.TABS,
                      params: {screen: TabsScreens.HOME},
                    },
                    {
                      name: WalletScreens.KEY_OVERVIEW,
                      params: {id: key.id},
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
                        name: RootStacks.TABS,
                        params: {screen: TabsScreens.HOME},
                      },
                      {
                        name: WalletScreens.KEY_OVERVIEW,
                        params: {id: key.id},
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
                      name: RootStacks.TABS,
                      params: {screen: TabsScreens.HOME},
                    },
                    {
                      name: WalletScreens.KEY_OVERVIEW,
                      params: {id: key.id},
                    },
                    {
                      name: WalletScreens.COPAYERS,
                      params: {wallet: wallet, status: status.wallet},
                    },
                  ],
                }),
              );
            }
            dispatch(dismissOnGoingProcessModal());
          },
        );
      } else {
        dispatch(startOnGoingProcessModal('JOIN_WALLET'));

        const multisigKey = (await dispatch<any>(
          startJoinMultisig(opts),
        )) as Key;

        dispatch(
          Analytics.track('Join Multisig Wallet success', {
            addedToExistingKey: false,
          }),
        );

        dispatch(setHomeCarouselConfig({id: multisigKey.id, show: true}));

        navigation.navigate('BackupKey', {
          context: 'createNewKey',
          key: multisigKey,
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
    <JoinContainer>
      <ScrollViewContainer>
        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              label={t('YOUR NAME')}
              onChangeText={(text: string) => onChange(text)}
              onBlur={onBlur}
              value={value}
              error={errors.myName?.message}
            />
          )}
          name="myName"
          defaultValue=""
        />

        <HeaderContainer>
          <ImportTitle>{t('Wallet invitation')}</ImportTitle>

          <ScanContainer
            activeOpacity={ActiveOpacity}
            onPress={() => {
              dispatch(
                Analytics.track('Open Scanner', {
                  context: 'JoinMultisig',
                }),
              );
              navigation.navigate('ScanRoot', {
                onScanComplete: data => {
                  setValue('invitationCode', data, {
                    shouldValidate: true,
                  });
                },
              });
            }}>
            <ScanSvg />
          </ScanContainer>
        </HeaderContainer>

        <Controller
          control={control}
          render={({field: {onChange, onBlur, value}}) => (
            <BoxInput
              onChangeText={(text: string) => onChange(text.trim())}
              onBlur={onBlur}
              value={value}
              error={errors.invitationCode?.message}
            />
          )}
          name="invitationCode"
          defaultValue={invitationCode}
        />

        <CtaContainer>
          <Button buttonStyle={'primary'} onPress={handleSubmit(onSubmit)}>
            {t('Join')}
          </Button>
        </CtaContainer>
      </ScrollViewContainer>
    </JoinContainer>
  );
};

export default JoinMultisig;
