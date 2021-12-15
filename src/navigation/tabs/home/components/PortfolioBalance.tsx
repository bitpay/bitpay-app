import React from 'react';
import {StyleProp, Text, TextStyle} from 'react-native';
import styled from 'styled-components/native';
import {BaseText} from '../../../../components/styled/Text';
import {Feather, SlateDark} from '../../../../styles/colors';
import {useTheme} from '@react-navigation/native';
import {ScreenGutter} from '../../../../components/styled/Containers';

const ProfileContainer = styled.View`
  margin: 0 ${ScreenGutter};
`;
const Header = styled(BaseText)<{isDark: boolean}>`
  font-size: 14px;
  line-height: 19px;
  color: ${({isDark}) => (isDark ? Feather : SlateDark)};
`;

const PortfolioBalanceText = styled(BaseText)`
  font-weight: bold;
  font-size: 31px;
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

const PortfolioBalance = () => {
  const theme = useTheme();
  const themedText: StyleProp<TextStyle> = {color: theme.colors.text};
  //  TODO: update me
  const portfolioBalance = '$98,140.12 USD ';
  const percentageDifference = '+2.5%';

  return (
    <ProfileContainer>
      <Header isDark={theme.dark}>Portfolio Balance</Header>
      <PortfolioBalanceText style={themedText}>
        {portfolioBalance}
      </PortfolioBalanceText>
      <Row>
        <PercentagePill>
          <PercentagePillText>{percentageDifference}</PercentagePillText>
        </PercentagePill>
        <Text style={themedText}>Last day</Text>
      </Row>
    </ProfileContainer>
  );
};

export default PortfolioBalance;
