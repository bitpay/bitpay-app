import React from 'react';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {BaseText} from '../../../components/styled/Text';
import {SlateDark, White} from '../../../styles/colors';
import CoinbaseBitPayIcon from '../../../../assets/img/coinbase/bc.svg';

import Coinbase from '../../../api/coinbase/index';
import {AppEffects} from '../../../store/app';
import {useAppDispatch} from '../../../utils/hooks';
import {useTranslation} from 'react-i18next';

const signupUrl: string = 'https://www.coinbase.com/signup';

const CoinbaseContainer = styled.SafeAreaView`
  flex: 1;
`;

const CoinbaseHeaderContainer = styled.View`
  margin-top: 10px;
  text-align: center;
  margin-bottom: 40px;
`;

const ButtonContainer = styled.View`
  margin-top: 20px;
`;

const NoConnectedContainer = styled.View`
  padding: 0 15px;
`;

const NoConnectedIcon = styled.View`
  display: flex;
  align-items: center;
`;

const Title = styled(BaseText)`
  text-align: center;
  font-size: 26px;
  font-weight: bold;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin: 30px 0;
`;

const SubTitle = styled(BaseText)`
  text-align: center;
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const CoinbaseIntro = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();

  const onPressButton = async (context: 'signin' | 'signup') => {
    let url;
    if (context === 'signin') {
      url = Coinbase.getOAuthUrl();
    } else {
      url = signupUrl;
    }
    dispatch(AppEffects.openUrlWithInAppBrowser(url));
  };

  return (
    <CoinbaseContainer>
      <NoConnectedContainer>
        <CoinbaseHeaderContainer>
          <NoConnectedIcon>
            <CoinbaseBitPayIcon width={160} height={120} />
          </NoConnectedIcon>
          <Title>{t('Connect to Coinbase')}</Title>
          <SubTitle>
            {t(
              'Manage your Coinbase accounts, check balances, deposits and withdraw funds between wallets.',
            )}
          </SubTitle>
        </CoinbaseHeaderContainer>
        <ButtonContainer>
          <Button
            children={t('Connect')}
            onPress={() => onPressButton('signin')}
          />
        </ButtonContainer>
        <ButtonContainer>
          <Button
            children={t('Sign Up for Coinbase')}
            buttonStyle={'secondary'}
            onPress={() => onPressButton('signup')}
          />
        </ButtonContainer>
      </NoConnectedContainer>
    </CoinbaseContainer>
  );
};

export default CoinbaseIntro;
