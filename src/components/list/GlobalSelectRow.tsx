import React, {memo} from 'react';
import {
  CurrencyColumn,
  CurrencyImageContainer,
  ActiveOpacity,
} from '../styled/Containers';
import {RowContainer} from '../styled/Containers';
import {H5, H7} from '../styled/Text';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {GlobalSelectObj} from '../../navigation/wallet/screens/GlobalSelect';
import styled from 'styled-components/native';
import {LightBlack, NeutralSlate} from '../../styles/colors';
import AngleRightSvg from '../../../assets/img/angle-right.svg';
import {useTranslation} from 'react-i18next';

interface Props {
  item: GlobalSelectObj;
  emit: (item: GlobalSelectObj) => void;
}

export const AvailableWalletsPill = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  flex-direction: row;
  border-radius: 40px;
  align-items: center;
  justify-content: center;
  padding: 10px;
  margin-right: 10px;
`;

const GlobalSelectRow = ({item, emit}: Props) => {
  const {t} = useTranslation();
  const {currencyName, total, img, badgeImg} = item;

  return (
    <RowContainer activeOpacity={ActiveOpacity} onPress={() => emit(item)}>
      <CurrencyImageContainer>
        <CurrencyImage img={img} badgeUri={badgeImg} />
      </CurrencyImageContainer>
      <CurrencyColumn>
        <H5>{currencyName}</H5>
      </CurrencyColumn>
      {total > 1 && (
        <AvailableWalletsPill>
          <H7 medium={true}>
            {total} {t('Wallets')}
          </H7>
        </AvailableWalletsPill>
      )}

      <AngleRightSvg />
    </RowContainer>
  );
};

export default memo(GlobalSelectRow);
