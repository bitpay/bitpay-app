import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../../../../components/styled/Text';
import {SlateDark, White} from '../../../../styles/colors';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import QuestionSvg from '../../../../../assets/img/question.svg';
import {ActiveOpacity} from '../../../../components/styled/Containers';
import {useAppDispatch} from '../../../../utils/hooks';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import IncrementArrow from '../../../../../assets/img/home/exchange-rates/increment-arrow.svg';
import DecrementArrow from '../../../../../assets/img/home/exchange-rates/decrement-arrow.svg';

const PortfolioContainer = styled.View`
  justify-content: center;
  align-items: center;
`;

const PortfolioBalanceHeader = styled.TouchableOpacity`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const PortfolioBalanceTitle = styled(BaseText)`
  margin-right: 5px;
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const PortfolioBalanceText = styled(BaseText)`
  font-weight: bold;
  font-size: 31px;
  color: ${({theme}) => theme.colors.text};
`;

const Row = styled.View`
  flex-direction: row;
  align-items: center;
`;

const PercentageContainer = styled(BaseText)`
  color: ${({theme}) => theme.colors.text};
`;

const PortfolioBalance = () => {
  const portfolioBalance = useSelector(
    ({WALLET}: RootState) => WALLET.portfolioBalance,
  );
  const dispatch = useAppDispatch();
  const percentageDifference = Number(
    (
      ((portfolioBalance.current - portfolioBalance.lastDay) * 100) /
      portfolioBalance.current
    ).toFixed(2),
  );

  const showPortfolioBalanceInfoModal = () => {
    dispatch(
      showBottomNotificationModal({
        type: 'info',
        title: 'Portfolio Balance',
        message:
          'Your Portfolio Balance is the total of all your crypto assets.',
        enableBackdropDismiss: true,
        actions: [
          {
            text: 'GOT IT',
            action: () => null,
            primary: true,
          },
        ],
      }),
    );
  };

  return (
    <PortfolioContainer>
      <PortfolioBalanceHeader
        activeOpacity={ActiveOpacity}
        onPress={showPortfolioBalanceInfoModal}>
        <PortfolioBalanceTitle>Portfolio Balance</PortfolioBalanceTitle>
        <QuestionSvg width={12} height={12} />
      </PortfolioBalanceHeader>
      <PortfolioBalanceText>
        {formatFiatAmount(portfolioBalance.current, 'usd')}
      </PortfolioBalanceText>
      <Row>
        {percentageDifference && percentageDifference > 0 ? (
          <IncrementArrow style={{marginRight: 5}} />
        ) : null}
        {percentageDifference && percentageDifference < 0 ? (
          <DecrementArrow style={{marginRight: 5}} />
        ) : null}
        {percentageDifference ? (
          <PercentageContainer>{percentageDifference}%</PercentageContainer>
        ) : null}
      </Row>
    </PortfolioContainer>
  );
};

export default PortfolioBalance;
