import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {BaseText} from '../styled/Text';
import Button from '../button/Button';
import {useBackupColors} from './colors';
import {BangGlyph, CheckGlyph, CloudGlyph} from './glyphs';
import {Caution, Caution25, Warning, Warning25} from '../../styles/colors';

export type ResultTone = 'warn' | 'error' | 'neutral';
export type ResultIcon = 'bang' | 'cloud' | 'check';

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
  footer: {paddingHorizontal: 12, paddingTop: 12, gap: 4},
});

export const ResultView = ({
  tone,
  icon,
  title,
  message,
  primary,
  onPrimary,
  link,
  onLink,
}: {
  tone: ResultTone;
  icon: ResultIcon;
  title: string;
  message: string;
  primary: string;
  onPrimary: () => void;
  link?: string | null;
  onLink?: () => void;
}) => {
  const colors = useBackupColors();
  const background =
    tone === 'warn'
      ? Warning25
      : tone === 'error'
      ? Caution25
      : colors.iconButtonBg;
  const foreground =
    tone === 'warn'
      ? Warning
      : tone === 'error'
      ? Caution
      : colors.iconButtonGlyph;
  const Glyph =
    icon === 'bang' ? BangGlyph : icon === 'check' ? CheckGlyph : CloudGlyph;
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.circle, {backgroundColor: background}]}>
          <Glyph color={foreground} size={24} />
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
        {link && onLink ? (
          <Button buttonType="link" onPress={onLink}>
            {link}
          </Button>
        ) : null}
      </View>
    </SafeAreaView>
  );
};
