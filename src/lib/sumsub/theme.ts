// SumSub SDK theme customization.
// See https://docs.sumsub.com/docs/plugins-customization and
// docs/sumsub-theme-customization.md for the platform-specific font mechanics.
// Colors accept a single value or a { light, dark } pair, in #RRGGBBAA or 0xAARRGGBB.

export interface SumSubColor {
  light: string;
  dark: string;
}

export interface SumSubFontAsset {
  name: string;
  file: string;
}

export interface SumSubFonts {
  assets: SumSubFontAsset[];
  headline1: {name: string};
  headline2: {name: string};
  subtitle1: {name: string};
  subtitle2: {name: string};
  caption: {name: string};
  body: {name: string};
}

export interface SumSubTheme {
  universal: {
    fonts: SumSubFonts;
    colors: Record<string, string | SumSubColor>;
    metrics: Record<string, number>;
  };
}

export const sumSubTheme: SumSubTheme = {
  universal: {
    // Fonts reference Archivo by name. iOS resolves it from the OS-registered
    // fonts (verified via a Courier diagnostic), ignoring `assets`. Android loads
    // it from res/raw via `assets[].file`: the SDK strips the extension, replaces
    // '/'→'_', drops '-', and lowercases, so 'archivo_bold.ttf' → res/raw/
    // archivo_bold.ttf (getIdentifier(name,"raw") + ResourcesCompat.getFont).
    fonts: {
      assets: [
        {name: 'Archivo-Bold', file: 'archivo_bold.ttf'},
        {name: 'Archivo-Medium', file: 'archivo_medium.ttf'},
        {name: 'Archivo-Regular', file: 'archivo_regular.ttf'},
      ],
      headline1: {name: 'Archivo-Bold'},
      headline2: {name: 'Archivo-Bold'},
      subtitle1: {name: 'Archivo-Medium'},
      subtitle2: {name: 'Archivo-Medium'},
      caption: {name: 'Archivo-Regular'},
      body: {name: 'Archivo-Regular'},
    },
    colors: {
      // TODO(design): confirm final values. navigationBarItem set to the neutral
      // icon color; alertTint still a red placeholder pending design.
      navigationBarItem: {light: '#434D5A', dark: '#E1E4E7'},
      alertTint: '#FF000080',
      backgroundCommon: {light: '#FFFFFF', dark: '#000000'},
      contentLink: {light: '#2240C4', dark: '#4989FF'},
      contentNeutral: {light: '#434D5A', dark: '#E1E4E7'},
      primaryButtonContent: '#FFFFFFFF',
      primaryButtonContentDisabled: '#FFFFFF80',
      primaryButtonContentHighlighted: '#FFFFFFFF',
      secondaryButtonContent: {light: '#2240C4FF', dark: '#335CFFFF'},
      secondaryButtonContentDisabled: {light: '#2240C480', dark: '#335CFF80'},
      secondaryButtonContentHighlighted: {
        light: '#335CFFFF',
        dark: '#335CFFFF',
      },
      primaryButtonBackground: '#2240C4FF',
      primaryButtonBackgroundDisabled: '#2240C480',
      primaryButtonBackgroundHighlighted: '#335CFFFF',
      secondaryButtonBackground: {light: '#2240C480', dark: '#335CFFFF'},
      secondaryButtonBackgroundDisabled: {
        light: '#2240C480',
        dark: '#335CFF80',
      },
      secondaryButtonBackgroundHighlighted: {
        light: '#335CFFFF',
        dark: '#335CFFFF',
      },
    },
    metrics: {
      bottomSheetCornerRadius: 12,
      buttonCornerRadius: 6,
    },
  },
};
