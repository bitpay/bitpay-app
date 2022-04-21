import {Wallet} from '../../../../../store/wallet/wallet.models';
import React from 'react';
import {CurrencyImage} from '../../../../../components/currency-image/CurrencyImage';
import {formatFiatAmount} from '../../../../../utils/helper-methods';
import CustomizeHomeCard from '../../../../../components/customize-home-card/CustomizeHomeCard';
import styled from 'styled-components/native';
import {BaseText} from '../../../../../components/styled/Text';
import {Slate} from '../../../../../styles/colors';
import {ActiveOpacity} from '../../../../../components/styled/Containers';

interface CustomizeWalletCardComponentProps {
  wallets: Wallet[];
  totalBalance: number;
  onPress: () => void;
  checked: boolean;
  defaultAltCurrencyIsoCode: string;
}

const WALLET_DISPLAY_LIMIT = 3;
const ICON_SIZE = 20;

const Img = styled.View<{isFirst: boolean}>`
  min-height: 20px;
  margin-left: ${({isFirst}) => (isFirst ? 0 : '-3px')};
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

const HeaderImg = styled.View`
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
  flex: 1;
  flex-wrap: wrap;
`;

const CustomizeHomeCardContainer = styled.TouchableOpacity`
  margin-bottom: 25px;
`;

const CustomizeWalletCardComponent: React.FC<
  CustomizeWalletCardComponentProps
> = ({
  wallets,
  totalBalance,
  onPress,
  checked,
  defaultAltCurrencyIsoCode,
}: {
  wallets: Wallet[];
  totalBalance: number;
  onPress: () => void;
  checked: boolean;
  defaultAltCurrencyIsoCode: string;
}) => {
  const remainingAssetCount =
    wallets.length > WALLET_DISPLAY_LIMIT
      ? wallets.length - WALLET_DISPLAY_LIMIT
      : undefined;

  const HeaderComponent = (
    <HeaderImg>
      {wallets.slice(0, WALLET_DISPLAY_LIMIT).map((wallet, index) => {
        const {id, img} = wallet;
        return (
          wallet && (
            <Img key={id} isFirst={index === 0}>
              <CurrencyImage img={img} size={ICON_SIZE} />
            </Img>
          )
        );
      })}
      {remainingAssetCount && (
        <RemainingAssetsLabel>
          + {remainingAssetCount} more
        </RemainingAssetsLabel>
      )}
    </HeaderImg>
  );

  const body = {
    title: 'My Key',
    value: formatFiatAmount(totalBalance, defaultAltCurrencyIsoCode),
  };

  return (
    <CustomizeHomeCardContainer onPress={onPress} activeOpacity={ActiveOpacity}>
      <CustomizeHomeCard
        header={HeaderComponent}
        body={body}
        footer={{onCTAPress: onPress, checked: checked}}
      />
    </CustomizeHomeCardContainer>
  );
};

export default CustomizeWalletCardComponent;
