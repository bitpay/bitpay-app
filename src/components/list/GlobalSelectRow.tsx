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
import {LightBlack, Slate30, SlateDark} from '../../styles/colors';
import AngleRightSvg from '../../../assets/img/angle-right.svg';
import {Img} from '../../navigation/tabs/home/components/Wallet';
import {Wallet} from '../../store/wallet/wallet.models';
import {IsERCToken} from '../../store/wallet/utils/currency';
import {useTheme} from 'styled-components/native';

interface Props {
  item: GlobalSelectObj;
  emit: (item: GlobalSelectObj) => void;
}

export const AvailableWalletsPill = styled.View`
  border-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
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
  padding: 4px;
  margin-right: 10px;
`;

interface WalletBadgeListProps {
  walletsByChain: {[key: string]: Wallet[]};
}

const WalletBadgeList: React.FC<WalletBadgeListProps> = ({walletsByChain}) => {
  return (
    <>
      {Object.values(walletsByChain).map(
        (wallets, index) =>
          wallets[0]?.badgeImg && (
            <Img key={wallets[0].id} isFirst={index === 0}>
              <CurrencyImage img={wallets[0].badgeImg} size={25} />
            </Img>
          ),
      )}
    </>
  );
};

const GlobalSelectRow = ({item, emit}: Props) => {
  const theme = useTheme();
  const {currencyName, total, img, availableWalletsByChain} = item;
  const shouldShowPill = total > 1;
  return (
    <RowContainer activeOpacity={ActiveOpacity} onPress={() => emit(item)}>
      <CurrencyImageContainer>
        <CurrencyImage img={img} />
      </CurrencyImageContainer>
      <CurrencyColumn>
        <H5>{currencyName}</H5>
      </CurrencyColumn>
      {shouldShowPill ? (
        <AvailableWalletsPill>
          <WalletBadgeList walletsByChain={availableWalletsByChain} />
          <H7
            style={{
              marginLeft: 5,
              marginRight: 5,
              color: theme.dark ? LightBlack : SlateDark,
            }}
            medium={true}>
            +{total}
          </H7>
        </AvailableWalletsPill>
      ) : (
        <AvailableChainContainer>
          <WalletBadgeList walletsByChain={availableWalletsByChain} />
        </AvailableChainContainer>
      )}
      <AngleRightSvg />
    </RowContainer>
  );
};

export default memo(GlobalSelectRow);
