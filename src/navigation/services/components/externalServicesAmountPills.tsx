import React, {memo} from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../contexts';
import {
  Action,
  DisabledTextDark,
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../styles/colors';
import {HEIGHT, ScreenGutter} from '../../../components/styled/Containers';
import {BaseText} from '../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '../../../components/base/TouchableOpacity';
import {formatFiatAmount} from '../../../utils/helper-methods';

const screenGutter = Number.parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  amountPillsContainer: {
    marginVertical: 0,
    marginHorizontal: screenGutter,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountPill: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 27.5,
    padding: 8,
  },
  amountPillText: {
    fontWeight: '400',
    letterSpacing: 0,
  },
});

interface AmountPillsContainerProps {
  isSmallScreen?: boolean;
  hideFiatPills?: boolean;
}

const AmountPillsContainer: React.FC<
  AmountPillsContainerProps & React.ComponentProps<typeof View>
> = ({isSmallScreen: _isSmallScreen, hideFiatPills, style, ...rest}) => (
  <View
    style={[
      styles.amountPillsContainer,
      {justifyContent: hideFiatPills ? 'flex-end' : 'space-between'},
      style,
    ]}
    {...rest}
  />
);

interface AmountPillProps {
  isSmallScreen?: boolean;
  isSelected?: boolean;
  showMaxPill?: boolean;
  hideFiatPills?: boolean;
}

const AmountPill: React.FC<
  AmountPillProps & React.ComponentProps<typeof TouchableOpacity>
> = ({
  isSmallScreen,
  isSelected,
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
          backgroundColor: isSelected
            ? Action
            : theme.dark
            ? LightBlack
            : NeutralSlate,
          minWidth: showMaxPill && !hideFiatPills ? '23%' : '31%',
          maxWidth: showMaxPill && !hideFiatPills ? 187 : 250,
          height: isSmallScreen ? 30 : 46,
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
          fontSize: isSmallScreen ? 14 : 20,
          lineHeight: isSmallScreen ? 18 : 30,
          color: disabled
            ? DisabledTextDark
            : isSelected
            ? White
            : theme.dark
            ? White
            : SlateDark,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const defaultPills = [
  {
    value: 50,
  },
  {
    value: 100,
  },
  {
    value: 300,
  },
];

export interface ExternalServicesAmountPillsProps {
  fiatCurrency: string;
  onPillPress: ((value: number | string) => any) | undefined;
  selectedValue?: number | string | null;
  showMaxPill?: boolean;
  hideFiatPills?: boolean;
  maxPillDisabled?: boolean;
}

const ExternalServicesAmountPills: React.FC<
  ExternalServicesAmountPillsProps
> = ({
  fiatCurrency,
  onPillPress,
  selectedValue,
  showMaxPill,
  hideFiatPills,
  maxPillDisabled,
}) => {
  const {t} = useTranslation();

  const _isSmallScreen = HEIGHT < 700;
  return (
    <AmountPillsContainer
      isSmallScreen={_isSmallScreen}
      hideFiatPills={hideFiatPills}>
      {!hideFiatPills
        ? defaultPills.map(pill => {
            const isSelected = selectedValue === pill.value;
            return (
              <AmountPill
                onPress={() => onPillPress?.(pill.value)}
                key={pill.value}
                isSmallScreen={_isSmallScreen}
                isSelected={isSelected}
                showMaxPill={showMaxPill}
                hideFiatPills={hideFiatPills}>
                <AmountPillText
                  isSelected={isSelected}
                  isSmallScreen={_isSmallScreen}>
                  {formatFiatAmount(Number(pill.value), fiatCurrency, {
                    customPrecision: 'minimal',
                  })}
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

export default memo(ExternalServicesAmountPills);
