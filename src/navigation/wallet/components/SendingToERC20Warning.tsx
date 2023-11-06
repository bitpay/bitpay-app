import React from 'react';
import styled from 'styled-components/native';
import {BaseText, Paragraph} from '../../../components/styled/Text';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {SheetContainer} from '../../../components/styled/Containers';
import {
  Action,
  Black,
  LightBlack,
  SlateDark,
  White,
} from '../../../styles/colors';
import {
  getProtocolName,
  getBadgeImg,
  titleCasing,
} from '../../../utils/helper-methods';
import {useTranslation} from 'react-i18next';
import InfoSvg from '../../../../assets/img/info.svg';
import LinkIcon from '../../../components/icons/link-icon/LinkIcon';
import {BitpaySupportedEvmCoins} from '../../../constants/currencies';
import {Wallet} from '../../../store/wallet/wallet.models';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {Effect} from '../../../store';
import {useAppDispatch} from '../../../utils/hooks';

export const BchAddressTypes = ['Cash Address', 'Legacy'];

const CloseButton = styled.TouchableOpacity`
  margin: auto;
`;

const CloseButtonText = styled(Paragraph)`
  color: ${({theme: {dark}}) => (dark ? White : Action)};
`;

const SendingInfoContainer = styled.View`
  border-radius: 4px;
  margin-bottom: 20px;
`;

const SendingToHeader = styled.View`
  display: flex;
  align-items: center;
  flex-direction: row;
`;

export const ContractHeaderContainer = styled.View`
  justify-content: space-between;
  display: flex;
  flex-direction: row;
  padding: 10px 0px 10px 0px;
`;

export const TitleContainer = styled(BaseText)<{
  size?: number;
  marginLeft?: number;
}>`
  font-size: ${({size = 14}) => size}px;
  color: ${({theme}) => theme.colors.text};
  font-weight: bold;
  margin-left: ${({marginLeft = 0}) => marginLeft}px;
`;

export const ContractLink = styled(BaseText)`
  font-size: 14px;
  color: ${({theme}) => theme.colors.link};
  margin-left: 5px;
`;

export const ContractAddressText = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-weight: 500;
  border: 1px solid ${({theme: {dark}}) => (dark ? SlateDark : '#e1e4e7')};
  border-radius: 19.5px;
  padding: 9px 11px;
`;

const SendingToNetworkBadgeContainer = styled.View`
  flex-direction: row;
  padding: 10px 0px 10px 0px;
`;

const SendingToNetworkBadge = styled.View`
  display: flex;
  align-items: center;
  flex-direction: row;
  justify-content: flex-start;
  border: 1px solid ${({theme: {dark}}) => (dark ? SlateDark : '#e1e4e7')};
  border-radius: 19.5px;
  padding: 9px 11px;
`;

const SendingToNetwork = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-weight: 500;
  margin-left: 10px;
`;

const SendingToDescription = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  margin: 10px 0px 28px 0px;
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : '#ECEFFD')};
  line-height: 24px;
`;

export const LinkContainer = styled.View`
  flex-direction: row;
  align-items: center;
  display: flex;
`;

interface Props {
  isVisible: boolean;
  closeModal: () => void;
  wallet: Wallet;
}

export const viewOnBlockchain =
  (wallet: Wallet): Effect =>
  async dispatch => {
    const chain = wallet.chain.toLowerCase();
    const tokenAddress = wallet.credentials.token?.address;
    const url =
      wallet.network === 'livenet'
        ? `https://${BitpaySupportedEvmCoins[chain]?.paymentInfo.blockExplorerUrls}address/${tokenAddress}`
        : `https://${BitpaySupportedEvmCoins[chain]?.paymentInfo.blockExplorerUrlsTestnet}address/${tokenAddress}`;
    dispatch(openUrlWithInAppBrowser(url));
  };

const SendingToERC20Warning = ({isVisible, closeModal, wallet}: Props) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={closeModal}>
      <SheetContainer>
        <SendingInfoContainer>
          <SendingToHeader>
            <InfoSvg />
            <TitleContainer size={20} marginLeft={10}>
              {t('Sending to')}
            </TitleContainer>
          </SendingToHeader>
          <SendingToDescription>
            {t(
              'You are about to send COIN using the PROTOCOLNAME Network. Make sure your recipient is expecting this exact asset and network. BitPay is not responsible for any funds lost.',
              {
                coin: wallet.currencyAbbreviation.toUpperCase(),
                protocolName: titleCasing(
                  getProtocolName(wallet.chain, wallet.network)!,
                ),
              },
            )}
          </SendingToDescription>
          <TitleContainer>{t('Network')}</TitleContainer>
          <SendingToNetworkBadgeContainer>
            <SendingToNetworkBadge>
              <CurrencyImage
                img={getBadgeImg(wallet.currencyAbbreviation, wallet.chain)}
                size={25}
              />
              <SendingToNetwork>
                {titleCasing(getProtocolName(wallet.chain, wallet.network)!)}
              </SendingToNetwork>
            </SendingToNetworkBadge>
          </SendingToNetworkBadgeContainer>
          <ContractHeaderContainer>
            <TitleContainer>{t('Contract Address')}</TitleContainer>
            <LinkContainer>
              <LinkIcon />
              <ContractLink onPress={() => dispatch(viewOnBlockchain(wallet))}>
                {t('View Contract')}
              </ContractLink>
            </LinkContainer>
          </ContractHeaderContainer>
          <ContractAddressText>
            {wallet.credentials.token?.address}
          </ContractAddressText>
        </SendingInfoContainer>
        <CloseButton onPress={closeModal}>
          <CloseButtonText>{t('CLOSE')}</CloseButtonText>
        </CloseButton>
      </SheetContainer>
    </SheetModal>
  );
};

export default SendingToERC20Warning;
