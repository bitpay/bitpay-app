import {showBottomNotificationModal} from '../../store/app/app.actions';
import {keyBackupRequired} from '../../navigation/tabs/home/components/Crypto';
import {useAppDispatch, useAppSelector} from '../../utils/hooks';
import {useNavigation} from '@react-navigation/native';

export const useRequireKeyAndWalletRedirect = (cta: () => void) => {
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  return () => {
    const allKeys = Object.values(keys);
    const backedUpKey = allKeys.find(key => key.backupComplete);
    const hasWallet = !!allKeys.find(key => key.wallets);

    if (allKeys.length) {
      if (!backedUpKey) {
        const keyToBackup = allKeys.find(key => !key.backupComplete)!;
        dispatch(
          showBottomNotificationModal(
            keyBackupRequired(keyToBackup, navigation),
          ),
        );
        return;
      }

      if (!hasWallet) {
        dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: 'Wallet required',
            message: 'To continue you will need to add a wallet to your key.',
            enableBackdropDismiss: true,
            actions: [
              {
                text: 'Add wallet',
                action: () => {
                  navigation.navigate('Wallet', {
                    screen: 'AddingOptions',
                    params: {key: backedUpKey},
                  });
                },
                primary: true,
              },
              {
                text: 'maybe later',
                action: () => {},
                primary: false,
              },
            ],
          }),
        );
        return;
      }

      cta();
    } else {
      dispatch(
        showBottomNotificationModal({
          type: 'warning',
          title: 'Key and wallet required',
          message:
            'To continue you will need to create a key and add a wallet.',
          enableBackdropDismiss: true,
          actions: [
            {
              text: 'Continue',
              action: () => {
                navigation.navigate('Wallet', {screen: 'CreationOptions'});
              },
              primary: true,
            },
            {
              text: 'maybe later',
              action: () => {},
              primary: false,
            },
          ],
        }),
      );
    }
  };
};
