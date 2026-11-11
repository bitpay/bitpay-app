import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {BaseText} from '../styled/Text';
import Button from '../button/Button';
import {useBackupColors} from './colors';
import {CheckGlyph} from './glyphs';

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 30,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {fontSize: 25, lineHeight: 34, fontWeight: '700', textAlign: 'center'},
  message: {fontSize: 16, lineHeight: 25, textAlign: 'center'},
  footer: {paddingHorizontal: 12, paddingTop: 12},
});

export const ResultView = ({
  title,
  message,
  primary,
  onPrimary,
}: {
  title: string;
  message: string;
  primary: string;
  onPrimary: () => void;
}) => {
  const colors = useBackupColors();
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.circle, {backgroundColor: colors.iconButtonBg}]}>
          <CheckGlyph color={colors.iconButtonGlyph} size={24} />
        </View>
        <BaseText accessibilityRole="header" style={styles.title}>
          {title}
        </BaseText>
        <BaseText style={[styles.message, {color: colors.textDescription}]}>
          {message}
        </BaseText>
      </ScrollView>
      <View style={styles.footer}>
        <Button onPress={onPrimary}>{primary}</Button>
      </View>
    </SafeAreaView>
  );
};
