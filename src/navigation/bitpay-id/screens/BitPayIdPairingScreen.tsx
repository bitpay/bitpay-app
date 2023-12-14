import {CommonActions} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback} from 'react';
import {RootStacks} from '../../../Root';
import {AppEffects} from '../../../store/app';
import {TabsScreens} from '../../tabs/TabsStack';
import {useAppDispatch} from '../../../utils/hooks';
import {BitpayIdScreens, BitpayIdGroupParamList} from '../BitpayIdGroup';
import BasePairing from '../components/BasePairing';

export type BitPayIdPairingScreenParamList =
  | {
      secret?: string;
      code?: string;
      redirect?: string;
    }
  | undefined;

const BitPayIdPairingScreen = (
  props: NativeStackScreenProps<
    BitpayIdGroupParamList,
    BitpayIdScreens.PAIRING
  >,
) => {
  const dispatch = useAppDispatch();
  const {navigation, route} = props;
  const {secret, code, redirect} = route.params || {};

  const onSuccess = useCallback(() => {
    let handled = false;

    if (redirect) {
      handled = dispatch(AppEffects.incomingLink(redirect));
    }

    if (!handled) {
      navigation.replace('BitPayIdProfile');
    }
  }, [navigation, redirect]);

  const onFailure = () => {
    navigation.dispatch(
      CommonActions.reset({
        routes: [
          {
            name: RootStacks.TABS,
            params: {
              screen: TabsScreens.SETTINGS,
            },
          },
        ],
      }),
    );
  };

  return (
    <BasePairing
      secret={secret}
      code={code}
      onSuccess={onSuccess}
      onFailure={onFailure}
    />
  );
};

export default BitPayIdPairingScreen;
