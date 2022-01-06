import React, {useEffect, useState} from 'react';
import {BaseText, HeaderTitle, Link} from '../../../components/styled/Text';
import {useNavigation, useRoute, useTheme} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {StyleProp, TextStyle, View, TouchableOpacity} from 'react-native';
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
import {Asset} from '../../../store/wallet/wallet.models';
import {AssetListIcons} from '../../../constants/AssetListIcons';
import AssetSettingsRow, {
  AssetSettingsRowProps,
} from '../../../components/list/AssetSettingsRow';
import Button from '../../../components/button/Button';
import {Black, SlateDark, White} from '../../../styles/colors';
import Checkbox from '../../../components/checkbox/Checkbox';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {useDispatch} from 'react-redux';
import InfoIcon from '../../../components/icons/info/InfoIcon';

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
`;

const AssetsHeaderContainer = styled.View`
  padding-top: ${ScreenGutter};
  flex-direction: row;
  align-items: center;
`;

const WalletNameContainer = styled.TouchableOpacity`
  padding: 10px 0 20px 0;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const InfoImageContainer = styled.View<{infoMargin: string}>`
  margin: ${({infoMargin}) => infoMargin};
`;

const InfoTitle = styled(BaseText)`
  font-size: 16px;
  color: ${Black};
`;

const InfoHeader = styled.View`
  flex-direction: row;
  margin-bottom: 10px;
`;

const InfoDescription = styled(BaseText)<{isDark: boolean}>`
  font-size: 16px;
  color: ${({isDark}) => (isDark ? White : SlateDark)};
`;

const VerticalPadding = styled.View`
  padding: ${ScreenGutter} 0;
`;

const WalletSettingsTitle = styled(SettingTitle)<{isDark: boolean}>`
  color: ${({isDark}) => (isDark ? White : SlateDark)};
`;

const buildAssetList = (assets: Asset[]) => {
  const assetList = [] as Array<AssetSettingsRowProps>;
  assets.forEach(({coin, walletName, walletId}) => {
    assetList.push({
      id: walletId,
      img: () => AssetListIcons[coin].square,
      assetName: walletName,
    });
  });
  return assetList;
};

const WalletSettings = () => {
  const {
    params: {wallet},
  } = useRoute<RouteProp<WalletStackParamList, 'WalletSettings'>>();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const assetsList = buildAssetList(wallet.assets);
  const [showInfo, setShowInfo] = useState(false);
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle style={textStyle}>Wallet Settings</HeaderTitle>
      ),
    });
  }, [navigation]);

  return (
    <WalletSettingsContainer>
      <ScrollView>
        <WalletNameContainer
          onPress={() => {
            haptic('impactLight');
            //    TODO: Redirect me
          }}>
          <View>
            <Title style={textStyle}>Wallet name</Title>
            <WalletSettingsTitle isDark={theme.dark}>
              wallet 1
            </WalletSettingsTitle>
          </View>

          <ChevronRightSvg height={16} />
        </WalletNameContainer>
        <Hr isDark={theme.dark} />

        <AssetsHeaderContainer>
          <Title style={textStyle}>Assets</Title>
          <InfoImageContainer infoMargin={'0 0 0 8px'}>
            <InfoIcon />
          </InfoImageContainer>
        </AssetsHeaderContainer>

        {assetsList.map(asset => (
          <AssetSettingsRow asset={asset} key={asset.id} />
        ))}

        <VerticalPadding>
          <Button
            buttonType={'link'}
            onPress={() => {
              //  TODO: Redirect me
            }}>
            Add an Asset
          </Button>
        </VerticalPadding>

        <VerticalPadding>
          <Title style={textStyle}>Security</Title>
          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <WalletSettingsTitle isDark={theme.dark}>
              Backup
            </WalletSettingsTitle>
          </Setting>
          <Hr isDark={theme.dark} />

          <SettingView>
            <WalletSettingsTitle isDark={theme.dark}>
              Request Encrypt Password
            </WalletSettingsTitle>

            <Checkbox
              onPress={() => {
                haptic('impactLight');
                //    TODO: Update me
                setShowInfo(!showInfo);
              }}
              checked={showInfo}
            />
          </SettingView>

          <Info isDark={theme.dark}>
            <InfoTriangle isDark={theme.dark} />

            <InfoHeader>
              <InfoImageContainer infoMargin={'0 8px 0 0'}>
                <InfoIcon />
              </InfoImageContainer>

              <InfoTitle style={textStyle}>Password Not Recoverable</InfoTitle>
            </InfoHeader>
            <InfoDescription isDark={theme.dark}>
              This password cannot be recovered. If this password is lost, funds
              can only be recovered by reimporting your 12-word recovery phrase.
            </InfoDescription>

            <VerticalPadding>
              <TouchableOpacity
                onPress={() => {
                  haptic('impactLight');
                  dispatch(
                    openUrlWithInAppBrowser(
                      'https://support.bitpay.com/hc/en-us/articles/360000244506-What-Does-a-Spending-Password-Do-',
                    ),
                  );
                }}>
                <Link isDark={theme.dark}>Learn More</Link>
              </TouchableOpacity>
            </VerticalPadding>
          </Info>

          <Hr isDark={theme.dark} />
        </VerticalPadding>

        <VerticalPadding>
          <Title style={textStyle}>Advanced</Title>
          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <WalletSettingsTitle isDark={theme.dark}>
              Sync Wallets Across Devices
            </WalletSettingsTitle>
          </Setting>
          <Hr isDark={theme.dark} />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <WalletSettingsTitle isDark={theme.dark}>
              Export Key
            </WalletSettingsTitle>
          </Setting>
          <Hr isDark={theme.dark} />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <WalletSettingsTitle isDark={theme.dark}>
              Extended Private Key
            </WalletSettingsTitle>
          </Setting>
          <Hr isDark={theme.dark} />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <WalletSettingsTitle isDark={theme.dark}>
              Delete
            </WalletSettingsTitle>
          </Setting>
        </VerticalPadding>
      </ScrollView>
    </WalletSettingsContainer>
  );
};

export default WalletSettings;
