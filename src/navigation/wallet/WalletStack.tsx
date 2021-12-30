import React, {useState} from 'react';
import {createStackNavigator, TransitionPresets} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import Backup from './screens/Backup';
import RecoveryPhrase, {RecoveryPhraseProps} from './screens/RecoveryPhrase';
import VerifyPhrase, {VerifyPhraseProps} from './screens/VerifyPhrase';
import SelectAssets from './screens/SelectAssets';
import WalletOverview from './screens/WalletOverview';
import {WalletObj} from '../../store/wallet/wallet.models';
import {useTheme} from '@react-navigation/native';
import {Black, Grey, SlateDark, White} from '../../styles/colors';
import Back from '../../components/back/Back';
import Settings from '../../components/settings/Settings';
import WalletOptionsBottomPopupModal from './components/WalletOptionsBottomPopupModal';
import WalletSettings from './screens/WalletSettings';
import SelectWalletType from './screens/SelectWalletType';
import {HeaderTitle} from '../../components/styled/Text';
import {StyleProp, TextStyle} from 'react-native';
import ImportWallet, {ImportWalletProps} from './screens/ImportWallet';

export type WalletStackParamList = {
  SelectAssets: undefined;
  BackupWallet: {keyId: string};
  RecoveryPhrase: RecoveryPhraseProps;
  VerifyPhrase: VerifyPhraseProps;
  WalletOverview: {wallet: WalletObj};
  WalletSettings: {wallet: WalletObj};
  SelectWalletType: undefined;
  ImportWallet: ImportWalletProps;
};

export enum WalletScreens {
  SELECT_ASSETS = 'SelectAssets',
  BACKUP_WALLET = 'BackupWallet',
  RECOVERY_PHRASE = 'RecoveryPhrase',
  VERIFY_PHRASE = 'VerifyPhrase',
  WALLET_OVERVIEW = 'WalletOverview',
  WALLET_SETTINGS = 'WalletSettings',
  SELECT_WALLET_TYPE = 'SelectWalletType',
  IMPORT_WALLET = 'ImportWallet',
}

const Wallet = createStackNavigator<WalletStackParamList>();

const WalletStack = () => {
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [wallet, setWallet] = useState<WalletObj | null>(null);

  return (
    <>
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
        <Wallet.Screen
          options={({route}) => ({
            headerStyle: {
              backgroundColor: theme.dark ? Black : Grey,
            },
            headerBackImage: () => {
              const props = {
                color: theme.dark ? White : SlateDark,
                background: theme.dark ? SlateDark : White,
                opacity: 1,
              };
              return <Back {...props} />;
            },
            headerRight: () => (
              <Settings
                onPress={() => {
                  setWallet(route.params.wallet);
                  setShowWalletOptions(true);
                }}
              />
            ),
          })}
          name={WalletScreens.WALLET_OVERVIEW}
          component={WalletOverview}
        />
        <Wallet.Screen
          options={{
            headerShown: false,
            ...TransitionPresets.ModalPresentationIOS,
          }}
          name={WalletScreens.WALLET_SETTINGS}
          component={WalletSettings}
        />
        <Wallet.Screen
          options={{
            gestureEnabled: false,
            headerTitle: () => (
              <HeaderTitle style={textStyle}>Select Wallet Type</HeaderTitle>
            ),
          }}
          name={WalletScreens.SELECT_WALLET_TYPE}
          component={SelectWalletType}
        />
        <Wallet.Screen
          options={{
            gestureEnabled: false,
            headerTitle: () => (
              <HeaderTitle style={textStyle}>Import Wallete</HeaderTitle>
            ),
          }}
          name={WalletScreens.IMPORT_WALLET}
          component={ImportWallet}
        />
      </Wallet.Navigator>

      {wallet && (
        <WalletOptionsBottomPopupModal
          isVisible={showWalletOptions}
          wallet={wallet}
          onBackdropPress={() => setShowWalletOptions(false)}
        />
      )}
    </>
  );
};

export default WalletStack;
