import {t} from 'i18next';
import {Effect} from '../../..';
import {sleep} from '../../../../utils/helper-methods';
import {
  dismissBottomNotificationModal,
  showBottomNotificationModal,
} from '../../../app/app.actions';

export const showWalletError =
  (type?: string, coin?: string): Effect =>
  async dispatch => {
    let title, message: string;
    switch (type) {
      case 'walletNotSupported':
        title = t('Wallet not supported');
        message = t(
          'The selected wallet is currently not supported to use this feature.',
        );
        break;
      case 'walletNotSupportedToBuy':
        title = t('Wallet not supported');
        message = t(
          'The selected wallet is currently not supported for buying cryptocurrencies',
        );
        break;
      case 'noSpendableFunds':
        title = t('No spendable balance');
        message = t(
          'The selected wallet does not have enough spendable funds available to use this feature. Make sure you do not have funds locked by pending transaction proposals.',
        );
        break;
      case 'needsBackup':
        title = t('Needs backup');
        message = t(
          'The key of the selected wallet needs backup before being able to receive funds',
        );
        break;
      case 'walletNotCompleted':
        title = t('Incomplete Wallet');
        message = t(
          'The selected wallet needs to be complete before being able to receive funds',
        );
        break;
      case 'noWalletsAbleToBuy':
        title = t('No wallets');
        message = coin
          ? t('No coin wallets available to receive funds.', {
              coin: coin.toUpperCase(),
            })
          : t('No wallets available to receive funds.');
        break;
      case 'keysNoSupportedWallet':
        title = t('Not supported wallets');
        message = coin
          ? t('Your keys do not have wallets able to buy crypto', {
              coin: coin.toUpperCase(),
            })
          : t('Your keys do not have supported wallets able to buy crypto');
        break;
      case 'emptyKeyList':
        title = t('No keys with supported wallets');
        message = t(
          'There are no keys with wallets able to receive funds. Remember to backup your keys before using this feature.',
        );
        break;
      default:
        title = t('Error');
        message = t('Unknown Error');
        break;
    }
    await sleep(1000);
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title,
        message,
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('OK'),
            action: () => {
              dispatch(dismissBottomNotificationModal());
            },
            primary: true,
          },
        ],
      }),
    );
  };
