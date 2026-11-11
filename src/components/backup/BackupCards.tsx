import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {BaseText} from '../styled/Text';
import {Hr} from '../styled/Containers';
import {useBackupColors} from './colors';
import {Action} from '../../styles/colors';
import ChevronUpLight from '../../../assets/img/chevron-up-lightmode.svg';
import ChevronUpDark from '../../../assets/img/chevron-up-darkmode.svg';
import ChevronDownLight from '../../../assets/img/chevron-down-lightmode.svg';
import ChevronDownDark from '../../../assets/img/chevron-down-darkmode.svg';

const styles = StyleSheet.create({
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 50,
    borderWidth: 1,
  },
  tagText: {fontSize: 12, lineHeight: 16, fontWeight: '500'},
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardBody: {flex: 1, gap: 4},
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {fontSize: 16, lineHeight: 21, fontWeight: '500', flexShrink: 1},
  cardDescription: {fontSize: 14, lineHeight: 20},
  bannerLink: {marginTop: 2, alignSelf: 'flex-start'},
  bannerLinkText: {fontSize: 13, lineHeight: 20},
  accordion: {borderRadius: 12, overflow: 'hidden'},
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  accordionBody: {paddingHorizontal: 16, paddingBottom: 4},
  accordionItem: {paddingVertical: 14},
  accordionItemText: {fontSize: 14},
  selectable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {width: 11, height: 11, borderRadius: 6, backgroundColor: Action},
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
  },
  pillMd: {minHeight: 32, paddingHorizontal: 12},
  pillLg: {minHeight: 40, paddingHorizontal: 15},
  pillTextMd: {fontSize: 14, lineHeight: 18, fontWeight: '500'},
  pillTextLg: {fontSize: 15, lineHeight: 22, fontWeight: '400'},
});

const IconCircle = ({children}: {children: React.ReactNode}) => {
  const colors = useBackupColors();
  return (
    <View style={[styles.iconCircle, {backgroundColor: colors.iconButtonBg}]}>
      {children}
    </View>
  );
};

export type StatusTagTone = 'on' | 'rec';

export const StatusTag = ({
  children,
  tone,
}: {
  children: string;
  tone?: StatusTagTone;
}) => {
  const colors = useBackupColors();
  const backgroundColor =
    tone === 'on'
      ? colors.surfaceSuccess
      : tone === 'rec'
      ? colors.surfaceAccent
      : 'transparent';
  const color =
    tone === 'on'
      ? colors.gain
      : tone === 'rec'
      ? colors.textLink
      : colors.tagText;
  return (
    <View
      style={[
        styles.tag,
        {
          backgroundColor,
          borderColor: tone ? 'transparent' : colors.tagBorder,
        },
      ]}>
      <BaseText style={[styles.tagText, {color}]} numberOfLines={1}>
        {children}
      </BaseText>
    </View>
  );
};

export const BannerLink = ({
  children,
  onPress,
}: {
  children: string;
  onPress: () => void;
}) => {
  const colors = useBackupColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={styles.bannerLink}>
      <BaseText style={[styles.bannerLinkText, {color: colors.textLink}]}>
        {children}
      </BaseText>
    </Pressable>
  );
};

interface BackupMethodCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag?: string | null;
  tagTone?: StatusTagTone;
  action?: React.ReactNode;
  onPress?: () => void;
  testID?: string;
}

export const BackupMethodCard = ({
  icon,
  title,
  description,
  tag,
  tagTone,
  action,
  onPress,
  testID,
}: BackupMethodCardProps) => {
  const colors = useBackupColors();
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({pressed}) => [
        styles.card,
        {
          backgroundColor: pressed ? colors.rowSelectedBg : colors.surfaceMuted,
          borderColor: pressed ? colors.rowSelectedBorder : 'transparent',
        },
      ]}>
      <IconCircle>{icon}</IconCircle>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <BaseText style={styles.cardTitle}>{title}</BaseText>
          {tag ? <StatusTag tone={tagTone}>{tag}</StatusTag> : null}
        </View>
        <BaseText
          style={[styles.cardDescription, {color: colors.textDescription}]}>
          {description}
        </BaseText>
        {action}
      </View>
    </Pressable>
  );
};

export const AdvancedMethods = ({
  title,
  open,
  onToggle,
  items,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  items: {label: string; onPress: () => void}[];
}) => {
  const colors = useBackupColors();
  const Chevron = open
    ? colors.dark
      ? ChevronUpDark
      : ChevronUpLight
    : colors.dark
    ? ChevronDownDark
    : ChevronDownLight;
  return (
    <View style={[styles.accordion, {backgroundColor: colors.surfaceMuted}]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{expanded: open}}
        onPress={onToggle}
        style={styles.accordionHeader}>
        <BaseText style={styles.cardTitle}>{title}</BaseText>
        <Chevron />
      </Pressable>
      {open ? (
        <View style={styles.accordionBody}>
          {items.map((item, i) => (
            <React.Fragment key={item.label}>
              {i ? <Hr /> : null}
              <Pressable
                accessibilityRole="button"
                onPress={item.onPress}
                style={styles.accordionItem}>
                <BaseText style={styles.accordionItemText}>
                  {item.label}
                </BaseText>
              </Pressable>
            </React.Fragment>
          ))}
        </View>
      ) : null}
    </View>
  );
};

export const Radio = ({selected, dim}: {selected?: boolean; dim?: boolean}) => {
  const colors = useBackupColors();
  return (
    <View
      style={[
        styles.radio,
        {
          borderColor: dim
            ? colors.surfaceMuted
            : selected
            ? Action
            : colors.inputBorder,
        },
      ]}>
      {selected ? <View style={styles.radioDot} /> : null}
    </View>
  );
};

export const SelectableCard = ({
  selected,
  onPress,
  children,
  accessibilityLabel,
}: {
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
}) => {
  const colors = useBackupColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{checked: selected}}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        styles.selectable,
        {
          backgroundColor: selected
            ? colors.rowSelectedBg
            : colors.surfaceMuted,
          borderColor: selected ? colors.rowSelectedBorder : 'transparent',
        },
      ]}>
      <View style={styles.cardBody}>{children}</View>
      <Radio selected={selected} />
    </Pressable>
  );
};

export const Pill = ({
  label,
  onPress,
  size = 'md',
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  size?: 'md' | 'lg';
  accessibilityLabel?: string;
}) => {
  const colors = useBackupColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({pressed}) => [
        styles.pill,
        size === 'lg' ? styles.pillLg : styles.pillMd,
        {backgroundColor: colors.surfacePill, opacity: pressed ? 0.75 : 1},
      ]}>
      <BaseText
        style={[
          size === 'lg' ? styles.pillTextLg : styles.pillTextMd,
          {color: colors.textPill},
        ]}>
        {label}
      </BaseText>
    </Pressable>
  );
};
