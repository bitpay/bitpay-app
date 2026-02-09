import React from 'react';
import styled from 'styled-components/native';
import HomeCard from '../../../../components/home-card/HomeCard';
import {BaseText} from '../../../../components/styled/Text';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {
  Black,
  LightBlack,
  NeutralSlate,
  Slate,
  Slate30,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {
  formatFiatAmount,
  formatFiatAmountObj,
} from '../../../../utils/helper-methods';
import {getRemainingWalletCount} from '../../../../store/wallet/utils/wallet';
import {
  ActiveOpacity,
  Column,
  Row,
  ScreenGutter,
} from '../../../../components/styled/Containers';
import {HomeCarouselLayoutType} from '../../../../store/app/app.models';
import Percentage from '../../../../components/percentage/Percentage';
import {useAppSelector} from '../../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import ArrowRightSvg from './ArrowRightSvg';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

interface WalletCardComponentProps {
  wallets: Wallet[];
  totalBalance: number;
  percentageDifference: number;
  onPress: () => void;
  needsBackup: boolean;
  keyName: string | undefined;
  layout: HomeCarouselLayoutType;
  hideKeyBalance: boolean;
  context?: 'keySelector';
}

export const HeaderImg = styled.View`
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
`;

export const ListCard = styled(TouchableOpacity)<{outlineStyle?: boolean}>`
  border: ${({theme, outlineStyle}) =>
    `1px solid ${
      theme.dark ? (!outlineStyle ? LightBlack : SlateDark) : Slate30
    }`};
  background-color: ${({theme: {dark}, outlineStyle}) =>
    dark ? (!outlineStyle ? '#111' : 'none') : White};
  border-radius: 12px;
  margin: ${({outlineStyle}) =>
    outlineStyle ? `0px 0px ${ScreenGutter} 0px` : `8px ${ScreenGutter}`};
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  height: 75px;
`;

export const Img = styled.View<{isFirst: boolean}>`
  min-height: 22px;
  margin-left: ${({isFirst}) => (isFirst ? 0 : '-5px')};
  justify-content: center;
  align-items: center;
`;

export const RemainingAssetsLabel = styled(BaseText)`
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
  line-height: 18px;
  letter-spacing: 0;
  color: ${Slate};
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  margin-left: 5px;
`;

const NeedBackupText = styled(BaseText)`
  font-size: 12px;
  text-align: center;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  padding: 2px 4px;
  border: 1px solid ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  border-radius: 3px;
`;

export const BalanceContainer = styled.View`
  flex-direction: row;
  gap: 6px;
  margin-top: 4px;
`;

export const BalanceCode = styled(BaseText)`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? NeutralSlate : SlateDark)};
  font-weight: 500;
`;

export const BalanceCodeContainer = styled.View`
  padding-left: 2px;
`;

export const SupportedNetworkIconContainer = styled.View`
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  border-radius: 20px;
  height: 30px;
  align-items: center;
  padding-left: 4px;
  padding-right: 7px;
  justify-content: center;
`;

const RemainingAssetsContainer = styled.View`
  padding-bottom: 0px;
`;

const ListRow = styled(Row)`
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const NeedBackupRow = styled.View`
  align-items: flex-start;
  margin-bottom: 4px;
`;

const FooterSupportedNetworkIconContainer = styled(
  SupportedNetworkIconContainer,
)`
  margin-right: 12px;
`;

const FooterContainer = styled(Row)`
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const KeyName = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
`;

const ListWalletCard = styled(ListCard)`
  border-radius: 12px;
  padding: 16px;
  height: 78px;
`;

const ListIconRow = styled(HeaderImg)`
  margin-bottom: 4px;
`;

const ListLeftColumn = styled(Column)`
  flex: 1;
`;

const ListRightColumn = styled(Column)`
  align-items: flex-end;
  justify-content: flex-start;
  margin-left: 12px;
`;

const ListBalance = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  text-align: right;
`;

const ListPercentageRow = styled.View`
  margin-top: 3px;
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
  layout,
  context,
}) => {
  const {t} = useTranslation();
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const walletInfo = wallets.slice(0, WALLET_DISPLAY_LIMIT);
  const remainingWalletCount = getRemainingWalletCount(wallets);
  const isListView = layout === 'listView';
  const SupportedNetworkIcons = (
    <HeaderImg>
      {walletInfo.map((wallet, index) => {
        const {id, img} = wallet;
        return (
          wallet && (
            <Img key={id} isFirst={index === 0}>
              <CurrencyImage img={img} size={isListView ? 15 : ICON_SIZE} />
            </Img>
          )
        );
      })}
      {remainingWalletCount ? (
        <RemainingAssetsContainer>
          <RemainingAssetsLabel>+ {remainingWalletCount}</RemainingAssetsLabel>
        </RemainingAssetsContainer>
      ) : null}
    </HeaderImg>
  );

  /* ////////////////////////////// LISTVIEW */
  if (layout === 'listView') {
    const {amount} = formatFiatAmountObj(
      totalBalance,
      defaultAltCurrency.isoCode,
    );
    return (
      <ListWalletCard
        activeOpacity={ActiveOpacity}
        onPress={onPress}
        outlineStyle={context === 'keySelector'}>
        <ListRow>
          <ListLeftColumn>
            {needsBackup ? (
              <NeedBackupRow>
                <NeedBackupText>{t('Needs Backup')}</NeedBackupText>
              </NeedBackupRow>
            ) : (
              <ListIconRow>{SupportedNetworkIcons}</ListIconRow>
            )}
            <KeyName>{keyName}</KeyName>
          </ListLeftColumn>
          <ListRightColumn>
            <ListBalance>{hideKeyBalance ? '****' : amount}</ListBalance>
            {!hideKeyBalance && percentageDifference ? (
              <ListPercentageRow>
                <Percentage
                  percentageDifference={percentageDifference}
                  hideArrow={true}
                  textStyle={{
                    textAlign: 'right',
                    fontSize: 13,
                    fontWeight: '400',
                    lineHeight: 20,
                  }}
                />
              </ListPercentageRow>
            ) : null}
          </ListRightColumn>
        </ListRow>
      </ListWalletCard>
    );
  }

  // todo refactor to not use multiple layers for home card as it will no longer be used for anything other then keys

  /* ////////////////////////////// CAROUSEL */
  const CardFooter = (
    <FooterContainer>
      <FooterSupportedNetworkIconContainer>
        {SupportedNetworkIcons}
      </FooterSupportedNetworkIconContainer>
      <ArrowRightSvg />
    </FooterContainer>
  );

  return (
    <HomeCard
      body={{
        title: keyName,
        value: formatFiatAmount(totalBalance, defaultAltCurrency.isoCode),
        percentageDifference,
        needsBackup,
        hideKeyBalance,
      }}
      footer={CardFooter}
      onCTAPress={onPress}
    />
  );
};

export default WalletCardComponent;
