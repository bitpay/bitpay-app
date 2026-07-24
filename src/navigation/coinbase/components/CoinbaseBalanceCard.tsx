import React from 'react';
import HomeCard from '../../../components/home-card/HomeCard';
import {
  formatFiatAmount,
  formatFiatAmountObj,
} from '../../../utils/helper-methods';
import {useNavigation} from '@react-navigation/native';
import CoinbaseSvg from '../../../../assets/img/logos/coinbase.svg';
import {View, ViewProps, Text, TextProps, StyleSheet} from 'react-native';
import {useTheme} from '../../../contexts';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import {useAppSelector} from '../../../utils/hooks';
import {HomeCarouselLayoutType} from '../../../store/app/app.models';
import {
  ActiveOpacity,
  Column,
  Row,
} from '../../../components/styled/Containers';
import {
  BalanceCode,
  BalanceCodeContainer,
  BalanceContainer,
  ListCard,
} from '../../tabs/home/components/Wallet';
import {Balance} from '../../wallet/components/DropdownOption';
import ArrowRightSvg from '../../tabs/home/components/ArrowRightSvg';
import {BaseText} from '../../../components/styled/Text';
import {Slate30, SlateDark} from '../../../styles/colors';

interface CoinbaseCardComponentProps {
  layout: HomeCarouselLayoutType;
}

const styles = StyleSheet.create({
  headerImg: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
  },
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  coinbaseLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  listRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  shrinkColumn: {
    flexShrink: 1,
  },
  listHeaderRow: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerColumn: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginRight: 12,
  },
  footerHeaderImg: {
    marginRight: 12,
  },
});

const HeaderImg = React.forwardRef<View, ViewProps>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.headerImg, style]} {...rest} />
));

const FooterContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof Row>
>(({style, ...rest}, ref) => (
  <Row ref={ref} style={[styles.footerContainer, style]} {...rest} />
));

const CoinbaseLabel = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.coinbaseLabel,
          {color: theme.dark ? Slate30 : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);

const CoinbaseBalanceCard: React.FC<CoinbaseCardComponentProps> = ({
  layout,
}) => {
  const navigation = useNavigation();
  const onCTAPress = () => {
    navigation.navigate('CoinbaseRoot');
  };
  const balance =
    useAppSelector(({COINBASE}) => COINBASE.balance[COINBASE_ENV]) || 0.0;
  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);

  const {amount, code} = formatFiatAmountObj(
    balance,
    defaultAltCurrency.isoCode,
  );

  const body = {
    title: 'Coinbase',
    value: formatFiatAmount(balance, defaultAltCurrency.isoCode),
    hideKeyBalance: hideAllBalances,
  };

  const ListRow = ({
    style,
    ...rest
  }: React.ComponentProps<typeof Row>) => (
    <Row style={[styles.listRow, style]} {...rest} />
  );

  const ShrinkColumn = ({
    style,
    ...rest
  }: React.ComponentProps<typeof Column>) => (
    <Column style={[styles.shrinkColumn, style]} {...rest} />
  );

  const ListHeaderRow = ({
    style,
    ...rest
  }: React.ComponentProps<typeof Row>) => (
    <Row style={[styles.listHeaderRow, style]} {...rest} />
  );

  const HeaderColumn = ({
    style,
    ...rest
  }: React.ComponentProps<typeof Column>) => (
    <Column style={[styles.headerColumn, style]} {...rest} />
  );

  const FooterHeaderImg = ({
    style,
    ...rest
  }: React.ComponentProps<typeof HeaderImg>) => (
    <HeaderImg style={[styles.footerHeaderImg, style]} {...rest} />
  );

  if (layout === 'listView') {
    return (
      <ListCard activeOpacity={ActiveOpacity} onPress={onCTAPress}>
        <ListRow>
          <ShrinkColumn>
            <CoinbaseLabel>Coinbase</CoinbaseLabel>
            {!hideAllBalances ? (
              <BalanceContainer>
                <Balance>
                  {amount}
                  {code ? (
                    <BalanceCodeContainer>
                      <BalanceCode>{code}</BalanceCode>
                    </BalanceCodeContainer>
                  ) : null}
                </Balance>
              </BalanceContainer>
            ) : (
              <Balance hidden>****</Balance>
            )}
          </ShrinkColumn>
          <ListHeaderRow>
            <HeaderColumn>
              <HeaderImg>
                <CoinbaseSvg width="20" height="20" />
              </HeaderImg>
            </HeaderColumn>
            <ArrowRightSvg />
          </ListHeaderRow>
        </ListRow>
      </ListCard>
    );
  }

  const FooterComponent = (
    <FooterContainer>
      <FooterHeaderImg>
        <CoinbaseSvg width="22" height="22" />
      </FooterHeaderImg>
      <ArrowRightSvg />
    </FooterContainer>
  );

  return (
    <HomeCard body={body} footer={FooterComponent} onCTAPress={onCTAPress} />
  );
};

export default CoinbaseBalanceCard;
