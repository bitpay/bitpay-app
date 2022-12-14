import {ShortcutItem} from 'react-native-quick-actions';

export const ShortcutList: Array<ShortcutItem> = [
  {
    type: 'buy',
    title: 'Buy Crypto',
    icon: 'BuyCrypto',
    userInfo: {url: ''},
  },
  {
    type: 'swap',
    title: 'Exchange',
    icon: 'SwapCrypto',
    userInfo: {url: ''},
  },
  {
    type: 'receive',
    title: 'Receive',
    icon: 'ReceiveCrypto',
    userInfo: {url: ''},
  },
  {
    type: 'send',
    title: 'Send',
    icon: 'SendCrypto',
    userInfo: {url: ''},
  },
  {
    type: 'share',
    title: 'Share App',
    icon: 'Share',
    userInfo: {url: ''},
  },
];
