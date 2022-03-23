import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../../../../components/styled/Text';
import {SlateDark} from '../../../../styles/colors';
import {ScreenGutter} from '../../../../components/styled/Containers';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import {formatFiatAmount} from '../../../../utils/helper-methods';

const PortfolioContainer = styled.View`
  margin: 0 ${ScreenGutter};
`;

const PortfolioBalanceText = styled(BaseText)`
  font-weight: bold;
  font-size: 31px;
  color: ${({theme}) => theme.colors.text};
`;

const PercentagePill = styled.View`
  background-color: #cbf3e8;
  align-self: flex-start;
  border-radius: 7px;
  padding: 4px 8px;
  margin-right: 5px;
`;

const Row = styled.View`
  flex-direction: row;
  align-items: center;
`;

const PercentagePillText = styled(BaseText)`
  color: ${SlateDark};
`;

const SubTitle = styled(BaseText)`
  color: ${({theme}) => theme.colors.text};
`;

const PortfolioBalance = () => {
  const portfolioBalance = useSelector(
    ({WALLET}: RootState) => WALLET.portfolioBalance,
  );
  // const percentageDifference = '+2.5%';

  return (
    <PortfolioContainer>
      <PortfolioBalanceText>
        {formatFiatAmount(portfolioBalance.current, 'usd')}
      </PortfolioBalanceText>
      {/*<Row>*/}
      {/*  <PercentagePill>*/}
      {/*    <PercentagePillText>{percentageDifference}</PercentagePillText>*/}
      {/*  </PercentagePill>*/}
      {/*  <SubTitle>Last day</SubTitle>*/}
      {/*</Row>*/}
    </PortfolioContainer>
  );
};

export default PortfolioBalance;
