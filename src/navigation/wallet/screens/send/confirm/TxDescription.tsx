import {useTheme} from '../../../../../contexts';
import React, {useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, TextInput, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {Hr, ImportTextInput} from '../../../../../components/styled/Containers';
import {H7} from '../../../../../components/styled/Text';
import {
  Action,
  Black,
  LightBlack,
  LuckySevens,
  NeutralSlate,
  Slate,
  Slate30,
  White,
} from '../../../../../styles/colors';
import CheckSvg from '../../../../../../assets/img/check.svg';
import ClearSvg from '../../../../../../assets/img/clear.svg';
import ClearDarkSvg from '../../../../../../assets/img/clear-dark.svg';
import PencilSvg from '../../../../../../assets/img/pencil.svg';
import PencilDarkSvg from '../../../../../../assets/img/pencil-dark.svg';
import {sleep} from '../../../../../utils/helper-methods';

const txDescriptionBorderRadius = 4;
const txDescriptionBorderWidth = 1;
const txDescriptionInputHeight = 72;

interface TxDescriptionColor {
  dark: string;
  light: string;
}
interface TxDescriptionColors {
  border: TxDescriptionColor;
  unfocusedBorder: TxDescriptionColor;
  focusedInputBg: TxDescriptionColor;
  unfocusedInputBg: TxDescriptionColor;
  inputEditModeFont: TxDescriptionColor;
  inputNonEditModeFont: TxDescriptionColor;
}
const txDescriptionColors: TxDescriptionColors = {
  border: {
    dark: LuckySevens,
    light: Slate30,
  },
  unfocusedBorder: {
    dark: Black,
    light: Slate30,
  },
  focusedInputBg: {
    dark: 'transparent',
    light: '#fafbff',
  },
  unfocusedInputBg: {
    dark: LightBlack,
    light: NeutralSlate,
  },
  inputEditModeFont: {
    dark: White,
    light: Black,
  },
  inputNonEditModeFont: {
    dark: Slate,
    light: '#6a727d',
  },
};

const getTxDescriptionColor = (
  name: keyof TxDescriptionColors,
  isDark: boolean,
) => {
  const color = txDescriptionColors[name];
  return isDark ? color.dark : color.light;
};

const getTxDescriptionInputColor = (
  {hasFocus, isEditMode, isEmpty}: TxDescriptionInputContainerParams,
  darkTheme: boolean,
) => {
  if (hasFocus) {
    return getTxDescriptionColor('focusedInputBg', darkTheme);
  }
  return isEditMode || isEmpty
    ? 'transparent'
    : getTxDescriptionColor('unfocusedInputBg', darkTheme);
};

const getTxDescriptionBorderColor = (
  {hasFocus, isEditMode, isEmpty}: TxDescriptionInputContainerParams,
  darkTheme: boolean,
) => {
  return hasFocus || isEditMode || isEmpty
    ? getTxDescriptionColor('border', darkTheme)
    : getTxDescriptionColor('unfocusedBorder', darkTheme);
};

export interface TxDescriptionInputContainerParams {
  hasFocus?: boolean;
  isEmpty?: boolean;
  isEditMode?: boolean;
}

const txDescriptionOuterButtonHeight =
  txDescriptionInputHeight + txDescriptionBorderWidth * 2;
const styles = StyleSheet.create({
  row: {marginTop: 10, marginBottom: 20},
  container: {flexDirection: 'row', marginTop: 9},
  input: {
    flex: 1,
    borderWidth: 0,
    borderTopRightRadius: 0,
    borderTopLeftRadius: txDescriptionBorderRadius,
    fontSize: 12,
    fontWeight: '500',
    padding: 12,
  },
  inputContainer: {
    flexGrow: 1,
    borderWidth: txDescriptionBorderWidth,
    borderTopLeftRadius: txDescriptionBorderRadius,
    flexDirection: 'row',
  },
  outerButtonContainer: {
    borderWidth: txDescriptionBorderWidth,
    borderLeftWidth: 0,
    borderTopRightRadius: txDescriptionBorderRadius,
    height: txDescriptionOuterButtonHeight,
    width: 39,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerButton: {
    height: txDescriptionOuterButtonHeight,
    width: 39,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonContainer: {
    height: txDescriptionInputHeight,
    width: 33,
    justifyContent: 'center',
  },
});

export const TxDescription = ({
  txDescription,
  onChange,
}: {
  txDescription: string;
  onChange: (txDescription: string) => void;
}) => {
  const {t} = useTranslation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [draftTxDescription, setDraftTxDescription] = useState(txDescription);
  const theme = useTheme();
  const inputParams = {
    hasFocus,
    isEmpty: !draftTxDescription,
    isEditMode,
  };
  const inputBackgroundColor = getTxDescriptionInputColor(
    inputParams,
    theme.dark,
  );
  const borderColor = getTxDescriptionBorderColor(inputParams, theme.dark);
  const inputRef = useRef<TextInput>(null);
  const save = () => {
    setIsEditMode(false);
    onChange(draftTxDescription);
    inputRef.current?.blur();
  };
  return (
    <>
      <View style={styles.row}>
        <H7>{t('Tx Description')}</H7>
        <View style={styles.container}>
          <View
            style={[
              styles.inputContainer,
              {
                borderColor,
                borderBottomColor: hasFocus ? Action : borderColor,
                borderTopRightRadius:
                  isEditMode || draftTxDescription
                    ? 0
                    : txDescriptionBorderRadius,
                borderRightWidth:
                  !draftTxDescription && !isEditMode
                    ? txDescriptionBorderWidth
                    : 0,
              },
            ]}>
            <ImportTextInput
              style={[
                styles.input,
                {
                  backgroundColor: inputBackgroundColor,
                  color: getTxDescriptionColor(
                    isEditMode ? 'inputEditModeFont' : 'inputNonEditModeFont',
                    theme.dark,
                  ),
                  height:
                    !hasFocus && !draftTxDescription
                      ? 40
                      : txDescriptionInputHeight,
                },
              ]}
              editable={isEditMode || !draftTxDescription}
              multiline
              numberOfLines={3}
              selectTextOnFocus={false}
              value={draftTxDescription}
              onChangeText={text => {
                setDraftTxDescription(text);
                if (text) {
                  setIsEditMode(true);
                }
              }}
              ref={inputRef}
              onFocus={() => setHasFocus(true)}
              onBlur={() => {
                setHasFocus(false);
                if (!draftTxDescription) {
                  onChange('');
                  setIsEditMode(false);
                }
              }}
            />
            {draftTxDescription && isEditMode ? (
              <View
                style={[
                  styles.clearButtonContainer,
                  {backgroundColor: inputBackgroundColor},
                ]}>
                <TouchableOpacity
                  onPress={() => {
                    setDraftTxDescription('');
                    onChange('');
                    inputRef.current?.focus();
                  }}>
                  {theme.dark ? <ClearDarkSvg /> : <ClearSvg />}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          {draftTxDescription || isEditMode ? (
            <View
              style={[
                styles.outerButtonContainer,
                {
                  backgroundColor: isEditMode || theme.dark ? Action : White,
                  borderColor: isEditMode ? Action : borderColor,
                },
              ]}>
              {isEditMode ? (
                <TouchableOpacity
                  style={styles.outerButton}
                  onPress={async () => {
                    save();
                    // Prevent refocus after delayed autocorrect
                    await sleep(300);
                    save();
                  }}>
                  <CheckSvg width={14} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.outerButton}
                  onPress={async () => {
                    setIsEditMode(true);
                    await sleep(0);
                    inputRef.current?.focus();
                  }}>
                  {theme.dark ? <PencilDarkSvg /> : <PencilSvg />}
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>
      </View>
      <Hr />
    </>
  );
};
