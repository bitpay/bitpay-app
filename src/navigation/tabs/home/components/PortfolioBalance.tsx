import React from 'react';
import styled from 'styled-components/native';
import {BaseText, H2} from '../../../../components/styled/Text';
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
import {
  showBottomNotificationModal,
  toggleHideAllBalances,
} from '../../../../store/app/app.actions';
import Percentage from '../../../../components/percentage/Percentage';
import {COINBASE_ENV} from '../../../../api/coinbase/coinbase.constants';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from 'react-native-gesture-handler';

const PortfolioContainer = styled.View`
  justify-content: center;
  align-items: center;
`;

const PortfolioBalanceHeader = styled(TouchableOpacity)`
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
  justify-content: center;
`;

const PortfolioBalance = () => {
  const {t} = useTranslation();
  const coinbaseBalance =
    useAppSelector(({COINBASE}) => COINBASE.balance[COINBASE_ENV]) || 0.0;
  const portfolioBalance = useSelector(
    ({WALLET}: RootState) => WALLET.portfolioBalance,
  );

  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);

  const totalBalance: number = portfolioBalance.current + coinbaseBalance;

  const dispatch = useAppDispatch();
  const percentageDifference = calculatePercentageDifference(
    portfolioBalance.current,
    portfolioBalance.lastDay,
  );

  const showPortfolioBalanceInfoModal = () => {
    dispatch(
      showBottomNotificationModal({
        type: 'info',
        title: t('Portfolio balance'),
        message: t(
          'Your Portfolio Balance is the total of all your crypto assets.',
        ),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('GOT IT'),
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
        <PortfolioBalanceTitle>{t('Portfolio Balance')}</PortfolioBalanceTitle>
        <InfoSvg width={12} height={12} />
      </PortfolioBalanceHeader>
      <TouchableOpacity
        onLongPress={() => {
          dispatch(toggleHideAllBalances());
        }}>
        {!hideAllBalances ? (
          <>
            <PortfolioBalanceText>
              {formatFiatAmount(totalBalance, defaultAltCurrency.isoCode, {
                currencyDisplay: 'symbol',
              })}
            </PortfolioBalanceText>
            {percentageDifference ? (
              <PercentageContainer>
                <Percentage percentageDifference={percentageDifference} />
                <PercentageText> {t('Last Day')}</PercentageText>
              </PercentageContainer>
            ) : null}
          </>
        ) : (
          <H2>****</H2>
        )}
      </TouchableOpacity>
    </PortfolioContainer>
  );
};

export default PortfolioBalance;
