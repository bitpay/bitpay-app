import {useTheme} from '../../contexts';
import {
  Action,
  Air,
  Black,
  Caution,
  Grey,
  LightBlack,
  LightBlue,
  LinkBlue,
  LuckySevens,
  Midnight,
  NeutralSlate,
  ProgressBlue,
  Slate,
  Slate30,
  SlateDark,
  Success25,
  White,
} from '../../styles/colors';

export const useBackupColors = () => {
  const {dark} = useTheme();
  return {
    dark,
    textPrimary: dark ? White : Black,
    surfaceMuted: dark ? LightBlack : NeutralSlate,
    surfaceAccent: dark ? Midnight : LightBlue,
    surfaceSuccess: Success25,
    surfaceCard: dark ? LightBlack : White,
    surfacePill: dark ? Midnight : Air,
    textPill: dark ? White : Action,
    rowSelectedBg: dark ? Midnight : LightBlue,
    rowSelectedBorder: dark ? '#2240C440' : Action,
    textDescription: dark ? Air : SlateDark,
    textSubtle: dark ? Slate30 : SlateDark,
    textLink: dark ? LinkBlue : Action,
    textPlaceholder: Slate,
    iconButtonBg: dark ? Midnight : LightBlue,
    iconButtonGlyph: dark ? LinkBlue : Action,
    tagText: dark ? White : SlateDark,
    tagBorder: dark ? White : Slate30,
    inputBorder: dark ? LuckySevens : Slate,
    inputFocusBg: dark ? 'transparent' : '#fafbff',
    inputFocusBorder: ProgressBlue,
    inputErrorBg: dark ? '#090304' : '#EF476F0A',
    borderCard: dark ? LightBlack : Slate30,
    gain: '#004D27',
    progressTrack: Grey,
    keyCardBg: dark ? '#111111' : White,
    sheetBg: dark ? LightBlack : White,
    screenBg: dark ? Black : White,
    caution: Caution,
  };
};

export type BackupColors = ReturnType<typeof useBackupColors>;
