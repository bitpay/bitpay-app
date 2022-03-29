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
import {getRemainingWalletCount} from '../../../store/wallet/utils/wallet';

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
  const _wallets = wallets.filter(wallet => !wallet.hideWallet);
  const walletInfo = _wallets.slice(0, WALLET_DISPLAY_LIMIT);
  const remainingWalletCount = getRemainingWalletCount(_wallets);

  return (
    <OptionContainer
      activeOpacity={ActiveOpacity}
      onPress={() => onPress(keyId)}>
      <Row style={{alignItems: 'center', justifyContent: 'center'}}>
        <Column>
          <KeyName style={{marginBottom: 5}}>{keyName}</KeyName>
          {walletInfo.length > 0 ? (
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
              {remainingWalletCount && (
                <RemainingAssetsLabel>
                  + {remainingWalletCount} more
                </RemainingAssetsLabel>
              )}
            </HeaderImg>
          ) : null}
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
