import React from 'react';
import HomeCard from '../../../components/home-card/HomeCard';
import {
  formatFiatAmount,
  formatFiatAmountObj,
} from '../../../utils/helper-methods';
import {useNavigation} from '@react-navigation/native';
import CoinbaseSvg from '../../../../assets/img/logos/coinbase.svg';
import styled from 'styled-components/native';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import {useAppSelector} from '../../../utils/hooks';
import {HomeCarouselLayoutType} from '../../../store/app/app.models';
import {H3} from '../../../components/styled/Text';
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

const HeaderImg = styled.View`
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  margin-right: 0px;
`;

const FooterContainer = styled(Row)`
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const CoinbaseLabel = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  font-size: 12px;
  font-weight: 400;
`;

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
    hideKeyBalance: false, // TODO: adds this function to Coinbase Settings
  };

  if (layout === 'listView') {
    return (
      <ListCard activeOpacity={ActiveOpacity} onPress={onCTAPress}>
        <Row
          style={{
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}>
          <Column style={{flexShrink: 1}}>
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
              <H3>****</H3>
            )}
          </Column>
          <Row style={{alignItems: 'center'}}>
            {!hideAllBalances ? (
              <Column
                style={{
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  marginRight: 12,
                }}>
                <HeaderImg>
                  <CoinbaseSvg width="20" height="20" />
                </HeaderImg>
              </Column>
            ) : null}
            <ArrowRightSvg />
          </Row>
        </Row>
      </ListCard>
    );
  }

  const FooterComponent = (
    <FooterContainer>
      <HeaderImg style={{marginRight: 12}}>
        <CoinbaseSvg width="22" height="22" />
      </HeaderImg>
      <ArrowRightSvg />
    </FooterContainer>
  );

  return (
    <HomeCard body={body} footer={FooterComponent} onCTAPress={onCTAPress} />
  );
};

export default CoinbaseBalanceCard;
