import React from 'react';
import {StyleSheet, Text, TextProps} from 'react-native';
import {useTheme} from '../../../contexts';
import {Wallet} from '../../../store/wallet/wallet.models';
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
import {
  TouchableOpacity,
  TouchableOpacityProps,
} from '@components/base/TouchableOpacity';

interface Props {
  optionId: string;
  optionName: string | undefined;
  wallets: WalletRowProps[] | Wallet[];
  totalBalance: number;
  onPress: (optionId: string) => void;
  defaultAltCurrencyIsoCode: string;
  hideKeyBalance: boolean;
}

const styles = StyleSheet.create({
  optionContainer: {
    borderRadius: 12,
    marginBottom: parseInt(ScreenGutter, 10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: 20,
  },
  balanceHiddenText: {
    fontSize: 20,
    lineHeight: 24,
    flexShrink: 1,
    marginBottom: -9,
  },
  balanceShownText: {
    fontSize: 16,
    lineHeight: 20,
  },
  balanceBase: {
    fontWeight: '400',
  },
});

export const OptionContainer: React.FC<TouchableOpacityProps> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.optionContainer,
        {backgroundColor: theme.dark ? '#343434' : Feather},
        style,
      ]}
      {...rest}
    />
  );
};

export const OptionName = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    return <H5 ref={ref} style={style} {...rest} />;
  },
);
OptionName.displayName = 'OptionName';

interface BalanceProps {
  hidden?: boolean;
}

export const Balance = React.forwardRef<Text, BalanceProps & TextProps>(
  ({hidden, style, ...rest}, ref) => {
    return (
      <H5
        ref={ref}
        style={[
          styles.balanceBase,
          hidden ? styles.balanceHiddenText : styles.balanceShownText,
          style,
        ]}
        {...rest}
      />
    );
  },
);
Balance.displayName = 'Balance';

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
          <Balance hidden>****</Balance>
        )}
      </Row>
    </OptionContainer>
  );
};

export default DropdownOption;
