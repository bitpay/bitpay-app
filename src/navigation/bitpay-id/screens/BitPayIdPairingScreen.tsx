import {CommonActions} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useCallback} from 'react';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../tabs/TabsStack';
import {BitpayIdScreens, BitpayIdStackParamList} from '../BitpayIdStack';
import BasePairing from '../components/BasePairing';

export type BitPayIdPairingScreenParamList =
  | {
      secret?: string;
      code?: string;
    }
  | undefined;

const BitPayIdPairingScreen: React.FC<
  StackScreenProps<BitpayIdStackParamList, BitpayIdScreens.PAIRING>
> = props => {
  const {navigation, route} = props;
  const {secret, code} = route.params || {};

  const onSuccess = useCallback(() => {
    navigation.replace('Profile');
  }, [navigation]);

  const onFailure = () => {
    // navigation.dispatch(
    //   CommonActions.reset({
    //     routes: [
    //       {
    //         name: RootStacks.TABS,
    //         params: {
    //           screen: TabsScreens.SETTINGS,
    //         },
    //       },
    //     ],
    //   }),
    // );
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
