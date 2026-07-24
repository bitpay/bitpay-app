import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import HomeCard from '../../../../components/home-card/HomeCard';
import {BaseText} from '../../../../components/styled/Text';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {
  Black,
  CharcoalBlack,
  LightBlack,
  NeutralSlate,
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
import {maskIfHidden} from '../../../../utils/hideBalances';
import {isUnitedKingdomCountry} from '../../../../store/location/location.effects';
import ThresholdBadge from '../../../../components/threshold-badge/ThresholdBadge';
import MultisigBadge from '../../../../components/multisig-badge/MultisigBadge';

interface WalletCardComponentProps {
  wallets: Wallet[];
  totalBalance: number;
  percentageDifference: number | null;
  onPress: () => void;
  needsBackup: boolean;
  keyName: string | undefined;
  layout: HomeCarouselLayoutType;
  hideKeyBalance: boolean;
  context?: 'keySelector';
  pendingTssSession?: boolean;
  tssMetadata?: {m: number; n: number};
  isMultisig?: boolean;
}

const walletStyles = StyleSheet.create({
  headerImg: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
  },
  listCard: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    height: 75,
  },
  img: {
    minHeight: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remainingAssetsLabel: {
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 18,
    letterSpacing: 0,
    marginLeft: 5,
  },
  needBackupText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 3,
  },
  balanceContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  balanceCode: {
    fontSize: 12,
    fontWeight: '500',
  },
  balanceCodeContainer: {
    paddingLeft: 2,
  },
  supportedNetworkIconContainer: {
    borderWidth: 1,
    borderRadius: 20,
    height: 30,
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 7,
    justifyContent: 'center',
  },
  remainingAssetsContainer: {
    paddingBottom: 0,
  },
  listRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  needBackupRow: {
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  footerSupportedNetworkIconContainer: {
    marginRight: 12,
  },
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  keyName: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  listWalletCard: {
    borderRadius: 12,
    padding: 16,
    height: 78,
  },
  listIconRow: {
    marginBottom: 4,
  },
  listLeftColumn: {
    flex: 1,
  },
  listRightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    marginLeft: 12,
  },
  listBalance: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    textAlign: 'right',
  },
  listPercentageRow: {
    marginTop: 3,
  },
});

export const HeaderImg: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[walletStyles.headerImg, style]} {...rest} />;

export const ListCard: React.FC<
  React.ComponentProps<typeof TouchableOpacity> & {outlineStyle?: boolean}
> = ({outlineStyle, style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        walletStyles.listCard,
        {
          borderColor: theme.dark
            ? !outlineStyle
              ? LightBlack
              : SlateDark
            : Slate30,
          backgroundColor: theme.dark
            ? !outlineStyle
              ? CharcoalBlack
              : 'none'
            : White,
        },
        outlineStyle
          ? {
              marginTop: 0,
              marginRight: 0,
              marginBottom: parseInt(ScreenGutter, 10),
              marginLeft: 0,
            }
          : {
              marginTop: 8,
              marginBottom: 8,
              marginHorizontal: parseInt(ScreenGutter, 10),
            },
        style,
      ]}
      {...rest}
    />
  );
};

export const Img: React.FC<
  React.ComponentProps<typeof View> & {isFirst: boolean}
> = ({isFirst, style, ...rest}) => (
  <View
    style={[walletStyles.img, {marginLeft: isFirst ? 0 : -5}, style]}
    {...rest}
  />
);

export const RemainingAssetsLabel: React.FC<
  React.ComponentProps<typeof BaseText>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        walletStyles.remainingAssetsLabel,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const NeedBackupText: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        walletStyles.needBackupText,
        {
          color: theme.dark ? White : SlateDark,
          borderColor: theme.dark ? SlateDark : Slate30,
        },
      ]}>
      {children}
    </BaseText>
  );
};

export const BalanceContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={walletStyles.balanceContainer}>{children}</View>;

