import {createStackScreenOptions} from './headerHelpers';

describe('createStackScreenOptions', () => {
  const theme = {
    colors: {
      background: '#ffffff',
      text: '#000000',
    },
  };

  it('keeps custom headers in normal layout flow without a duplicate top inset', () => {
    const options = createStackScreenOptions(theme, 34);

    expect(options.headerTransparent).toBe(false);
    expect(options.contentStyle).toEqual({paddingBottom: 34});
    expect(options.contentStyle).not.toHaveProperty('paddingTop');
    expect(options.header).toEqual(expect.any(Function));
  });

  it('preserves header colors and alignment', () => {
    const options = createStackScreenOptions(theme, 0);

    expect(options.headerStyle).toEqual({backgroundColor: '#ffffff'});
    expect(options.headerTintColor).toBe('#000000');
    expect(options.headerTitleAlign).toBe('center');
    expect(options.headerShadowVisible).toBe(false);
  });
});
