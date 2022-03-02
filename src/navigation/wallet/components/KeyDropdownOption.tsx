import React from 'react';
import {Wallet} from '../../../store/wallet/wallet.models';
import styled from 'styled-components/native';
import {Feather} from '../../../styles/colors';
import {
  ActiveOpacity,
  Column,
  Row,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {H5} from '../../../components/styled/Text';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {
  HeaderImg,
  Img,
  RemainingAssetsLabel,
  WALLET_DISPLAY_LIMIT,
} from '../../tabs/home/components/Wallet';
import {formatFiatAmount} from '../../../utils/helper-methods';
import AngleRight from '../../../../assets/img/angle-right.svg';

interface Props {
  keyId: string;
  keyName: string | undefined;
  wallets: Wallet[];
  totalBalance: number;
  onPress: (keyId: string) => void;
}

const OptionContainer = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? '#343434' : Feather)};
  border-radius: 12px;
  margin-bottom: ${ScreenGutter};
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  padding: 20px;
`;

const BaseText = styled(H5)`
  color: ${({theme}) => theme.colors.text};
`;

const KeyName = styled(BaseText)`
  margin-bottom: 5px;
`;

const Balance = styled(BaseText)`
  font-weight: 700;
`;

const KeyDropdownOption = ({
  keyId,
  keyName,
  wallets,
  totalBalance,
  onPress,
}: Props) => {
  const walletInfo = wallets.slice(0, WALLET_DISPLAY_LIMIT);
  const remainingAssetCount =
    wallets.length > WALLET_DISPLAY_LIMIT
      ? wallets.length - WALLET_DISPLAY_LIMIT
      : undefined;

  return (
    <OptionContainer
      activeOpacity={ActiveOpacity}
      onPress={() => onPress(keyId)}>
      <Row style={{alignItems: 'center', justifyContent: 'center'}}>
        <Column>
          <KeyName style={{marginBottom: 5}}>{keyName}</KeyName>
          <HeaderImg>
            {walletInfo.map((wallet, index) => {
              const {id, img} = wallet;
              return (
                wallet && (
                  <Img key={id} isFirst={index === 0}>
                    <CurrencyImage img={img} size={25} />
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
        </Column>
        <Row style={{alignItems: 'center', justifyContent: 'flex-end'}}>
          <Balance>{formatFiatAmount(totalBalance, 'USD')}</Balance>
          <AngleRight style={{marginLeft: 10}} />
        </Row>
      </Row>
    </OptionContainer>
  );
};

export default KeyDropdownOption;
