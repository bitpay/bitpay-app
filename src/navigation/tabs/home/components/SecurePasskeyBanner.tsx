import React from 'react';
import {CommonActions, useNavigation} from '@react-navigation/native';
import {useTheme} from 'styled-components/native';
import styled from 'styled-components/native';
import {ActiveOpacity} from '@components/base/TouchableOpacity';
import {BoxShadow} from '../../../../navigation/tabs/home/components/Styled';
import SecurePasskeyIcon from '../../../../../assets/img/secure-passkey.svg';
import HomeArrowRight from '../../../../../assets/img/home-arrow-right.svg';
import {TouchableOpacity} from '../../../../components/base/TouchableOpacity';
import {LightBlack, White} from '../../../../styles/colors';
import {BaseText} from '../../../../components/styled/Text';
import {RootStacks} from '../../../../Root';
import {TabsScreens} from '../../../../navigation/tabs/TabsStack';
import {SecurityScreens} from '../../../../navigation/tabs/settings/security/SecurityGroup';

const PasskeyBannerContainer = styled(TouchableOpacity)`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-radius: 12px;
  flex-direction: column;
  justify-content: center;
  min-height: 100px;
  padding: 16px 35px 16px 76px;
  margin: 0 15px;
  position: relative;
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
  const theme = useTheme();
  return (
    <PasskeyBannerContainer
      style={!theme.dark && BoxShadow}
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
      <PasskeyBannerDescription>Setup a Passkey</PasskeyBannerDescription>
      <IconContainer>
        <SecurePasskeyIcon />
      </IconContainer>
      <IconArrowRight>
        <HomeArrowRight />
      </IconArrowRight>
    </PasskeyBannerContainer>
  );
};

export default SecurePasskeyBanner;
