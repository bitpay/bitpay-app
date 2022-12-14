import {t} from 'i18next';
import {ShortcutItem} from 'react-native-quick-actions';

export const ShortcutList: Array<ShortcutItem> = [
  // TODO icons
  {
    type: 'buy',
    title: t('Buy Crypto'),
    icon: 'ic_music',
    userInfo: {url: ''},
  },
  {
    type: 'swap',
    title: t('Exchange'),
    icon: 'ic_music',
    userInfo: {url: ''},
  },
  {
    type: 'send',
    title: t('Send'),
    icon: 'ic_music',
    userInfo: {url: ''},
  },
  {
    type: 'receive',
    title: t('Receive'),
    icon: 'ic_music',
    userInfo: {url: ''},
  },
  {
    type: 'share',
    title: t('Share App'),
    icon: 'ic_music',
    userInfo: {url: ''},
  },
];
