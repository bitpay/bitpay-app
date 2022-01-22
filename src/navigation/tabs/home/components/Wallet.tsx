import React from 'react';
import styled from 'styled-components/native';
import {CurrencySelectionOptions} from '../../../../constants/CurrencySelectionOptions';
import HomeCard from '../../../../components/home-card/HomeCard';
import {BaseText} from '../../../../components/styled/Text';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {Slate} from '../../../../styles/colors';
import {format} from '../../../../utils/currency';

interface WalletCardComponentProps {
  wallets: Wallet[];
  totalBalance: number;
  onPress: () => void;
}

const HeaderImg = styled.View`
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
  flex: 1;
  flex-wrap: wrap;
`;

const Img = styled.View<{isFirst: boolean; size: string}>`
  width: ${({size}) => size};
  height: ${({size}) => size};
  min-height: 22px;
  margin-left: ${({isFirst}) => (isFirst ? 0 : '-5px')};
`;

const RemainingAssetsLabel = styled(BaseText)`
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
  line-height: 18px;
  letter-spacing: 0;
  color: ${Slate};
  margin-left: 5px;
`;
const WALLET_DISPLAY_LIMIT = 4;
const ICON_SIZE = 25;

const WalletCardComponent: React.FC<WalletCardComponentProps> = ({
  wallets,
  totalBalance,
  onPress,
}: {
  wallets: Wallet[];
  totalBalance: number;
  onPress: () => void;
}) => {
  const walletInfo = wallets
    .slice(0, WALLET_DISPLAY_LIMIT)
    .map(wallet => wallet.currencyAbbreviation)
    .map(currency =>
      CurrencySelectionOptions.find(
        ({id}: {id: string | number}) => id === currency,
      ),
    );

  const remainingAssetCount =
    wallets.length > WALLET_DISPLAY_LIMIT
      ? wallets.length - WALLET_DISPLAY_LIMIT
      : undefined;

  const HeaderComponent = (
    <HeaderImg>
      {walletInfo.map(
        (wallet, index) =>
          wallet && (
            <Img key={index} isFirst={index === 0} size={ICON_SIZE + 'px'}>
              {wallet.roundIcon(ICON_SIZE)}
            </Img>
          ),
      )}
      {remainingAssetCount && (
        <RemainingAssetsLabel>
          + {remainingAssetCount} more
        </RemainingAssetsLabel>
      )}
    </HeaderImg>
  );

  const body = {
    title: 'My Everything Wallet',
    value: format(totalBalance, 'USD'),
  };

  return <HomeCard header={HeaderComponent} body={body} onCTAPress={onPress} />;
};

export default WalletCardComponent;
