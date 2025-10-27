import React, {memo} from 'react';
import styled from 'styled-components/native';
import {
  Action,
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

const AmountPillsContainer = styled.View<{
  isSmallScreen?: boolean;
  hideFiatPills?: boolean;
}>`
  margin: 0px ${ScreenGutter};
  display: flex;
  flex-direction: row;
  justify-content: ${({hideFiatPills}) =>
    hideFiatPills ? 'flex-end' : 'space-between'};
  align-items: center;
`;

const AmountPill = styled(TouchableOpacity)<{
  isSmallScreen?: boolean;
  isSelected?: boolean;
  showMaxPill?: boolean;
  hideFiatPills?: boolean;
}>`
  background-color: ${({theme: {dark}, isSelected, disabled}) =>
    disabled
      ? NeutralSlate
      : isSelected
      ? Action
      : dark
      ? LightBlack
      : NeutralSlate};
  min-width: ${({showMaxPill, hideFiatPills}) =>
    showMaxPill && !hideFiatPills ? '23%' : '31%'};
  max-width: ${({showMaxPill, hideFiatPills}) =>
    showMaxPill && !hideFiatPills ? '187px' : '250px'};
  height: ${({isSmallScreen}) => (isSmallScreen ? 30 : 46)}px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  border-radius: 27.5px;
  padding: 8px;
`;

const AmountPillText = styled(BaseText)<{
  isSelected?: boolean;
  isSmallScreen?: boolean;
  disabled?: boolean;
}>`
  font-size: ${({isSmallScreen}) => (isSmallScreen ? 14 : 20)}px;
  font-weight: 400;
  line-height: ${({isSmallScreen}) => (isSmallScreen ? 18 : 30)}px;
  letter-spacing: 0px;
  color: ${({theme: {dark}, isSelected, disabled}) =>
    disabled ? SlateDark : isSelected ? White : dark ? White : SlateDark};
`;

const defaultPills = [
  {
    value: 20,
  },
  {
    value: 50,
  },
  {
    value: 100,
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
