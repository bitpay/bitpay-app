import React, {memo} from 'react';
import styled from 'styled-components/native';
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

const AmountPillsContainer = styled.View`
  width: 100%;
  margin: 0px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const AmountPill = styled(TouchableOpacity)<{
  isSmallScreen?: boolean;
  isSelected?: boolean;
  showMinPill?: boolean;
  showMaxPill?: boolean;
  hideFiatPills?: boolean;
}>`
  background-color: ${({theme: {dark}, isSelected, disabled}) =>
    disabled
      ? NeutralSlate
      : isSelected
      ? Action
      : dark
      ? '#111518'
      : '#FAF9FE'};
  min-width: ${({showMaxPill, hideFiatPills}) =>
    showMaxPill && !hideFiatPills ? '23%' : '23%'};
  max-width: ${({showMaxPill, hideFiatPills}) =>
    showMaxPill && !hideFiatPills ? '187px' : '250px'};
  height: ${({isSmallScreen}) => (isSmallScreen ? 30 : 30.65)}px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  border: 1px solid
    ${({theme: {dark}, isSelected}) =>
      isSelected ? Action : dark ? '#79787F' : '#8A8991'};
  border-radius: 50px;
  padding: 0 8px;
`;

const AmountPillText = styled(BaseText)<{
  isSelected?: boolean;
  isSmallScreen?: boolean;
  disabled?: boolean;
}>`
  font-size: ${({isSmallScreen}) => (isSmallScreen ? 14 : 14)}px;
  font-weight: 400;
  color: ${({theme: {dark}, isSelected, disabled}) =>
    disabled ? SlateDark : isSelected ? White : dark ? '#C2C5CC' : '#494C53'};
`;

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
