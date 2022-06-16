import React, {memo} from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../styled/Text';
import {
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
  Black,
} from '../../styles/colors';
import {useTheme, css} from 'styled-components/native';
import {Column} from '../styled/Containers';
import {useTranslation} from 'react-i18next';

const AltCurrencyContainer = styled.TouchableHighlight<{selected?: boolean}>`
  ${({selected}) =>
    selected &&
    css`
      background: ${({theme: {dark}}) => (dark ? LightBlack : '#FBFBFF')};
    `};
  padding: 13px 15px;
`;

const AltCurrencyName = styled(BaseText)<{selected?: boolean}>`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  font-weight: 400;
  font-size: 14px;
  line-height: 19px;
  ${({selected}) =>
    selected &&
    css`
      font-weight: 500;
      font-size: 16px;
      line-height: 18px;
    `};
`;

const AltCurrencyIsoCodeContainer = styled.View<{selected?: boolean}>`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  ${({selected}) =>
    selected &&
    css`
      background: ${({theme: {dark}}) => (dark ? SlateDark : '#E1E4E7')};
    `};
  width: 60px;
  height: 40px;
  border-radius: 27.5px;
  align-items: center;
  justify-content: center;
`;

const IsoCodeNameLabel = styled(BaseText)<{selected?: boolean}>`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 15px;
  line-height: 22px;
  font-weight: 400;
`;

const SelectedLabel = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  font-weight: 400;
  padding-bottom: 2px;
`;

const RowContainer = styled.View`
  flex-direction: row;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export interface AltCurrenciesRowProps {
  isoCode: string;
  name: string;
}

interface Props {
  altCurrency: AltCurrenciesRowProps;
  selected: boolean;
  onPress: () => void;
}

const AltCurrencyRow = ({altCurrency, selected, onPress}: Props) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const underlayColor = theme.colors.background;
  const {isoCode, name} = altCurrency;
  return (
    <AltCurrencyContainer
      underlayColor={underlayColor}
      selected={selected}
      onPress={onPress}>
      <RowContainer>
        <Column>
          {selected ? <SelectedLabel>{t('Selected')}</SelectedLabel> : null}
          <AltCurrencyName selected={selected}>{name}</AltCurrencyName>
        </Column>
        <AltCurrencyIsoCodeContainer selected={selected}>
          <IsoCodeNameLabel>{isoCode}</IsoCodeNameLabel>
        </AltCurrencyIsoCodeContainer>
      </RowContainer>
    </AltCurrencyContainer>
  );
};

export default memo(AltCurrencyRow);