export const BalanceCode: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        walletStyles.balanceCode,
        {color: theme.dark ? NeutralSlate : SlateDark},
      ]}>
      {children}
    </BaseText>
  );
};

export const BalanceCodeContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={walletStyles.balanceCodeContainer}>{children}</View>;

export const SupportedNetworkIconContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        walletStyles.supportedNetworkIconContainer,
        {borderColor: theme.dark ? LightBlack : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const RemainingAssetsContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={walletStyles.remainingAssetsContainer}>{children}</View>;

const ListRow: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <Row style={walletStyles.listRow}>{children}</Row>
);

const NeedBackupRow: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={walletStyles.needBackupRow}>{children}</View>
);

const FooterSupportedNetworkIconContainer: React.FC<{
  children?: React.ReactNode;
}> = ({children}) => (
  <SupportedNetworkIconContainer
    style={walletStyles.footerSupportedNetworkIconContainer}>
    {children}
  </SupportedNetworkIconContainer>
);

const FooterContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <Row style={walletStyles.footerContainer}>{children}</Row>;

const KeyName: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[walletStyles.keyName, {color: theme.dark ? White : Black}]}>
      {children}
    </BaseText>
  );
};

const ListWalletCard: React.FC<React.ComponentProps<typeof ListCard>> = ({
  style,
  ...rest
}) => <ListCard style={[walletStyles.listWalletCard, style]} {...rest} />;

const ListIconRow: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <HeaderImg style={walletStyles.listIconRow}>{children}</HeaderImg>
);

const ListLeftColumn: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <Column style={walletStyles.listLeftColumn}>{children}</Column>
);

const ListRightColumn: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <Column style={walletStyles.listRightColumn}>{children}</Column>;

const ListBalance: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[walletStyles.listBalance, {color: theme.dark ? White : Black}]}>
      {children}
    </BaseText>
  );
};

const ListPercentageRow: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={walletStyles.listPercentageRow}>{children}</View>;

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
  pendingTssSession,
  tssMetadata,
  isMultisig,
}) => {
  const {t} = useTranslation();
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const isUkLocation = useAppSelector(({LOCATION}) => {
    return isUnitedKingdomCountry(LOCATION.locationData?.countryShortCode);
  });
  const percentageSuffix = isUkLocation ? ' in 24hr' : undefined;
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
        testID={`wallet-card-${keyName}`}
        accessibilityLabel={`${keyName} wallet`}
        onPress={onPress}
        outlineStyle={context === 'keySelector'}>
        <ListRow>
          <ListLeftColumn>
            {needsBackup && !pendingTssSession ? (
              <NeedBackupRow>
                <NeedBackupText>{t('Needs Backup')}</NeedBackupText>
              </NeedBackupRow>
            ) : (
              <ListIconRow>
                {SupportedNetworkIcons}
                {tssMetadata ? (
                  <ThresholdBadge
                    m={tssMetadata.m}
                    n={tssMetadata.n}
                    size={'list'}
                    style={{marginLeft: 4}}
                  />
                ) : null}
                {isMultisig ? (
                  <MultisigBadge size={'list'} style={{marginLeft: 4}} />
                ) : null}
              </ListIconRow>
            )}
            <KeyName>{keyName}</KeyName>
          </ListLeftColumn>
          <ListRightColumn>
            <ListBalance>{maskIfHidden(hideKeyBalance, amount)}</ListBalance>
            {!hideKeyBalance && percentageDifference !== null ? (
              <ListPercentageRow>
                <Percentage
                  percentageDifference={percentageDifference}
                  hideArrow={true}
                  suffix={percentageSuffix}
                  fractionDigits={2}
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
        percentageSuffix,
        needsBackup,
        hideKeyBalance,
        pendingTssSession,
        tssMetadata,
        isMultisig,
      }}
      footer={CardFooter}
      onCTAPress={onPress}
    />
  );
};

export default WalletCardComponent;
