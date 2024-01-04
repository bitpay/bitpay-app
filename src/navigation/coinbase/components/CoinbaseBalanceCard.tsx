import React from 'react';
import HomeCard from '../../../components/home-card/HomeCard';
import {
  formatFiatAmount,
  formatFiatAmountObj,
} from '../../../utils/helper-methods';
import {useNavigation} from '@react-navigation/native';
import CoinbaseSvg from '../../../../assets/img/logos/coinbase.svg';
import styled, {useTheme} from 'styled-components/native';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import {useAppSelector} from '../../../utils/hooks';
import {HomeCarouselLayoutType} from '../../../store/app/app.models';
import {Balance, KeyName} from '../../wallet/components/KeyDropdownOption';
import {BoxShadow} from '../../tabs/home/components/Styled';
import {H3} from '../../../components/styled/Text';
import {LightBlack, White} from '../../../styles/colors';
import {
  ActiveOpacity,
  Column,
  Row,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {
  BalanceCode,
  BalanceCodeContainer,
} from '../../tabs/home/components/Wallet';

interface CoinbaseCardComponentProps {
  layout: HomeCarouselLayoutType;
}

const ListCard = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-radius: 12px;
  margin: 10px ${ScreenGutter};
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  height: 75px;
`;

const HeaderImg = styled.View`
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
`;

const HeaderImgList = styled.View`
  width: 15px;
  height: 22px;
  align-items: center;
  justify-content: center;
`;

const HeaderComponent = (
  <HeaderImg>
    <CoinbaseSvg width="22" height="22" />
  </HeaderImg>
);

const HeaderComponentList = (
  <HeaderImgList>
    <CoinbaseSvg width="16" height="16" />
  </HeaderImgList>
);

const CoinbaseBalanceCard: React.FC<CoinbaseCardComponentProps> = ({
  layout,
}) => {
  const theme = useTheme();
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
      <ListCard
        activeOpacity={ActiveOpacity}
        onPress={onCTAPress}
        style={!theme.dark ? BoxShadow : null}>
        <Row style={{alignItems: 'center', justifyContent: 'center'}}>
          <Column>
            {HeaderComponentList}
            <KeyName>Coinbase</KeyName>
          </Column>
          <Column style={{justifyContent: 'center', alignItems: 'flex-end'}}>
            {!hideAllBalances ? (
              <Balance>
                {amount}
                {code ? (
                  <BalanceCodeContainer>
                    <BalanceCode>{code}</BalanceCode>
                  </BalanceCodeContainer>
                ) : null}
              </Balance>
            ) : (
              <H3>****</H3>
            )}
          </Column>
        </Row>
      </ListCard>
    );
  }

  return (
    <HomeCard header={HeaderComponent} body={body} onCTAPress={onCTAPress} />
  );
};

export default CoinbaseBalanceCard;
