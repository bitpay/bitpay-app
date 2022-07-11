import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

import * as translationEN from './locales/en/translation.json';
import * as translationNL from './locales/nl/translation.json';
import * as translationES from './locales/es/translation.json';
import * as translationFR from './locales/fr/translation.json';
import * as translationJA from './locales/ja/translation.json';
import * as translationDE from './locales/de/translation.json';
import * as translationPT from './locales/pt/translation.json';
import * as translationRU from './locales/ru/translation.json';
import * as translationZH from './locales/zh/translation.json';

const detectedLanguage = RNLocalize.getLocales()[0].languageCode;
const resources = {
  en: {
    translation: translationEN,
  },
  nl: {
    translation: translationNL,
  },
  es: {
    translation: translationES,
  },
  fr: {
    translation: translationFR,
  },
  ja: {
    translation: translationJA,
  },
  de: {
    translation: translationDE,
  },
  pt: {
    translation: translationPT,
  },
  ru: {
    translation: translationRU,
  },
  zh: {
    translation: translationZH,
  },
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    compatibilityJSON: 'v3',
    lng: detectedLanguage,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
