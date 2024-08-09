import React, {memo} from 'react';
import {
  CurrencyColumn,
  CurrencyImageContainer,
  ActiveOpacity,
} from '../styled/Containers';
import {RowContainer} from '../styled/Containers';
import {H5, H7, ListItemSubText} from '../styled/Text';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {GlobalSelectObj} from '../../navigation/wallet/screens/GlobalSelect';
import styled from 'styled-components/native';
import {Slate, Slate30, SlateDark} from '../../styles/colors';
import AngleRightSvg from '../../../assets/img/angle-right.svg';
import {Img} from '../../navigation/tabs/home/components/Wallet';
import {useTheme} from 'styled-components/native';
import _ from 'lodash';

interface Props {
  item: GlobalSelectObj;
  hasSelectedChainFilterOption: boolean;
  emit: (item: GlobalSelectObj) => void;
}

export const AvailableWalletsPill = styled.View`
  border-color: ${({theme: {dark}}) => (dark ? Slate : Slate30)};
  border-width: 1px;
  flex-direction: row;
  border-radius: 40px;
  align-items: center;
  justify-content: center;
  padding: 4px;
  margin-right: 10px;
`;

export const AvailableChainContainer = styled.View`
  align-items: center;
  justify-content: center;
  flex-direction: row;
  padding: 4px;
  margin-right: 10px;
`;

interface CurrencyBadgeListProps {
  chainsImg: {
    [key: string]: {
      badgeUri?: string | ((props?: any) => React.ReactElement) | undefined;
      badgeImg?: string | ((props?: any) => React.ReactElement) | undefined;
      priority: number | undefined;
    };
  };
}

const CurrencyBadgeList: React.FC<CurrencyBadgeListProps> = ({chainsImg}) => {
  const chainValues = _.orderBy(Object.values(chainsImg), 'priority', 'asc');
  let _index = 0;
  return (
    <>
      {chainValues.map(({badgeUri, badgeImg}) => {
        const img = badgeUri || badgeImg;
        if (!img) {
          return null;
        }
        _index = _index + 1;
        const marginLeft = _index === 1 ? 1 : -6;
        return (
          <Img key={_.uniqueId()} isFirst={_index === 1} style={{marginLeft}}>
            <CurrencyImage img={img} size={25} />
          </Img>
        );
      })}
    </>
  );
};

const GlobalSelectRow = ({item, hasSelectedChainFilterOption, emit}: Props) => {
  const theme = useTheme();
  const {currencyName, currencyAbbreviation, total, img, chainsImg} = item;
  return (
    <RowContainer
      noBorder={true}
      activeOpacity={ActiveOpacity}
      onPress={() => emit(item)}>
      <CurrencyImageContainer>
        <CurrencyImage img={img} />
      </CurrencyImageContainer>
      <CurrencyColumn>
        <H5>{currencyName}</H5>
        <ListItemSubText ellipsizeMode="tail" numberOfLines={1}>
          {currencyAbbreviation.toUpperCase()}
        </ListItemSubText>
      </CurrencyColumn>
      {!hasSelectedChainFilterOption ? (
        <AvailableChainContainer>
          <CurrencyBadgeList chainsImg={chainsImg} />
        </AvailableChainContainer>
      ) : null}
      <AngleRightSvg />
    </RowContainer>
  );
};

export default memo(GlobalSelectRow);
