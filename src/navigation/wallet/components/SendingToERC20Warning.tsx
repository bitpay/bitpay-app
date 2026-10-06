import React from 'react';
import {StyleSheet, Text, TextProps, View} from 'react-native';
import {useTheme} from '../../../contexts';
import {BaseText, Paragraph} from '../../../components/styled/Text';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {
  CloseButtonContainer,
  SheetContainer,
} from '../../../components/styled/Containers';
import {
  Action,
  Black,
  LightBlack,
  LightBlue,
  Slate30,
  SlateDark,
  White,
} from '../../../styles/colors';
import {
  getProtocolName,
  getBadgeImg,
  titleCasing,
  formatCurrencyAbbreviation,
} from '../../../utils/helper-methods';
import {useTranslation} from 'react-i18next';
import InfoSvg from '../../../../assets/img/info.svg';
import LinkIcon from '../../../components/icons/link-icon/LinkIcon';
import {
  BitpaySupportedEvmCoins,
  BitpaySupportedSvmCoins,
} from '../../../constants/currencies';
import {Wallet} from '../../../store/wallet/wallet.models';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {Effect} from '../../../store';
import {useAppDispatch} from '../../../utils/hooks';
import {IsSVMChain} from '../../../store/wallet/utils/currency';

export const BchAddressTypes = ['Cash Address', 'Legacy'];

const styles = StyleSheet.create({
  sendingInfoContainer: {
    borderRadius: 4,
    marginBottom: 20,
  },
  sendingToHeader: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
  },
  contractHeaderContainer: {
    justifyContent: 'space-between',
    display: 'flex',
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  titleContainer: {
    fontWeight: 'bold',
  },
  contractLink: {
    fontSize: 14,
    marginLeft: 5,
  },
  contractAddressText: {
    fontSize: 14,
    fontWeight: '500',
    borderWidth: 1,
    borderRadius: 19.5,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  sendingToNetworkBadgeContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  sendingToNetworkBadge: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderRadius: 19.5,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  sendingToNetwork: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
  sendingToDescription: {
    fontSize: 16,
    marginTop: 10,
    marginRight: 0,
    marginBottom: 28,
    marginLeft: 0,
    borderBottomWidth: 1,
    lineHeight: 24,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    display: 'flex',
  },
});

const CloseButtonText = ({style, ...rest}: TextProps) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[{color: theme.dark ? White : Action}, style]}
      {...rest}
    />
  );
};

const SendingInfoContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.sendingInfoContainer, style]} {...rest} />
);

const SendingToHeader = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.sendingToHeader, style]} {...rest} />
);

export const ContractHeaderContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.contractHeaderContainer, style]} {...rest} />
);

interface TitleContainerProps {
  size?: number;
  marginLeft?: number;
}

export const TitleContainer = React.forwardRef<
  Text,
  TitleContainerProps & TextProps
>(({size = 14, marginLeft = 0, style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.titleContainer,
        {fontSize: size, color: theme.colors.text, marginLeft},
        style,
      ]}
      {...rest}
    />
  );
});
TitleContainer.displayName = 'TitleContainer';

export const ContractLink = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[styles.contractLink, {color: theme.colors.link}, style]}
        {...rest}
      />
    );
  },
);
ContractLink.displayName = 'ContractLink';

export const ContractAddressText = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.contractAddressText,
          {
            color: theme.dark ? White : SlateDark,
            borderColor: theme.dark ? SlateDark : Slate30,
          },
          style,
        ]}
        {...rest}
      />
    );
  },
);
ContractAddressText.displayName = 'ContractAddressText';

const SendingToNetworkBadgeContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.sendingToNetworkBadgeContainer, style]} {...rest} />
);

const SendingToNetworkBadge = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.sendingToNetworkBadge,
        {borderColor: theme.dark ? SlateDark : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const SendingToNetwork = ({style, ...rest}: TextProps) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.sendingToNetwork,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const SendingToDescription = ({style, ...rest}: TextProps) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.sendingToDescription,
        {
          color: theme.dark ? White : Black,
          borderBottomColor: theme.dark ? LightBlack : LightBlue,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export const LinkContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.linkContainer, style]} {...rest} />
);

interface Props {
  isVisible: boolean;
  closeModal: () => void;
  wallet: Wallet;
}

export const viewOnBlockchain =
  (wallet: Wallet, address?: string): Effect =>
  async dispatch => {
    const chain = wallet.chain.toLowerCase();
    const tokenAddress = address ?? wallet.credentials.token?.address;
    let url: string;
    if (IsSVMChain(chain)) {
      // SVM
      url = `https://${
        BitpaySupportedSvmCoins[chain]?.paymentInfo[
          wallet.network === 'livenet'
            ? 'blockExplorerUrls'
            : 'blockExplorerUrlsTestnet'
        ]
      }token/${tokenAddress}${
        wallet.network === 'testnet' ? '?cluster=testnet' : ''
      }`;
    } else {
      // EVM
      url = `https://${
        BitpaySupportedEvmCoins[chain]?.paymentInfo[
          wallet.network === 'livenet'
            ? 'blockExplorerUrls'
            : 'blockExplorerUrlsTestnet'
        ]
      }address/${tokenAddress}`;
    }
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
                coin: formatCurrencyAbbreviation(wallet.currencyAbbreviation),
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
        <CloseButtonContainer onPress={closeModal}>
          <CloseButtonText>{t('CLOSE')}</CloseButtonText>
        </CloseButtonContainer>
      </SheetContainer>
    </SheetModal>
  );
};

export default SendingToERC20Warning;
