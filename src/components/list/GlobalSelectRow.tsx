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
import {Slate, Slate30, SlateDark} from '../../styles/colors';
import AngleRightSvg from '../../../assets/img/angle-right.svg';
import {Img} from '../../navigation/tabs/home/components/Wallet';
import {Wallet} from '../../store/wallet/wallet.models';
import {useTheme} from 'styled-components/native';

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
  padding: 4px;
  margin-right: 10px;
`;

interface WalletBadgeListProps {
  walletsByChain: {[key: string]: Wallet[]};
}

const WalletBadgeList: React.FC<WalletBadgeListProps> = ({walletsByChain}) => {
  const walletValues = Object.values(walletsByChain);
  return (
    <>
      {walletValues.map((wallets, index) => {
        const [firstWallet] = wallets;
        if (!firstWallet) {
          return null;
        }

        const img =
          firstWallet.badgeImg ||
          (walletValues.length > 1 ? firstWallet.img : null);
        if (!img) {
          return null;
        }

        const marginLeft = index === 0 ? 1 : -6;

        return (
          <Img key={firstWallet.id} isFirst={false} style={{marginLeft}}>
            <CurrencyImage img={img} size={25} />
          </Img>
        );
      })}
    </>
  );
};

const GlobalSelectRow = ({item, hasSelectedChainFilterOption, emit}: Props) => {
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
          {!hasSelectedChainFilterOption ? (
            <WalletBadgeList walletsByChain={availableWalletsByChain} />
          ) : null}
          <H7
            style={{
              marginLeft: 5,
              marginRight: 5,
              color: theme.dark ? Slate : SlateDark,
            }}
            medium={true}>
            +{total}
          </H7>
        </AvailableWalletsPill>
      ) : !hasSelectedChainFilterOption ? (
        <AvailableChainContainer>
          <WalletBadgeList walletsByChain={availableWalletsByChain} />
        </AvailableChainContainer>
      ) : null}
      <AngleRightSvg />
    </RowContainer>
  );
};

export default memo(GlobalSelectRow);
