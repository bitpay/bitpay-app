import {Platform} from 'react-native';
import {t} from 'i18next';
import {ShortcutItem} from 'react-native-quick-actions';

export const getShortcutList = (): Array<ShortcutItem> => [
  {
    type: 'buy',
    title: t('Buy Crypto'),
    icon: Platform.OS === 'ios' ? 'BuyCrypto' : 'ic_shortcut_buy_crypto',
    userInfo: {url: ''},
  },
  {
    type: 'swap',
    title: 'Exchange',
    icon: Platform.OS === 'ios' ? 'SwapCrypto' : 'ic_shortcut_swap_crypto',
    userInfo: {url: ''},
  },
  {
    type: 'receive',
    title: t('Receive'),
    icon:
      Platform.OS === 'ios' ? 'ReceiveCrypto' : 'ic_shortcut_receive_crypto',
    userInfo: {url: ''},
  },
  {
    type: 'send',
    title: t('Send'),
    icon: Platform.OS === 'ios' ? 'SendCrypto' : 'ic_shortcut_send_crypto',
    userInfo: {url: ''},
  },
  {
    type: 'share',
    title: t('Share App'),
    icon: Platform.OS === 'ios' ? 'Share' : 'ic_shortcut_share_app',
    userInfo: {url: ''},
  },
];
