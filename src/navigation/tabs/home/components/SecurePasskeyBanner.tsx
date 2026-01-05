import React from 'react';
import {CommonActions, useNavigation} from '@react-navigation/native';
import styled from 'styled-components/native';
import {ActiveOpacity} from '@components/base/TouchableOpacity';
import SecurePasskeyIcon from '../../../../../assets/img/secure-passkey.svg';
import ArrowRightSvg from './ArrowRightSvg';
import {TouchableOpacity} from '../../../../components/base/TouchableOpacity';
import {ScreenGutter} from '../../../../components/styled/Containers';
import {LightBlack, Slate30, White} from '../../../../styles/colors';
import {BaseText} from '../../../../components/styled/Text';
import {RootStacks} from '../../../../Root';
import {TabsScreens} from '../../../../navigation/tabs/TabsStack';
import {SecurityScreens} from '../../../../navigation/tabs/settings/security/SecurityGroup';

const PasskeyBannerContainer = styled(TouchableOpacity)`
  background-color: ${({theme: {dark}}) => (dark ? '#111' : White)};
  border-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  border-width: 1px;
  border-radius: 12px;
  flex-direction: column;
  justify-content: center;
  min-height: 100px;
  padding: 16px 35px 16px 76px;
  margin: 0px ${ScreenGutter} 20px;
  position: relative;
  gap: 8px;
`;

const PasskeyBannerContainerTitle = styled(BaseText)`
  font-style: normal;
  font-size: 12px;
  color: #335cff;
  margin-left: 26px;
  text-transform: uppercase;
`;

const PasskeyBannerDescription = styled(BaseText)`
  font-size: 16px;
  margin-left: 26px;
`;

const IconContainer = styled.View`
  position: absolute;
  left: 16px;
`;

const IconArrowRight = styled.View`
  position: absolute;
  right: 16px;
`;

const SecurePasskeyBanner: React.FC = () => {
  const navigation = useNavigation();
  return (
    <PasskeyBannerContainer
      activeOpacity={ActiveOpacity}
      onPress={() => {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: RootStacks.TABS,
                params: {screen: TabsScreens.SETTINGS},
              },
              {
                name: SecurityScreens.PASSKEYS,
                params: {},
              },
            ],
          }),
        );
      }}>
      <PasskeyBannerContainerTitle>
        Secure your account
      </PasskeyBannerContainerTitle>
      <PasskeyBannerDescription>Create a Passkey</PasskeyBannerDescription>
      <IconContainer>
        <SecurePasskeyIcon />
      </IconContainer>
      <IconArrowRight>
        <ArrowRightSvg />
      </IconArrowRight>
    </PasskeyBannerContainer>
  );
};

export default SecurePasskeyBanner;
