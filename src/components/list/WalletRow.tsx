import React, {memo, ReactElement} from 'react';
import {
  Column,
  CurrencyImageContainer,
  CurrencyColumn,
} from '../styled/Containers';
import {H5, SubText} from '../styled/Text';
import {RowContainer} from '../styled/Containers';
import styled from 'styled-components/native';
import NestedArrow from '../../../assets/img/nested-arrow.svg';
import {renderCurrencyImage} from '../../constants/SupportedCurrencyOptions';

const BalanceColumn = styled(Column)`
  align-items: flex-end;
`;

const NestedArrowContainer = styled.View`
  align-items: center;
  justify-content: center;
  margin-right: 15px;
`;

export interface WalletRowProps {
  id: string;
  img: string | ((props: any) => ReactElement);
  currencyName: string;
  currencyAbbreviation: string;
  cryptoBalance: number;
  fiatBalance: string;
  isToken?: boolean;
}

interface Props {
  id: string;
  wallet: WalletRowProps;
  onPress: () => void;
}

const WalletRow = ({wallet, onPress}: Props) => {
  const {
    currencyName,
    currencyAbbreviation,
    img,
    cryptoBalance,
    fiatBalance,
    isToken,
  } = wallet;
  return (
    <RowContainer activeOpacity={0.75} onPress={onPress}>
      {isToken && (
        <NestedArrowContainer>
          <NestedArrow />
        </NestedArrowContainer>
      )}
      <CurrencyImageContainer>
        {renderCurrencyImage(img, 45)}
      </CurrencyImageContainer>
      <CurrencyColumn>
        <H5 ellipsizeMode="tail" numberOfLines={1}>
          {currencyName}
        </H5>
        <SubText>{currencyAbbreviation}</SubText>
      </CurrencyColumn>
      <BalanceColumn>
        <H5>{cryptoBalance}</H5>
        <SubText>{fiatBalance}</SubText>
      </BalanceColumn>
    </RowContainer>
  );
};

export default memo(WalletRow);
