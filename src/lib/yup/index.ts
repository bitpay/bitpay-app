import {t} from 'i18next';
import * as yup from 'yup';

/**
 * Override the default error messages with localized values.
 * Using a function so that values are dynamically fetched at runtime.
 */
yup.setLocale({
  mixed: {
    required: () => t('Required'),
  },
  string: {
    email: () => t('Please enter a valid email address.'),
    min: params => t('MustBeGreaterThanArgCharacters', {0: params.min}),
    max: params => t('MustBeLessThanArgCharacters', {0: params.max}),
  },
});

/**
 * Re-export yup from here so that setLocale is run before creating any schemas.
 */
export default yup;
