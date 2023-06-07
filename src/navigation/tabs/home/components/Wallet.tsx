import React from 'react';
import styled, {useTheme} from 'styled-components/native';
import {BaseText, H3} from '../../../../components/styled/Text';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {
  LightBlack,
  NeutralSlate,
  Slate,
  Slate30,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {formatFiatAmountObj} from '../../../../utils/helper-methods';
import {getRemainingWalletCount} from '../../../../store/wallet/utils/wallet';
import {
  ActiveOpacity,
  Column,
  Row,
  ScreenGutter,
} from '../../../../components/styled/Containers';
import {Balance, KeyName} from '../../../wallet/components/KeyDropdownOption';
import {BoxShadow} from './Styled';
import {View} from 'react-native';
import Percentage from '../../../../components/percentage/Percentage';
import {useAppSelector} from '../../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import AngleRightSvg from '../../../../../assets/img/angle-right.svg';

interface WalletCardComponentProps {
  wallets: Wallet[];
  totalBalance: number;
  percentageDifference: number;
  onPress: () => void;
  needsBackup: boolean;
  keyName: string | undefined;
  hideKeyBalance: boolean;
  context?: 'keySelector';
}

export const HeaderImg = styled.View`
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
`;

export const ListCard = styled.TouchableOpacity<{outlineStyle?: boolean}>`
  border: ${({outlineStyle, theme}) =>
    outlineStyle ? `1px solid ${theme.dark ? SlateDark : Slate30}` : 'none'};
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-radius: 12px;
  margin: ${({outlineStyle}) =>
    outlineStyle ? `0px 0px ${ScreenGutter} 0px` : `10px ${ScreenGutter}`};
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  height: 75px;
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

const NeedBackupText = styled(BaseText)`
  font-size: 12px;
  text-align: center;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  padding: 2px 4px;
  border: 1px solid ${({theme: {dark}}) => (dark ? White : Slate30)};
  border-radius: 3px;
`;

export const BalanceCode = styled(BaseText)`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? NeutralSlate : SlateDark)};
  font-weight: 500;
`;

export const BalanceCodeContainer = styled.View`
  padding-left: 2px;
`;

export const WALLET_DISPLAY_LIMIT = 3;
export const ICON_SIZE = 20;

const WalletCardComponent: React.FC<WalletCardComponentProps> = ({
  wallets,
  totalBalance,
  percentageDifference,
  onPress,
  needsBackup,
  keyName = 'My Key',
  hideKeyBalance,
  context,
}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const walletInfo = wallets.slice(0, WALLET_DISPLAY_LIMIT);
  const remainingWalletCount = getRemainingWalletCount(wallets);
  const HeaderComponent = (
    <HeaderImg>
      {walletInfo.map((wallet, index) => {
        const {id, img} = wallet;
        return (
          wallet && (
            <Img key={id} isFirst={index === 0}>
              <CurrencyImage img={img} size={15} />
            </Img>
          )
        );
      })}
      {remainingWalletCount ? (
        <View style={{paddingBottom: 5}}>
          <RemainingAssetsLabel>
            + {remainingWalletCount} {t('more')}{' '}
          </RemainingAssetsLabel>
        </View>
      ) : null}
    </HeaderImg>
  );

  /* ////////////////////////////// LISTVIEW */
  const {amount, code} = formatFiatAmountObj(
    totalBalance,
    defaultAltCurrency.isoCode,
  );
  return (
    <ListCard
      activeOpacity={ActiveOpacity}
      onPress={onPress}
      style={!theme.dark && context !== 'keySelector' ? BoxShadow : null}
      outlineStyle={context === 'keySelector'}>
      <Row style={{alignItems: 'center', justifyContent: 'center'}}>
        <Column>
          {HeaderComponent}
          <KeyName>{keyName}</KeyName>
        </Column>
        <Column style={{justifyContent: 'center', alignItems: 'flex-end'}}>
          {needsBackup ? (
            <Row style={{alignItems: 'center'}}>
              <NeedBackupText>{t('Needs Backup')}</NeedBackupText>
              {context === 'keySelector' ? (
                <AngleRightSvg style={{marginLeft: 10}} />
              ) : null}
            </Row>
          ) : context === 'keySelector' ? (
            <AngleRightSvg />
          ) : !hideKeyBalance ? (
            <>
              <Balance>
                {amount}
                {code ? (
                  <BalanceCodeContainer>
                    <BalanceCode>{code}</BalanceCode>
                  </BalanceCodeContainer>
                ) : null}
              </Balance>
              {percentageDifference ? (
                <Percentage
                  percentageDifference={percentageDifference}
                  darkModeColor={Slate}
                />
              ) : null}
            </>
          ) : (
            <H3>****</H3>
          )}
        </Column>
      </Row>
    </ListCard>
  );
};

export default WalletCardComponent;
