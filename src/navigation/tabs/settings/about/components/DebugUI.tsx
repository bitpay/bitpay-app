import {Pressable, SafeAreaView} from 'react-native';
import styled from 'styled-components/native';
import type {
  SnapshotIndexV2,
  SnapshotPersistDebugMode,
} from '../../../../../portfolio/core/pnl/snapshotStore';

export const DebugScreenContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({theme}) => theme.colors.background};
`;

export const DebugHeaderContainer = styled.View`
  padding: 12px;
`;

export const DebugHeaderText = styled.Text`
  color: ${({theme}) => theme.colors.text};
  font-size: 14px;
  line-height: 18px;
`;

export const DebugButtonRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 10px;
  flex-wrap: wrap;
`;

export const DebugButtonSpacer = styled.View`
  width: 10px;
  height: 10px;
`;

export const DebugPillButton = styled(Pressable)<{selected?: boolean}>`
  padding: 10px 12px;
  border-radius: 999px;
  border-width: 1px;
  border-color: ${({theme, selected}) =>
    selected ? theme.colors.primary : theme.colors.border};
  margin-right: 8px;
  margin-bottom: 8px;
`;

export const DebugPillButtonText = styled.Text<{selected?: boolean}>`
  color: ${({theme, selected}) =>
    selected ? theme.colors.primary : theme.colors.text};
  font-size: 13px;
`;

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
