import {showBottomNotificationModal} from '../../store/app/app.actions';
import {keyBackupRequired} from '../../navigation/tabs/home/components/Crypto';
import {useAppDispatch, useAppSelector} from '../../utils/hooks';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {
  isOnboardingKeyPending,
  showOnboardingKeyPendingToast,
} from '../../store/app/onboardingKey.effects';

export const useRequireKeyAndWalletRedirect = (cta: () => void) => {
  const {t} = useTranslation();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const onboardingKeyStatus = useAppSelector(
    ({APP}) => APP.onboardingKeyStatus,
  );
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  return () => {
    if (isOnboardingKeyPending(onboardingKeyStatus)) {
      showOnboardingKeyPendingToast();
      return;
    }
    const allKeys = Object.values(keys);
    const backedUpKey = allKeys.find(key => key.backupComplete);
    const hasWallet = !!allKeys.find(key => key.wallets);

    if (allKeys.length) {
      if (!backedUpKey) {
        const keyToBackup = allKeys.find(key => !key.backupComplete)!;
        dispatch(
          showBottomNotificationModal(
            keyBackupRequired(keyToBackup, navigation, dispatch),
          ),
        );
        return;
      }

      if (!hasWallet) {
        dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: t('Wallet required'),
            message: t(
              'To continue you will need to add a wallet to your key.',
            ),
            enableBackdropDismiss: true,
            actions: [
              {
                text: t('Add wallet'),
                action: () => {
                  navigation.navigate('AddingOptions', {key: backedUpKey});
                },
                primary: true,
              },
              {
                text: t('maybe later'),
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
          title: t('Key and wallet required'),
          message: t(
            'To continue you will need to create a key and add a wallet.',
          ),
          enableBackdropDismiss: true,
          actions: [
            {
              text: t('Continue'),
              action: () => {
                navigation.navigate('CreationOptions');
              },
              primary: true,
            },
            {
              text: t('maybe later'),
              action: () => {},
              primary: false,
            },
          ],
        }),
      );
    }
  };
};
