import {Platform} from 'react-native';
import {ShortcutItem} from 'react-native-quick-actions';

export const ShortcutList: Array<ShortcutItem> = [
  {
    type: 'buy',
    title: 'Buy Crypto',
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
    title: 'Receive',
    icon:
      Platform.OS === 'ios' ? 'ReceiveCrypto' : 'ic_shortcut_receive_crypto',
    userInfo: {url: ''},
  },
  {
    type: 'send',
    title: 'Send',
    icon: Platform.OS === 'ios' ? 'SendCrypto' : 'ic_shortcut_send_crypto',
    userInfo: {url: ''},
  },
  {
    type: 'share',
    title: 'Share App',
    icon: Platform.OS === 'ios' ? 'Share' : 'ic_shortcut_share_app',
    userInfo: {url: ''},
  },
];
