import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../contexts';
import {BaseText} from '../../../components/styled/Text';
import {
  Action,
  LightBlack,
  Midnight,
  NeutralSlate,
  White,
} from '../../../styles/colors';
import {ActiveOpacity} from '../../../components/styled/Containers';
import {titleCasing} from '../../../utils/helper-methods';
import haptic from '../../../components/haptic-feedback/haptic';
import {DateRanges} from '../../../store/rate/rate.models';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

interface Props {
  onPress: (dateRange: DateRanges) => void;
}

const styles = StyleSheet.create({
  buttonsRow: {
    width: '100%',
    justifyContent: 'space-evenly',
    flexDirection: 'row',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontStyle: 'normal',
    lineHeight: 24,
    letterSpacing: 0,
    textAlign: 'center',
  },
  linkButton: {
    height: 40,
    width: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const RangeDateSelector = ({onPress}: Props) => {
  const theme = useTheme();
  const [activeOption, setActiveOption] = useState<DateRanges>(DateRanges.Day);
  const updateOptions: Array<{label: string; dateRange: DateRanges}> = [
    {label: '1D', dateRange: DateRanges.Day},
    {label: '1W', dateRange: DateRanges.Week},
    {label: '1M', dateRange: DateRanges.Month},
  ];
  const isActive = updateOptions.find(
    opt => opt.dateRange === activeOption,
  ) as {
    label: string;
    dateRange: DateRanges;
  };

  return (
    <View style={styles.buttonsRow}>
      {updateOptions.map(({label, dateRange}) => {
        const active = isActive.label === label;
        return (
          <View style={styles.buttonContainer} key={label}>
            <TouchableOpacity
              style={[
                styles.linkButton,
                {
                  backgroundColor: active
                    ? theme.dark
                      ? Midnight
                      : '#EDF0FE'
                    : 'transparent',
                },
              ]}
              activeOpacity={ActiveOpacity}
              onPress={() => {
                haptic('impactLight');
                if (isActive.label !== label) {
                  setActiveOption(dateRange);
                  onPress(dateRange);
                }
              }}>
              <BaseText
                style={[
                  styles.buttonText,
                  {
                    fontWeight: active ? '500' : '400',
                    color: active
                      ? theme.dark
                        ? White
                        : Action
                      : theme.dark
                      ? NeutralSlate
                      : LightBlack,
                  },
                ]}>
                {titleCasing(label)}
              </BaseText>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};

export default RangeDateSelector;
