import React, {useRef} from 'react';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {ScreenGutter} from '../../../components/styled/Containers';
import SuccessSvg from '../../../../assets/img/success.svg';
import {H3, TextAlign} from '../../../components/styled/Text';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {BitpayIdGroupParamList, BitpayIdScreens} from '../BitpayIdGroup';
import {useTranslation} from 'react-i18next';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../../navigation/tabs/TabsStack';
import {OnboardingScreens} from '../../../navigation/onboarding/OnboardingGroup';
import {CommonActions} from '@react-navigation/native';
import {useAppSelector} from '../../../utils/hooks';

type TwoFactorEnabledProps = NativeStackScreenProps<
  BitpayIdGroupParamList,
  BitpayIdScreens.TWO_FACTOR_ENABLED
>;

export type TwoFactorEnabledScreenParamList = undefined;

const TwoFactorEnabledScreenContainer = styled.SafeAreaView`
  flex: 1;
`;

const ViewContainer = styled.View`
  padding: 0 ${ScreenGutter} 20px;
  height: 100%;
`;

const ViewBody = styled.View`
  flex-grow: 1;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const TwoFactorEnabled = ({navigation}: TwoFactorEnabledProps) => {
  const {t} = useTranslation();
  const onboardingCompleted = useAppSelector(
    ({APP}) => APP.onboardingCompleted,
  );
  const onSkipPressRef = useRef(() => {
    const routesStack = [];
    if (onboardingCompleted) {
      routesStack.push(
        {name: RootStacks.TABS, params: {screen: TabsScreens.HOME}},
        {name: BitpayIdScreens.PROFILE, params: {}},
      );
    } else {
      routesStack.push({name: OnboardingScreens.NOTIFICATIONS, params: {}});
    }
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: routesStack,
      }),
    );
  });
  return (
    <TwoFactorEnabledScreenContainer>
      <ViewContainer>
        <ViewBody>
          <SuccessSvg height={50} width={50} style={{marginBottom: 24}} />
          <TextAlign align="center">
            <H3>{t('Two-Factor Authentication is now enabled')}</H3>
          </TextAlign>
        </ViewBody>
        <Button buttonStyle={'primary'} onPress={onSkipPressRef.current}>
          {t('Go back')}
        </Button>
      </ViewContainer>
    </TwoFactorEnabledScreenContainer>
  );
};

export default TwoFactorEnabled;
