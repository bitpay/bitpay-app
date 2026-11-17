import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {BaseText} from '../styled/Text';
import {useBackupColors} from './colors';
import {Caution} from '../../styles/colors';

export type PhraseCellTone =
  | 'word'
  | 'hidden'
  | 'blank'
  | 'active'
  | 'filled'
  | 'right'
  | 'wrong';

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 12,
  },
  number: {fontSize: 12, minWidth: 16, textAlign: 'right'},
  content: {flex: 1, minWidth: 0},
  word: {fontSize: 16, fontWeight: '500'},
});

export const PhraseCell = ({
  n,
  tone,
  input,
  onPress,
  children,
  accessibilityLabel,
}: {
  n: number;
  tone: PhraseCellTone;
  input?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
  accessibilityLabel?: string;
}) => {
  const colors = useBackupColors();
  const look = {
    word: {bg: colors.surfaceMuted, border: 'transparent'},
    hidden: {bg: colors.surfaceMuted, border: 'transparent'},
    blank: {bg: colors.screenBg, border: colors.inputBorder},
    active: {bg: colors.inputFocusBg, border: colors.inputBorder},
    filled: {bg: colors.rowSelectedBg, border: colors.rowSelectedBorder},
    right: {bg: colors.surfaceSuccess, border: colors.gain},
    wrong: {bg: colors.inputErrorBg, border: Caution},
  }[tone];
  const focused = tone === 'active';
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.cell,
        {
          backgroundColor: look.bg,
          borderColor: look.border,
          borderStyle: tone === 'blank' ? 'dashed' : 'solid',
          borderWidth: focused ? 0.75 : 1.5,
          borderBottomWidth: focused ? 2 : 1.5,
          borderBottomColor: focused ? colors.inputFocusBorder : look.border,
          borderRadius: input ? 0 : 8,
          borderTopLeftRadius: input ? 4 : 8,
          borderTopRightRadius: input ? 4 : 8,
        },
      ]}>
      <BaseText style={[styles.number, {color: colors.textDescription}]}>
        {n}
      </BaseText>
      {typeof children === 'string' ? (
        <BaseText
          numberOfLines={1}
          style={[
            styles.word,
            styles.content,
            tone === 'hidden' ? {color: colors.textDescription} : null,
          ]}>
          {children}
        </BaseText>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </Pressable>
  );
};
