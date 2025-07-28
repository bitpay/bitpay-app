import {useTheme} from '@react-navigation/native';
import React, {useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {TextInput} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import styled from 'styled-components/native';
import {Hr, ImportTextInput} from '../../../../../components/styled/Containers';
import {H7} from '../../../../../components/styled/Text';
import {
  Action,
  Black,
  LightBlack,
  LuckySevens,
  NeutralSlate,
  Slate,
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
    light: '#e1e4e7',
  },
  unfocusedBorder: {
    dark: Black,
    light: '#e1e4e7',
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

const TxDescriptionRow = styled.View`
  margin: 10px 0 20px;
`;

const TxDescriptionContainer = styled.View`
  flex-direction: row;
  margin-top: 9px;
`;

const TxDescriptionInput = styled(
  ImportTextInput,
)<TxDescriptionInputContainerParams>`
  flex: 1;
  background-color: ${({isEditMode, hasFocus, isEmpty, theme}) =>
    getTxDescriptionInputColor({hasFocus, isEditMode, isEmpty}, theme.dark)};
  border: 0;
  border-top-right-radius: 0;
  border-top-left-radius: ${txDescriptionBorderRadius}px;
  font-size: 12px;
  font-weight: 500;
  padding: 12px;
  color: ${({isEditMode, theme}) =>
    isEditMode
      ? getTxDescriptionColor('inputEditModeFont', theme.dark)
      : getTxDescriptionColor('inputNonEditModeFont', theme.dark)};
  height: ${({hasFocus, isEmpty}) =>
    !hasFocus && isEmpty ? 40 : txDescriptionInputHeight}px;
`;

const TxDescriptionInputContainer = styled.View<TxDescriptionInputContainerParams>`
  flex-grow: 1;
  border-color: ${({hasFocus, isEditMode, isEmpty, theme}) =>
    getTxDescriptionBorderColor({hasFocus, isEditMode, isEmpty}, theme.dark)};
  border-width: ${txDescriptionBorderWidth}px;
  border-top-left-radius: ${txDescriptionBorderRadius}px;
  border-top-right-radius: ${({isEditMode, isEmpty}) =>
    isEditMode || !isEmpty ? 0 : txDescriptionBorderRadius}px;
  border-bottom-color: ${({hasFocus, isEditMode, isEmpty, theme}) =>
    hasFocus
      ? Action
      : getTxDescriptionBorderColor(
          {hasFocus, isEditMode, isEmpty},
          theme.dark,
        )};
  border-right-width: ${({isEmpty, isEditMode}) =>
    isEmpty && !isEditMode ? txDescriptionBorderWidth : 0}px;
  flex-direction: row;
`;

const txDescriptionOuterButtonHeight =
  txDescriptionInputHeight + txDescriptionBorderWidth * 2;
const TxDescriptionOuterButtonContainer = styled.View<TxDescriptionInputContainerParams>`
  background-color: ${({isEditMode, theme}) =>
    isEditMode || theme.dark ? Action : White};
  border-color: ${({isEditMode, hasFocus, isEmpty, theme}) =>
    isEditMode
      ? Action
      : getTxDescriptionBorderColor(
          {hasFocus, isEditMode, isEmpty},
          theme.dark,
        )};
  border-width: ${txDescriptionBorderWidth}px;
  border-left-width: 0;
  border-top-right-radius: ${txDescriptionBorderRadius}px;
  height: ${txDescriptionOuterButtonHeight}px;
  width: 39px;
  justify-content: center;
  align-items: center;
`;

const TxDescriptionOuterButton = styled(TouchableOpacity)`
  height: ${txDescriptionOuterButtonHeight}px;
  width: 39px;
  justify-content: center;
  align-items: center;
`;

const TxDescriptionClearButtonContainer = styled.View<TxDescriptionInputContainerParams>`
  height: ${txDescriptionInputHeight}px;
  width: 33px;
  background-color: ${({hasFocus, isEditMode, isEmpty, theme}) =>
    getTxDescriptionInputColor({hasFocus, isEditMode, isEmpty}, theme.dark)}
  justify-content: center;
`;

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
  const inputRef = useRef<TextInput>(null);
  const save = () => {
    setIsEditMode(false);
    onChange(draftTxDescription);
    inputRef.current?.blur();
  };
  return (
    <>
      <TxDescriptionRow>
        <H7>{t('Tx Description')}</H7>
        <TxDescriptionContainer>
          <TxDescriptionInputContainer
            hasFocus={hasFocus}
            isEmpty={!draftTxDescription}
            isEditMode={isEditMode}>
            <TxDescriptionInput
              hasFocus={hasFocus}
              isEditMode={isEditMode}
              isEmpty={!draftTxDescription}
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
              <TxDescriptionClearButtonContainer
                hasFocus={hasFocus}
                isEditMode={isEditMode}
                isEmpty={!draftTxDescription}>
                <TouchableOpacity
                  onPress={() => {
                    setDraftTxDescription('');
                    onChange('');
                    inputRef.current?.focus();
                  }}>
                  {theme.dark ? <ClearDarkSvg /> : <ClearSvg />}
                </TouchableOpacity>
              </TxDescriptionClearButtonContainer>
            ) : null}
          </TxDescriptionInputContainer>
          {draftTxDescription || isEditMode ? (
            <TxDescriptionOuterButtonContainer isEditMode={isEditMode}>
              {isEditMode ? (
                <TxDescriptionOuterButton
                  onPress={async () => {
                    save();
                    // Prevent refocus after delayed autocorrect
                    await sleep(300);
                    save();
                  }}>
                  <CheckSvg width={14} />
                </TxDescriptionOuterButton>
              ) : (
                <TxDescriptionOuterButton
                  onPress={async () => {
                    setIsEditMode(true);
                    await sleep(0);
                    inputRef.current?.focus();
                  }}>
                  {theme.dark ? <PencilDarkSvg /> : <PencilSvg />}
                </TxDescriptionOuterButton>
              )}
            </TxDescriptionOuterButtonContainer>
          ) : null}
        </TxDescriptionContainer>
      </TxDescriptionRow>
      <Hr />
    </>
  );
};
