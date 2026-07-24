import React, {memo} from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import {
  Action,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {HEIGHT} from '../../../../components/styled/Containers';
import {BaseText} from '../../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '../../../../components/base/TouchableOpacity';

const styles = StyleSheet.create({
  amountPillsContainer: {
    width: '100%',
    margin: 0,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountPill: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 50,
    paddingVertical: 0,
    paddingHorizontal: 8,
  },
  amountPillText: {
    fontWeight: '400',
  },
});

const AmountPillsContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.amountPillsContainer, style]} {...rest} />;

interface AmountPillProps {
  isSmallScreen?: boolean;
  isSelected?: boolean;
  showMinPill?: boolean;
  showMaxPill?: boolean;
  hideFiatPills?: boolean;
}

const AmountPill: React.FC<
  AmountPillProps & React.ComponentProps<typeof TouchableOpacity>
> = ({
  isSmallScreen,
  isSelected,
  showMinPill: _showMinPill,
  showMaxPill,
  hideFiatPills,
  disabled,
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      disabled={disabled}
      style={[
        styles.amountPill,
        {
          backgroundColor: disabled
            ? NeutralSlate
            : isSelected
            ? Action
            : theme.dark
            ? '#111518'
            : '#FAF9FE',
          minWidth: showMaxPill && !hideFiatPills ? '23%' : '23%',
          maxWidth: showMaxPill && !hideFiatPills ? 187 : 250,
          height: isSmallScreen ? 30 : 30.65,
          borderColor: isSelected ? Action : theme.dark ? '#79787F' : '#8A8991',
        },
        style,
      ]}
      {...rest}
    />
  );
};

interface AmountPillTextProps {
  isSelected?: boolean;
  isSmallScreen?: boolean;
  disabled?: boolean;
}

const AmountPillText: React.FC<
  AmountPillTextProps & React.ComponentProps<typeof BaseText>
> = ({isSelected, isSmallScreen, disabled, style, ...rest}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.amountPillText,
        {
          fontSize: isSmallScreen ? 14 : 14,
          color: disabled
            ? SlateDark
            : isSelected
            ? White
            : theme.dark
            ? '#C2C5CC'
            : '#494C53',
        },
        style,
      ]}
      {...rest}
    />
  );
};

interface BottomAmountPill {
  label: string;
  valueStr: string;
  valueNum: number;
  decimalValue: number;
}

const defaultPills: BottomAmountPill[] = [
  {
    label: '50%',
    valueStr: '50',
    valueNum: 50,
    decimalValue: 0.5,
  },
  {
    label: '75%',
    valueStr: '75',
    valueNum: 75,
    decimalValue: 0.75,
  },
];

export interface BottomAmountPillsProps {
  onPillPress: ((value: string | undefined) => void) | undefined;
  selectedValue?: number | string | null;
  showMinPill?: boolean;
  minPillDisabled?: boolean;
  showMaxPill?: boolean;
  hideFiatPills?: boolean;
  maxPillDisabled?: boolean;
}

const BottomAmountPills: React.FC<BottomAmountPillsProps> = ({
  onPillPress,
  selectedValue,
  showMinPill,
  minPillDisabled,
  showMaxPill,
  hideFiatPills,
  maxPillDisabled,
}) => {
  const {t} = useTranslation();

  const _isSmallScreen = HEIGHT < 700;
  return (
    <AmountPillsContainer>
      {showMinPill ? (
        <AmountPill
          disabled={minPillDisabled}
          onPress={() => onPillPress?.('min')}
          key={'min'}
          isSmallScreen={_isSmallScreen}
          isSelected={selectedValue === 'min'}
          showMinPill={showMinPill}
          hideFiatPills={hideFiatPills}>
          <AmountPillText
            disabled={minPillDisabled}
            isSelected={selectedValue === 'min'}
            isSmallScreen={_isSmallScreen}>
            {t('MIN')}
          </AmountPillText>
        </AmountPill>
      ) : null}
      {!hideFiatPills
        ? defaultPills.map(pill => {
            const isSelected = selectedValue === pill.valueStr;
            return (
              <AmountPill
                onPress={() => onPillPress?.(pill.valueStr)}
                key={pill.valueStr}
                isSmallScreen={_isSmallScreen}
                isSelected={isSelected}
                showMaxPill={showMaxPill}
                hideFiatPills={hideFiatPills}>
                <AmountPillText
                  isSelected={isSelected}
                  isSmallScreen={_isSmallScreen}>
                  {pill.label}
                </AmountPillText>
              </AmountPill>
            );
          })
        : null}
      {showMaxPill ? (
        <AmountPill
          disabled={maxPillDisabled}
          onPress={() => onPillPress?.('max')}
          key={'max'}
          isSmallScreen={_isSmallScreen}
          isSelected={selectedValue === 'max'}
          showMaxPill={showMaxPill}
          hideFiatPills={hideFiatPills}>
          <AmountPillText
            disabled={maxPillDisabled}
            isSelected={selectedValue === 'max'}
            isSmallScreen={_isSmallScreen}>
            {t('MAX')}
          </AmountPillText>
        </AmountPill>
      ) : null}
    </AmountPillsContainer>
  );
};

export default memo(BottomAmountPills);
