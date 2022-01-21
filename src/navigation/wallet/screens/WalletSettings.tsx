import React, {useEffect, useLayoutEffect, useState} from 'react';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {View} from 'react-native';
import styled from 'styled-components/native';
import {
  Hr,
  Info,
  InfoTriangle,
  ScreenGutter,
  Setting,
  SettingTitle,
  SettingView,
} from '../../../components/styled/Containers';
import ChevronRightSvg from '../../../../assets/img/angle-right.svg';
import haptic from '../../../components/haptic-feedback/haptic';

import {SlateDark, White} from '../../../styles/colors';
import ToggleSwitch from '../../../components/toggle-switch/ToggleSwitch';

const WalletSettingsContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const Title = styled(BaseText)`
  font-weight: bold;
  font-size: 18px;
  margin: 5px 0;
  color: ${({theme}) => theme.colors.text};
`;

const WalletNameContainer = styled.TouchableOpacity`
  padding: 10px 0 20px 0;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const InfoDescription = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const VerticalPadding = styled.View`
  padding: ${ScreenGutter} 0;
`;

const WalletSettingsTitle = styled(SettingTitle)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const WalletSettings = () => {
  const {
    params: {wallet},
  } = useRoute<RouteProp<WalletStackParamList, 'WalletSettings'>>();
  const navigation = useNavigation();
  const [demoToggle, setDemoToggle] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>Wallet Settings</HeaderTitle>,
    });
  });

  const {currencyName} = wallet;

  return (
    <WalletSettingsContainer>
      <ScrollView>
        <WalletNameContainer
          onPress={() => {
            haptic('impactLight');
            //    TODO: Redirect me
          }}>
          <View>
            <Title>Name</Title>
            <WalletSettingsTitle>{currencyName}</WalletSettingsTitle>
          </View>

          <ChevronRightSvg height={16} />
        </WalletNameContainer>

        <Hr />

        <SettingView>
          <WalletSettingsTitle>Hide Wallet</WalletSettingsTitle>

          <ToggleSwitch
            onChange={value => {
              haptic('impactLight');
              //    TODO: Update me
              setDemoToggle(value);
            }}
            isEnabled={demoToggle}
          />
        </SettingView>
        <Info>
          <InfoTriangle />
          <InfoDescription>
            This wallet will not be removed from the device.
          </InfoDescription>
        </Info>

        <SettingView>
          <WalletSettingsTitle>Hide Balance</WalletSettingsTitle>

          <ToggleSwitch
            onChange={() => {
              haptic('impactLight');
              //    TODO: Update me
            }}
            isEnabled={false}
          />
        </SettingView>

        <Hr />

        <VerticalPadding>
          <Title>Security</Title>

          <SettingView>
            <WalletSettingsTitle>
              Request Biometric Authentication
            </WalletSettingsTitle>
            <ToggleSwitch
              onChange={() => {
                haptic('impactLight');
                //    TODO: Update me
              }}
              isEnabled={false}
            />
          </SettingView>

          <Hr />
        </VerticalPadding>

        <VerticalPadding>
          <Title>Advanced</Title>
          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <WalletSettingsTitle>Information</WalletSettingsTitle>
          </Setting>
          <Hr />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <WalletSettingsTitle>Addresses</WalletSettingsTitle>
          </Setting>
          <Hr />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <WalletSettingsTitle>Export Wallet</WalletSettingsTitle>
          </Setting>
          <Hr />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <WalletSettingsTitle>Delete</WalletSettingsTitle>
          </Setting>
        </VerticalPadding>
      </ScrollView>
    </WalletSettingsContainer>
  );
};

export default WalletSettings;
