import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../../../../components/styled/Text';
import {Black, LuckySevens, SlateDark, White} from '../../../../styles/colors';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../store';
import {
  calculatePercentageDifference,
  formatFiatAmount,
} from '../../../../utils/helper-methods';
import InfoSvg from '../../../../../assets/img/info.svg';
import {ActiveOpacity} from '../../../../components/styled/Containers';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import Percentage from '../../../../components/percentage/Percentage';

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

const PercentageText = styled(BaseText)`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? LuckySevens : Black)};
`;

const PercentageContainer = styled.View`
  flex-direction: row;
`;

const PortfolioBalance = () => {
  const portfolioBalance = useSelector(
    ({WALLET}: RootState) => WALLET.portfolioBalance,
  );
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);

  const dispatch = useAppDispatch();
  const percentageDifference = calculatePercentageDifference(
    portfolioBalance.current,
    portfolioBalance.lastDay,
  );

  const showPortfolioBalanceInfoModal = () => {
    dispatch(
      showBottomNotificationModal({
        type: 'info',
        title: 'Portfolio balance',
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
        <InfoSvg width={12} height={12} />
      </PortfolioBalanceHeader>
      <PortfolioBalanceText>
        {formatFiatAmount(
          portfolioBalance.current,
          defaultAltCurrency.isoCode,
          {currencyDisplay: 'symbol'},
        )}
      </PortfolioBalanceText>
      {percentageDifference ? (
        <PercentageContainer>
          <Percentage percentageDifference={percentageDifference} />
          <PercentageText> Last Day</PercentageText>
        </PercentageContainer>
      ) : null}
    </PortfolioContainer>
  );
};

export default PortfolioBalance;
