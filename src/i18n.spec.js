jest.unmock('i18next');

const loadI18n = languageCode => {
  jest.resetModules();
  jest.doMock('react-native-localize', () => ({
    getLocales: () => [{languageCode}],
  }));
  return require('../i18n').default;
};

describe('i18n lazy translations', () => {
  it('bundles only English and the detected language at startup', () => {
    const i18n = loadI18n('de');

    expect(i18n.hasResourceBundle('en', 'translation')).toBe(true);
    expect(i18n.hasResourceBundle('de', 'translation')).toBe(true);
    expect(i18n.hasResourceBundle('fr', 'translation')).toBe(false);
    expect(i18n.t('Not enough funds')).toBe('Nicht genügend Guthaben');
  });

  it('loads a language the first time the app switches to it', async () => {
    const i18n = loadI18n('en');
    expect(i18n.hasResourceBundle('fr', 'translation')).toBe(false);

    await i18n.changeLanguage('fr');

    expect(i18n.hasResourceBundle('fr', 'translation')).toBe(true);
    expect(i18n.t('Not enough funds')).toBe('Fonds insuffisants');
  });

  it('falls back to English for an unsupported device language', () => {
    const i18n = loadI18n('it');

    expect(i18n.t('Not enough funds')).toBe('Not enough funds');
  });
});
