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
import {H3, H5} from '../../../components/styled/Text';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {
  BalanceCode,
  BalanceCodeContainer,
  HeaderImg,
  Img,
  RemainingAssetsLabel,
  WALLET_DISPLAY_LIMIT,
} from '../../tabs/home/components/Wallet';
import {formatFiatAmountObj} from '../../../utils/helper-methods';
import AngleRight from '../../../../assets/img/angle-right.svg';
import {getRemainingWalletCount} from '../../../store/wallet/utils/wallet';
import {WalletRowProps} from '../../../components/list/WalletRow';
import {TouchableOpacity} from 'react-native-gesture-handler';

interface Props {
  optionId: string;
  optionName: string | undefined;
  wallets: WalletRowProps[] | Wallet[];
  totalBalance: number;
  onPress: (optionId: string) => void;
  defaultAltCurrencyIsoCode: string;
  hideKeyBalance: boolean;
}

export const OptionContainer = styled(TouchableOpacity)`
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

export const OptionName = styled(BaseText)``;

export const Balance = styled(BaseText)`
  font-weight: 700;
`;

const DropdownOption = ({
  optionId,
  optionName,
  wallets,
  totalBalance,
  defaultAltCurrencyIsoCode,
  hideKeyBalance,
  onPress,
}: Props) => {
  const _wallets = wallets.filter(
    wallet => !wallet.hideWallet && !wallet.hideWalletByAccount,
  );
  const walletInfo = _wallets.slice(0, WALLET_DISPLAY_LIMIT);
  const remainingWalletCount = getRemainingWalletCount(_wallets);

  const {amount, code} = formatFiatAmountObj(
    totalBalance,
    defaultAltCurrencyIsoCode,
  );

  return (
    <OptionContainer
      activeOpacity={ActiveOpacity}
      onPress={() => onPress(optionId)}>
      <Row style={{alignItems: 'center', justifyContent: 'center'}}>
        <Column>
          <OptionName style={{marginBottom: 5}}>{optionName}</OptionName>
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
              {remainingWalletCount ? (
                <RemainingAssetsLabel>
                  {' '}
                  + {remainingWalletCount} more{' '}
                </RemainingAssetsLabel>
              ) : null}
            </HeaderImg>
          ) : null}
        </Column>
        {!hideKeyBalance ? (
          <>
            <Row style={{alignItems: 'center', justifyContent: 'flex-end'}}>
              <Balance>
                {amount}
                {code ? (
                  <BalanceCodeContainer>
                    <BalanceCode>{code}</BalanceCode>
                  </BalanceCodeContainer>
                ) : null}
              </Balance>
              <AngleRight style={{marginLeft: 10}} />
            </Row>
          </>
        ) : (
          <H3>****</H3>
        )}
      </Row>
    </OptionContainer>
  );
};

export default DropdownOption;
