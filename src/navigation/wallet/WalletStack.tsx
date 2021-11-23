import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import Backup from './screens/Backup';
import RecoveryPhrase, {RecoveryPhraseProps} from './screens/RecoveryPhrase';
import VerifyPhrase, {VerifyPhraseProps} from './screens/VerifyPhrase';
import SelectAssets from './screens/SelectAssets';

export type WalletStackParamList = {
  SelectAssets: undefined;
  BackupWallet: {keyId: string};
  RecoveryPhrase: RecoveryPhraseProps;
  VerifyPhrase: VerifyPhraseProps;
};

export enum WalletScreens {
  SELECT_ASSETS = 'SelectAssets',
  BACKUP_WALLET = 'BackupWallet',
  RECOVERY_PHRASE = 'RecoveryPhrase',
  VERIFY_PHRASE = 'VerifyPhrase',
}

const Wallet = createStackNavigator<WalletStackParamList>();

const WalletStack = () => {
  return (
    <Wallet.Navigator
      screenOptions={{...baseNavigatorOptions, ...baseScreenOptions}}
      initialRouteName={WalletScreens.BACKUP_WALLET}>
      <Wallet.Screen
        options={{
          gestureEnabled: false,
        }}
        name={WalletScreens.SELECT_ASSETS}
        component={SelectAssets}
      />
      <Wallet.Screen
        options={{
          gestureEnabled: false,
          headerLeft: () => null,
        }}
        name={WalletScreens.BACKUP_WALLET}
        component={Backup}
      />
      <Wallet.Screen
        options={{
          gestureEnabled: false,
          headerLeft: () => null,
        }}
        name={WalletScreens.RECOVERY_PHRASE}
        component={RecoveryPhrase}
      />
      <Wallet.Screen
        options={{
          gestureEnabled: false,
          headerLeft: () => null,
        }}
        name={WalletScreens.VERIFY_PHRASE}
        component={VerifyPhrase}
      />
    </Wallet.Navigator>
  );
};

export default WalletStack;
