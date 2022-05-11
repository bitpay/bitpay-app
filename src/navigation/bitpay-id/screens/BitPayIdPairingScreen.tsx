import {StackScreenProps} from '@react-navigation/stack';
import React, {useCallback} from 'react';
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

  const onComplete = useCallback(() => {
    navigation.replace('Profile');
  }, [navigation]);

  return <BasePairing secret={secret} code={code} onComplete={onComplete} />;
};

export default BitPayIdPairingScreen;
