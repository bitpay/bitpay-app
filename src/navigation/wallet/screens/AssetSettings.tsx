import React, {useEffect, useState} from 'react';
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
import Checkbox from '../../../components/checkbox/Checkbox';
import ToggleSwitch from '../../../components/toggle-switch/ToggleSwitch';

const AssetSettingsContainer = styled.SafeAreaView`
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

const AssetSettingsTitle = styled(SettingTitle)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const AssetSettings = () => {
  const {
    params: {asset},
  } = useRoute<RouteProp<WalletStackParamList, 'AssetSettings'>>();
  const navigation = useNavigation();
  const [demoToggle, setDemoToggle] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>Asset Settings</HeaderTitle>,
    });
  }, [navigation]);

  const {assetName} = asset;

  return (
    <AssetSettingsContainer>
      <ScrollView>
        <WalletNameContainer
          onPress={() => {
            haptic('impactLight');
            //    TODO: Redirect me
          }}>
          <View>
            <Title>Name</Title>
            <AssetSettingsTitle>{assetName}</AssetSettingsTitle>
          </View>

          <ChevronRightSvg height={16} />
        </WalletNameContainer>

        <Hr />

        <SettingView>
          <AssetSettingsTitle>Hide Asset</AssetSettingsTitle>

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
            The asset won’t be removed from this device. You can hide it
            whenever you need.
          </InfoDescription>
        </Info>

        <SettingView>
          <AssetSettingsTitle>Hide Balance</AssetSettingsTitle>

          <ToggleSwitch
            onChange={value => {
              haptic('impactLight');
              //    TODO: Update me
            }}
            isEnabled={false}
          />
        </SettingView>

        <Hr />

        <VerticalPadding>
          <Title>Security</Title>
          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <AssetSettingsTitle>Backup</AssetSettingsTitle>
          </Setting>
          <Hr />

          <SettingView>
            <AssetSettingsTitle>
              Request Encrypt Password
            </AssetSettingsTitle>
            <ToggleSwitch
              onChange={value => {
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
            <AssetSettingsTitle>Information</AssetSettingsTitle>
          </Setting>
          <Hr />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <AssetSettingsTitle>Addresses</AssetSettingsTitle>
          </Setting>
          <Hr />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <AssetSettingsTitle>Export Wallet</AssetSettingsTitle>
          </Setting>
          <Hr />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <AssetSettingsTitle>Delete</AssetSettingsTitle>
          </Setting>
        </VerticalPadding>
      </ScrollView>
    </AssetSettingsContainer>
  );
};

export default AssetSettings;
