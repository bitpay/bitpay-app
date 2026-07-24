import React from 'react';
import {Pressable, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../../../../../contexts';
import type {
  SnapshotIndexV2,
  SnapshotPersistDebugMode,
} from '../../../../../portfolio/core/pnl/snapshotStore';

const styles = StyleSheet.create({
  debugScreenContainer: {
    flex: 1,
  },
  debugHeaderContainer: {
    padding: 12,
  },
  debugHeaderText: {
    fontSize: 14,
    lineHeight: 18,
  },
  debugButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
  },
  debugButtonSpacer: {
    width: 10,
    height: 10,
  },
  debugPillButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  debugPillButtonText: {
    fontSize: 13,
  },
});

export const DebugScreenContainer: React.FC<{
  children?: React.ReactNode;
}> = ({children}) => {
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[
        styles.debugScreenContainer,
        {backgroundColor: theme.colors.background},
      ]}>
      {children}
    </SafeAreaView>
  );
};

export const DebugHeaderContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.debugHeaderContainer}>{children}</View>;

export const DebugHeaderText: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <Text style={[styles.debugHeaderText, {color: theme.colors.text}]}>
      {children}
    </Text>
  );
};

export const DebugButtonRow: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.debugButtonRow}>{children}</View>;

export const DebugButtonSpacer: React.FC = () => (
  <View style={styles.debugButtonSpacer} />
);

export const DebugPillButton: React.FC<
  React.ComponentProps<typeof Pressable> & {selected?: boolean}
> = ({selected, style, ...rest}) => {
  const theme = useTheme();
  return (
    <Pressable
      style={[
        styles.debugPillButton,
        {
          borderColor: selected ? theme.colors.primary : theme.colors.border,
        },
        style as any,
      ]}
      {...rest}
    />
  );
};

export const DebugPillButtonText: React.FC<{
  selected?: boolean;
  children?: React.ReactNode;
}> = ({selected, children}) => {
  const theme = useTheme();
  return (
    <Text
      style={[
        styles.debugPillButtonText,
        {color: selected ? theme.colors.primary : theme.colors.text},
      ]}>
      {children}
    </Text>
  );
};

export const SNAPSHOT_DEBUG_MODE_OPTIONS: SnapshotPersistDebugMode[] = [
  'none',
  'link',
  'full',
];

export const formatSnapshotDebugModeLabel = (
  mode: SnapshotPersistDebugMode,
): string => {
  switch (mode) {
    case 'none':
      return 'None';
    case 'link':
      return 'Link';
    case 'full':
      return 'Full';
  }
};

export const formatDebugIso = (value?: number): string => {
  if (!Number.isFinite(value)) {
    return '—';
  }

  try {
    return new Date(value as number).toISOString();
  } catch {
    return '—';
  }
};

export const getSnapshotIndexRowCount = (
  index: SnapshotIndexV2 | null | undefined,
): number => {
  return (index?.chunks || []).reduce((total, chunk) => {
    const rows = Number(chunk?.rows);
    return total + (Number.isFinite(rows) ? rows : 0);
  }, 0);
};
