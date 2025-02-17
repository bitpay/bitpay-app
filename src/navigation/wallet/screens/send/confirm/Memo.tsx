import {useTheme} from '@react-navigation/native';
import React, {useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {TextInput} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
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

const memoBorderRadius = 4;
const memoBorderWidth = 1;
const memoInputHeight = 72;

interface MemoColor {
  dark: string;
  light: string;
}
interface MemoColors {
  border: MemoColor;
  unfocusedBorder: MemoColor;
  focusedInputBg: MemoColor;
  unfocusedInputBg: MemoColor;
  inputEditModeFont: MemoColor;
  inputNonEditModeFont: MemoColor;
}
const memoColors: MemoColors = {
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

const getMemoColor = (name: keyof MemoColors, isDark: boolean) => {
  const color = memoColors[name];
  return isDark ? color.dark : color.light;
};

const getMemoInputColor = (
  {hasFocus, isEditMode, isEmpty}: MemoInputContainerParams,
  darkTheme: boolean,
) => {
  if (hasFocus) {
    return getMemoColor('focusedInputBg', darkTheme);
  }
  return isEditMode || isEmpty
    ? 'transparent'
    : getMemoColor('unfocusedInputBg', darkTheme);
};

const getMemoBorderColor = (
  {hasFocus, isEditMode, isEmpty}: MemoInputContainerParams,
  darkTheme: boolean,
) => {
  return hasFocus || isEditMode || isEmpty
    ? getMemoColor('border', darkTheme)
    : getMemoColor('unfocusedBorder', darkTheme);
};

export interface MemoInputContainerParams {
  hasFocus?: boolean;
  isEmpty?: boolean;
  isEditMode?: boolean;
}

const MemoRow = styled.View`
  margin: 10px 0 20px;
`;

const MemoContainer = styled.View`
  flex-direction: row;
  margin-top: 9px;
`;

const MemoInput = styled(ImportTextInput)<MemoInputContainerParams>`
  flex: 1;
  background-color: ${({isEditMode, hasFocus, isEmpty, theme}) =>
    getMemoInputColor({hasFocus, isEditMode, isEmpty}, theme.dark)};
  border: 0;
  border-top-right-radius: 0;
  border-top-left-radius: ${memoBorderRadius}px;
  font-size: 12px;
  font-weight: 500;
  padding: 12px;
  color: ${({isEditMode, theme}) =>
    isEditMode
      ? getMemoColor('inputEditModeFont', theme.dark)
      : getMemoColor('inputNonEditModeFont', theme.dark)};
  height: ${({hasFocus, isEmpty}) =>
    !hasFocus && isEmpty ? 40 : memoInputHeight}px;
`;

const MemoInputContainer = styled.View<MemoInputContainerParams>`
  flex-grow: 1;
  border-color: ${({hasFocus, isEditMode, isEmpty, theme}) =>
    getMemoBorderColor({hasFocus, isEditMode, isEmpty}, theme.dark)};
  border-width: ${memoBorderWidth}px;
  border-top-left-radius: ${memoBorderRadius}px;
  border-top-right-radius: ${({isEditMode, isEmpty}) =>
    isEditMode || !isEmpty ? 0 : memoBorderRadius}px;
  border-bottom-color: ${({hasFocus, isEditMode, isEmpty, theme}) =>
    hasFocus
      ? Action
      : getMemoBorderColor({hasFocus, isEditMode, isEmpty}, theme.dark)};
  border-right-width: ${({isEmpty, isEditMode}) =>
    isEmpty && !isEditMode ? memoBorderWidth : 0}px;
  flex-direction: row;
`;

const memoOuterButtonHeight = memoInputHeight + memoBorderWidth * 2;
const MemoOuterButtonContainer = styled.View<MemoInputContainerParams>`
  background-color: ${({isEditMode, theme}) =>
    isEditMode || theme.dark ? Action : White};
  border-color: ${({isEditMode, hasFocus, isEmpty, theme}) =>
    isEditMode
      ? Action
      : getMemoBorderColor({hasFocus, isEditMode, isEmpty}, theme.dark)};
  border-width: ${memoBorderWidth}px;
  border-left-width: 0;
  border-top-right-radius: ${memoBorderRadius}px;
  height: ${memoOuterButtonHeight}px;
  width: 39px;
  justify-content: center;
  align-items: center;
`;

const MemoOuterButton = styled(TouchableOpacity)`
  height: ${memoOuterButtonHeight}px;
  width: 39px;
  justify-content: center;
  align-items: center;
`;

const MemoClearButtonContainer = styled.View<MemoInputContainerParams>`
  height: ${memoInputHeight}px;
  width: 33px;
  background-color: ${({hasFocus, isEditMode, isEmpty, theme}) =>
    getMemoInputColor({hasFocus, isEditMode, isEmpty}, theme.dark)}
  justify-content: center;
`;

export const Memo = ({
  memo,
  onChange,
}: {
  memo: string;
  onChange: (memo: string) => void;
}) => {
  const {t} = useTranslation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [draftMemo, setDraftMemo] = useState(memo);
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const save = () => {
    setIsEditMode(false);
    onChange(draftMemo);
    inputRef.current?.blur();
  };
  return (
    <>
      <MemoRow>
        <H7>{t('Memo')}</H7>
        <MemoContainer>
          <MemoInputContainer
            hasFocus={hasFocus}
            isEmpty={!draftMemo}
            isEditMode={isEditMode}>
            <MemoInput
              hasFocus={hasFocus}
              isEditMode={isEditMode}
              isEmpty={!draftMemo}
              editable={isEditMode || !draftMemo}
              multiline
              numberOfLines={3}
              selectTextOnFocus={false}
              value={draftMemo}
              onChangeText={text => {
                setDraftMemo(text);
                if (text) {
                  setIsEditMode(true);
                }
              }}
              ref={inputRef}
              onFocus={() => setHasFocus(true)}
              onBlur={() => {
                setHasFocus(false);
                if (!draftMemo) {
                  onChange('');
                  setIsEditMode(false);
                }
              }}
            />
            {draftMemo && isEditMode ? (
              <MemoClearButtonContainer
                hasFocus={hasFocus}
                isEditMode={isEditMode}
                isEmpty={!draftMemo}>
                <TouchableOpacity
                  onPress={() => {
                    setDraftMemo('');
                    onChange('');
                    inputRef.current?.focus();
                  }}>
                  {theme.dark ? <ClearDarkSvg /> : <ClearSvg />}
                </TouchableOpacity>
              </MemoClearButtonContainer>
            ) : null}
          </MemoInputContainer>
          {draftMemo || isEditMode ? (
            <MemoOuterButtonContainer isEditMode={isEditMode}>
              {isEditMode ? (
                <MemoOuterButton
                  onPress={async () => {
                    save();
                    // Prevent refocus after delayed autocorrect
                    await sleep(300);
                    save();
                  }}>
                  <CheckSvg width={14} />
                </MemoOuterButton>
              ) : (
                <MemoOuterButton
                  onPress={async () => {
                    setIsEditMode(true);
                    await sleep(0);
                    inputRef.current?.focus();
                  }}>
                  {theme.dark ? <PencilDarkSvg /> : <PencilSvg />}
                </MemoOuterButton>
              )}
            </MemoOuterButtonContainer>
          ) : null}
        </MemoContainer>
      </MemoRow>
      <Hr />
    </>
  );
};
