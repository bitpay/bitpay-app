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
    hideKeyBalance: hideAllBalances,
  };

  const ListRow = styled(Row)`
    align-items: center;
    justify-content: space-between;
    width: 100%;
  `;

  const ShrinkColumn = styled(Column)`
    flex-shrink: 1;
  `;

  const ListHeaderRow = styled(Row)`
    align-items: center;
    justify-content: flex-end;
  `;

  const HeaderColumn = styled(Column)`
    justify-content: center;
    align-items: flex-end;
    margin-right: 12px;
  `;

  const FooterHeaderImg = styled(HeaderImg)`
    margin-right: 12px;
  `;

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
