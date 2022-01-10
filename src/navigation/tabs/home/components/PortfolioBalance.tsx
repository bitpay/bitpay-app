import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../../../../components/styled/Text';
import {Feather, SlateDark} from '../../../../styles/colors';
import {ScreenGutter} from '../../../../components/styled/Containers';

const ProfileContainer = styled.View`
  margin: 0 ${ScreenGutter};
`;
const Title = styled(BaseText)`
  font-size: 14px;
  line-height: 19px;
  color: ${({theme: {dark}}) => (dark ? Feather : SlateDark)};
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
  //  TODO: update me
  const portfolioBalance = '$98,140.12 USD ';
  const percentageDifference = '+2.5%';

  return (
    <ProfileContainer>
      <Title>Portfolio Balance</Title>
      <PortfolioBalanceText>{portfolioBalance}</PortfolioBalanceText>
      <Row>
        <PercentagePill>
          <PercentagePillText>{percentageDifference}</PercentagePillText>
        </PercentagePill>
        <SubTitle>Last day</SubTitle>
      </Row>
    </ProfileContainer>
  );
};

export default PortfolioBalance;
