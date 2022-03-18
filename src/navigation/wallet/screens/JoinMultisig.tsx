import React from 'react';
import styled from 'styled-components/native';
import {Caution} from '../../../styles/colors';
import {BaseText} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';
import {useDispatch} from 'react-redux';
import {
  showBottomNotificationModal,
  dismissOnGoingProcessModal,
} from '../../../store/app/app.actions';
import {yupResolver} from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {useForm, Controller} from 'react-hook-form';
import BoxInput from '../../../components/form/BoxInput';
import {useLogger} from '../../../utils/hooks/useLogger';
import {KeyOptions} from '../../../store/wallet/wallet.models';
import {useNavigation, useRoute, CommonActions} from '@react-navigation/native';
import {
  CtaContainer as _CtaContainer,
  ScanContainer as _ScanContainer,
  ActiveOpacity,
} from '../../../components/styled/Containers';
import {
  startJoinMultisig,
  addWalletJoinMultisig,
} from '../../../store/wallet/effects';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {sleep} from '../../../utils/helper-methods';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import ScanSvg from '../../../../assets/img/onboarding/scan.svg';

export type JoinMultisigParamList = {
  key?: Key;
};

const schema = yup.object().shape({
  myName: yup.string().required(),
  invitationCode: yup.string().required(),
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

const InvitationInputContainer = styled.View`
  margin-top: 20px;
`;

const ScanContainer = styled(_ScanContainer)`
  position: absolute;
  right: 10px;
  bottom: 23px;
  z-index: 1;
`;

const CtaContainer = styled(_CtaContainer)`
  padding: 10px 0;
`;

const JoinMultisig = () => {
  const dispatch = useDispatch();
  const logger = useLogger();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'JoinMultisig'>>();
  const {key} = route.params || {};

  const {
    control,
    handleSubmit,
    setValue,
    formState: {errors},
  } = useForm({resolver: yupResolver(schema)});

  // const showJoinWarningModal = (opts: Partial<KeyOptions>) =>
  //   dispatch(
  //     showBottomNotificationModal({
  //       type: 'warning',
  //       title: 'Someone asked you to join a multisig wallet?',
  //       message:
  //         'You are about to join a shared wallet. This is an advanced feature, make sure you understand how multisig wallets work before putting funds in it. If a third party invited you to join, make sure you trust them, if you have purchased cryptocurrency they may be scamming you.',
  //       enableBackdropDismiss: true,
  //       actions: [
  //         {
  //           text: 'OK',
  //           action: () => {
  //             JoinMultisigWallet(opts);
  //           },
  //           primary: true,
  //         },
  //       ],
  //     }),
  //   );

  const showErrorModal = (e: string) => {
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: 'Something went wrong',
        message: e,
        enableBackdropDismiss: true,
        actions: [
          {
            text: 'OK',
            action: () => {},
            primary: true,
          },
        ],
      }),
    );
  };

  const onSubmit = (formData: {invitationCode: string; myName: string}) => {
    const {invitationCode, myName} = formData;

    let opts: Partial<KeyOptions> = {};
    opts.invitationCode = invitationCode;
    opts.myName = myName;

    // TODO showJoinWarningModal(opts);
    JoinMultisigWallet(opts);
  };

  const JoinMultisigWallet = async (
    opts: Partial<KeyOptions>,
  ): Promise<void> => {
    try {
      await dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.JOIN_WALLET),
      );

      if (key) {
        const wallet = (await dispatch<any>(
          addWalletJoinMultisig({
            key,
            opts,
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
                  params: {walletId: wallet.id, key},
                },
              },
            ],
          }),
        );
      } else {
        const key = (await dispatch<any>(startJoinMultisig(opts))) as Key;

        navigation.navigate('Wallet', {
          screen: 'BackupKey',
          params: {context: 'createNewKey', key},
        });
      }

      dispatch(dismissOnGoingProcessModal());
    } catch (e: any) {
      logger.error(e.message);
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      showErrorModal(e.message);
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
              label={'YOUR NAME'}
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

        <InvitationInputContainer>
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

          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                label={'WALLET INVITATION'}
                onChangeText={(text: string) => onChange(text)}
                onBlur={onBlur}
                value={value}
              />
            )}
            name="invitationCode"
            defaultValue=""
          />

          {errors?.invitationCode?.message && (
            <ErrorText>{errors?.invitationCode?.message}</ErrorText>
          )}
        </InvitationInputContainer>

        <CtaContainer>
          <Button buttonStyle={'primary'} onPress={handleSubmit(onSubmit)}>
            Join
          </Button>
        </CtaContainer>
      </JoinContainer>
    </ScrollViewContainer>
  );
};

export default JoinMultisig;
