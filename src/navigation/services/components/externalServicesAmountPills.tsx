import React, {memo} from 'react';
import styled, {useTheme} from 'styled-components/native';
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

const AmountPillsContainer = styled.View<{isSmallScreen?: boolean}>`
  margin: 0px ${ScreenGutter};
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const AmountPill = styled(TouchableOpacity)<{
  isSmallScreen?: boolean;
  isSelected?: boolean;
}>`
  background-color: ${({theme: {dark}, isSelected}) =>
    isSelected ? Action : dark ? LightBlack : NeutralSlate};
  min-width: 31%;
  max-width: 250px;
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
}>`
  font-size: ${({isSmallScreen}) => (isSmallScreen ? 14 : 20)}px;
  font-weight: 400;
  line-height: ${({isSmallScreen}) => (isSmallScreen ? 18 : 30)}px;
  letter-spacing: 0px;
  color: ${({theme: {dark}, isSelected}) =>
    isSelected ? White : dark ? White : SlateDark};
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
  onPillPress: ((value: number) => any) | undefined;
  selectedValue?: number | null;
}

const ExternalServicesAmountPills: React.FC<
  ExternalServicesAmountPillsProps
> = ({fiatCurrency, onPillPress, selectedValue}) => {
  const theme = useTheme();
  const {t} = useTranslation();

  const _isSmallScreen = HEIGHT < 700;
  return (
    <AmountPillsContainer isSmallScreen={_isSmallScreen}>
      {defaultPills.map(pill => {
        const isSelected = selectedValue === pill.value;
        return (
          <AmountPill
            onPress={() => onPillPress?.(pill.value)}
            key={pill.value}
            isSmallScreen={_isSmallScreen}
            isSelected={isSelected}>
            <AmountPillText
              isSelected={isSelected}
              isSmallScreen={_isSmallScreen}>
              {formatFiatAmount(Number(pill.value), fiatCurrency, {
                customPrecision: 'minimal',
              })}
            </AmountPillText>
          </AmountPill>
        );
      })}
    </AmountPillsContainer>
  );
};

export default memo(ExternalServicesAmountPills);
