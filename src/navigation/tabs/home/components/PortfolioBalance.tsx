import React from 'react';
import {ColorSchemeName, Text, View} from 'react-native';
import styled from 'styled-components/native';
import {BaseText} from '../../../../components/styled/Text';
import {Feather, SlateDark} from '../../../../styles/colors';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import {useTheme} from '@react-navigation/native';

const Header = styled(BaseText)<{colorScheme: ColorSchemeName}>`
  font-size: 14px;
  line-height: 19px;
  color: ${({colorScheme}: {colorScheme: ColorSchemeName}) =>
    colorScheme === 'light' ? SlateDark : Feather};
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
  const colorScheme = useSelector(({APP}: RootState) => APP.colorScheme);
  const theme = useTheme();
  const themedText = {color: theme.colors.text};
  //  TODO: update me
  const portfolioBalance = '$98,140.12 USD ';
  const percentageDifference = '+2.5%';

  return (
    <View>
      <Header colorScheme={colorScheme}>Portfolio Balance</Header>
      <PortfolioBalanceText style={themedText}>
        {portfolioBalance}
      </PortfolioBalanceText>
      <Row>
        <PercentagePill>
          <PercentagePillText>{percentageDifference}</PercentagePillText>
        </PercentagePill>
        <Text style={themedText}>Last day</Text>
      </Row>
    </View>
  );
};

export default PortfolioBalance;
