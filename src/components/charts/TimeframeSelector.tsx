import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../contexts';
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

const styles = StyleSheet.create({
  timeframeContainer: {
    marginTop: 5,
    width: '100%',
  },
  timeframeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    width: '100%',
  },
  timeframePill: {
    height: 34,
    minWidth: 44,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeframeText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
});

const TimeframeHitSlop = {top: 10, bottom: 10, left: 10, right: 10} as const;

export const TimeframeSelector = <T extends string>({
  options,
  selected,
  onSelect,
  width,
  horizontalInset,
}: Props<T>): React.ReactElement => {
  const theme = useTheme();
  return (
    <View
      testID="timeframe-selector-container"
      style={[
        styles.timeframeContainer,
        {paddingHorizontal: horizontalInset ? parseFloat(horizontalInset) : 0},
      ]}>
      <View
        testID="timeframe-selector-row"
        style={[
          styles.timeframeRow,
          typeof width === 'number' ? {width} : undefined,
        ]}>
        {options.map(opt => {
          const active = opt.value === selected;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.timeframePill,
                {
                  backgroundColor: active
                    ? theme.dark
                      ? Midnight
                      : LightBlue
                    : 'transparent',
                },
              ]}
              hitSlop={TimeframeHitSlop}
              activeOpacity={ActiveOpacity}
              onPress={() => onSelect(opt.value)}
              testID={opt.testID}>
              <BaseText
                style={[
                  styles.timeframeText,
                  {
                    color: active
                      ? theme.dark
                        ? LinkBlue
                        : Action
                      : theme.dark
                      ? Slate30
                      : SlateDark,
                  },
                ]}>
                {opt.label}
              </BaseText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default TimeframeSelector;
