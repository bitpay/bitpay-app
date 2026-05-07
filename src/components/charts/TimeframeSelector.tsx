import React from 'react';
import styled from 'styled-components/native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {ActiveOpacity} from '../styled/Containers';
import {BaseText} from '../styled/Text';
import {
  Action,
  LightBlue,
  LinkBlue,
  Midnight,
  Slate30,
  SlateDark,
} from '../../styles/colors';

export type TimeframeSelectorOption<T extends string> = {
  value: T;
  label: string;
  testID?: string;
};

type Props<T extends string> = {
  options: Array<TimeframeSelectorOption<T>>;
  selected: T;
  onSelect: (value: T) => void;
  width?: number;
  horizontalInset?: string;
};

const TimeframeContainer = styled.View<{$horizontalInset?: string}>`
  margin-top: 5px;
  width: 100%;
  padding: 0 ${({$horizontalInset = '0'}) => $horizontalInset};
`;

const TimeframeRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-self: center;
  width: 100%;
`;

const TimeframeHitSlop = {top: 10, bottom: 10, left: 10, right: 10} as const;

type TimeframeSelectorStyledProps = {$active: boolean};

const TimeframePill = styled(TouchableOpacity)<TimeframeSelectorStyledProps>`
  height: 34px;
  min-width: 44px;
  padding: 0 12px;
  border-radius: 18px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme, $active}) =>
    $active ? (theme.dark ? Midnight : LightBlue) : 'transparent'};
`;

const TimeframeText = styled(BaseText)<TimeframeSelectorStyledProps>`
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  color: ${({theme, $active}) =>
    $active
      ? theme.dark
        ? LinkBlue
        : Action
      : theme.dark
      ? Slate30
      : SlateDark};
`;

export const TimeframeSelector = <T extends string>({
  options,
  selected,
  onSelect,
  width,
  horizontalInset,
}: Props<T>): React.ReactElement => {
  return (
    <TimeframeContainer
      testID="timeframe-selector-container"
      $horizontalInset={horizontalInset}>
      <TimeframeRow
        testID="timeframe-selector-row"
        style={typeof width === 'number' ? {width} : undefined}>
        {options.map(opt => {
          const active = opt.value === selected;
          return (
            <TimeframePill
              key={opt.value}
              $active={active}
              hitSlop={TimeframeHitSlop}
              activeOpacity={ActiveOpacity}
              onPress={() => onSelect(opt.value)}
              testID={opt.testID}>
              <TimeframeText $active={active}>{opt.label}</TimeframeText>
            </TimeframePill>
          );
        })}
      </TimeframeRow>
    </TimeframeContainer>
  );
};

export default TimeframeSelector;
