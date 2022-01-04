import React, {useEffect, useState} from 'react';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import {useNavigation, useRoute, useTheme} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {StyleProp, TextStyle, View} from 'react-native';
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
`;

const WalletNameContainer = styled.TouchableOpacity`
  padding: 10px 0 20px 0;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const InfoDescription = styled(BaseText)<{isDark: boolean}>`
  font-size: 16px;
  color: ${({isDark}) => (isDark ? White : SlateDark)};
`;

const VerticalPadding = styled.View`
  padding: ${ScreenGutter} 0;
`;

const AssetSettingsTitle = styled(SettingTitle)<{isDark: boolean}>`
  color: ${({isDark}) => (isDark ? White : SlateDark)};
`;

const AssetSettings = () => {
  const {
    params: {asset},
  } = useRoute<RouteProp<WalletStackParamList, 'AssetSettings'>>();
  const theme = useTheme();
  const navigation = useNavigation();
  const [demoToggle, setDemoToggle] = useState(false);
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle style={textStyle}>Asset Settings</HeaderTitle>
      ),
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
            <Title style={textStyle}>Name</Title>
            <AssetSettingsTitle isDark={theme.dark}>
              {assetName}
            </AssetSettingsTitle>
          </View>

          <ChevronRightSvg height={16} />
        </WalletNameContainer>

        <Hr isDark={theme.dark} />

        <SettingView>
          <AssetSettingsTitle isDark={theme.dark}>
            Hide Asset
          </AssetSettingsTitle>

          <ToggleSwitch
            onChange={value => {
              haptic('impactLight');
              //    TODO: Update me
              setDemoToggle(value);
            }}
            isEnabled={demoToggle}
          />
        </SettingView>
        <Info isDark={theme.dark}>
          <InfoTriangle isDark={theme.dark} />
          <InfoDescription isDark={theme.dark}>
            The asset won’t be removed from this device. You can hide it
            whenever you need.
          </InfoDescription>
        </Info>

        <SettingView>
          <AssetSettingsTitle isDark={theme.dark}>
            Hide Balance
          </AssetSettingsTitle>

          <ToggleSwitch
            onChange={value => {
              haptic('impactLight');
              //    TODO: Update me
            }}
            isEnabled={false}
          />
        </SettingView>

        <Hr isDark={theme.dark} />

        <VerticalPadding>
          <Title style={textStyle}>Security</Title>
          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <AssetSettingsTitle isDark={theme.dark}>Backup</AssetSettingsTitle>
          </Setting>
          <Hr isDark={theme.dark} />

          <SettingView>
            <AssetSettingsTitle isDark={theme.dark}>
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

          <Hr isDark={theme.dark} />
        </VerticalPadding>

        <VerticalPadding>
          <Title style={textStyle}>Advanced</Title>
          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <AssetSettingsTitle isDark={theme.dark}>
              Information
            </AssetSettingsTitle>
          </Setting>
          <Hr isDark={theme.dark} />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <AssetSettingsTitle isDark={theme.dark}>
              Addresses
            </AssetSettingsTitle>
          </Setting>
          <Hr isDark={theme.dark} />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <AssetSettingsTitle isDark={theme.dark}>
              Export Wallet
            </AssetSettingsTitle>
          </Setting>
          <Hr isDark={theme.dark} />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <AssetSettingsTitle isDark={theme.dark}>Delete</AssetSettingsTitle>
          </Setting>
        </VerticalPadding>
      </ScrollView>
    </AssetSettingsContainer>
  );
};

export default AssetSettings;
