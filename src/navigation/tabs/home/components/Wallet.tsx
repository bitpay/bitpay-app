import React from 'react';
import styled from 'styled-components/native';
import HomeCard from '../../../../components/home-card/HomeCard';
import {BaseText} from '../../../../components/styled/Text';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {Slate} from '../../../../styles/colors';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import {getRemainingWalletCount} from '../../../../store/wallet/utils/wallet';

interface WalletCardComponentProps {
  wallets: Wallet[];
  totalBalance: number;
  onPress: () => void;
  needsBackup: boolean;
  keyName: string | undefined;
}

export const HeaderImg = styled.View`
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
  flex: 1;
  flex-wrap: wrap;
`;

export const Img = styled.View<{isFirst: boolean}>`
  min-height: 22px;
  margin-left: ${({isFirst}) => (isFirst ? 0 : '-5px')};
`;

export const RemainingAssetsLabel = styled(BaseText)`
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
  line-height: 18px;
  letter-spacing: 0;
  color: ${Slate};
  margin-left: 5px;
`;
export const WALLET_DISPLAY_LIMIT = 4;
export const ICON_SIZE = 25;

const WalletCardComponent: React.FC<WalletCardComponentProps> = ({
  wallets,
  totalBalance,
  onPress,
  needsBackup,
  keyName = 'My Key',
}) => {
  const walletInfo = wallets.slice(0, WALLET_DISPLAY_LIMIT);
  const remainingWalletCount = getRemainingWalletCount(wallets);

  const HeaderComponent = (
    <HeaderImg>
      {walletInfo.map((wallet, index) => {
        const {id, img} = wallet;
        return (
          wallet && (
            <Img key={id} isFirst={index === 0}>
              <CurrencyImage img={img} size={ICON_SIZE} />
            </Img>
          )
        );
      })}
      {remainingWalletCount && (
        <RemainingAssetsLabel>
          + {remainingWalletCount} more
        </RemainingAssetsLabel>
      )}
    </HeaderImg>
  );

  const body = {
    title: keyName,
    value: formatFiatAmount(totalBalance, 'USD'),
    needsBackup,
  };

  return <HomeCard header={HeaderComponent} body={body} onCTAPress={onPress} />;
};

export default WalletCardComponent;
