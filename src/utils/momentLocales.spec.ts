import moment from 'moment';
import './momentLocales';

describe('momentLocales', () => {
  it('registers the app languages and leaves the global locale on English', () => {
    expect(moment.locale()).toBe('en');
    expect(moment.locales()).toEqual(
      expect.arrayContaining([
        'en',
        'de',
        'es',
        'fr',
        'ja',
        'nl',
        'pt',
        'ru',
        'zh-cn',
      ]),
    );
  });

  it('formats month names in a registered locale', () => {
    const march = moment.utc('2026-03-15');
    expect(march.clone().locale('de').format('MMMM')).toBe('März');
    expect(march.clone().locale('zh-cn').format('MMMM')).toBe('三月');
    expect(march.format('MMMM')).toBe('March');
  });

  it('does not register locales the app has no translations for', () => {
    expect(moment.locales()).not.toContain('it');
  });
});
