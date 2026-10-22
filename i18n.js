import 'intl-pluralrules';
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

import * as translationEN from './locales/en/translation.json';

// Only English (the fallback) is bundled up front. Every other language is
// required the first time it is needed, so startup parses one or two
// translation files instead of all nine (~2 MB of JSON).
const translationLoaders = {
  nl: () => require('./locales/nl/translation.json'),
  es: () => require('./locales/es/translation.json'),
  fr: () => require('./locales/fr/translation.json'),
  ja: () => require('./locales/ja/translation.json'),
  de: () => require('./locales/de/translation.json'),
  pt: () => require('./locales/pt/translation.json'),
  ru: () => require('./locales/ru/translation.json'),
  zh: () => require('./locales/zh/translation.json'),
};

export const loadTranslation = language =>
  language === 'en' ? translationEN : translationLoaders[language]?.();

// Synchronous backend: i18next asks it for any language not in `resources`,
// e.g. when the user picks a new language in settings.
const lazyTranslationBackend = {
  type: 'backend',
  init() {},
  read(language, _namespace, callback) {
    try {
      callback(null, loadTranslation(language) ?? {});
    } catch (error) {
      callback(error, null);
    }
  },
};

const detectedLanguage = RNLocalize.getLocales()[0].languageCode;
const resources = {en: {translation: translationEN}};
const detectedTranslation = loadTranslation(detectedLanguage);
if (detectedLanguage !== 'en' && detectedTranslation) {
  resources[detectedLanguage] = {translation: detectedTranslation};
}

i18n
  .use(lazyTranslationBackend)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    partialBundledLanguages: true,
    keySeparator: false,
    nsSeparator: false,
    lng: detectedLanguage,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
