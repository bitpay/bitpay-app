import {ShortcutItem} from 'react-native-actions-shortcuts';
import {t} from 'i18next';

export const ShortcutList: Array<ShortcutItem> = [
  // TODO iconName
  {
    type: 'buy',
    title: t('Buy Crypto'),
    iconName: 'ic_music',
  },
  {
    type: 'swap',
    title: t('Exchange'),
    iconName: 'ic_music',
  },
  {
    type: 'send',
    title: t('Send'),
    iconName: 'ic_music',
  },
  {
    type: 'receive',
    title: t('Receive'),
    iconName: 'ic_music',
  },
  {
    type: 'share',
    title: t('Share App'),
    iconName: 'ic_music',
  },
];
