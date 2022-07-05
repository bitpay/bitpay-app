import {t} from 'i18next';

interface ItemProps {
  name: string;
  isoCode: string;
}

export const LanguageList: Array<ItemProps> = [
  {
    name: t('Dutch'),
    isoCode: 'nl',
  },
  {
    name: t('English'),
    isoCode: 'en',
  },
  {
    name: t('Spanish'),
    isoCode: 'es',
  },
  {
    name: t('French'),
    isoCode: 'fr',
  },
  {
    name: t('Japanese'),
    isoCode: 'ja',
  },
  {
    name: t('German'),
    isoCode: 'de',
  },
  {
    name: t('Portuguese'),
    isoCode: 'pt',
  },
  {
    name: t('Russian'),
    isoCode: 'ru',
  },
  {
    name: t('Chinese'),
    isoCode: 'zh',
  },
];
