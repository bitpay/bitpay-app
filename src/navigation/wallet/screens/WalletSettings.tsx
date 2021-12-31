import React, {useState} from 'react';
import {BaseText} from '../../../components/styled/Text';
import {useRoute} from '@react-navigation/native';
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
import InfoIcon from '../../../../assets/img/info-blue.svg';
import {Asset} from '../../../store/wallet/wallet.models';
import {AssetListIcons} from '../../../constants/AssetListIcons';
import AssetSettingsRow, {
  AssetSettingsRowProps,
} from '../../../components/list/AssetSettingsRow';
import Button from '../../../components/button/Button';
import {Black, SlateDark} from '../../../styles/colors';
import Checkbox from '../../../components/checkbox/Checkbox';

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
  padding: 20px 0;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const InfoImageContainer = styled.View<{margin: string}>`
  margin: ${({margin}) => margin};
`;

const InfoTitle = styled(BaseText)`
  font-size: 16px;
  color: ${Black};
`;

const InfoHeader = styled.View`
  flex-direction: row;
  margin-bottom: 10px;
`;

const InfoDescription = styled(BaseText)`
  font-size: 16px;
  color: ${SlateDark};
`;

const Section = styled.View`
  padding: ${ScreenGutter} 0;
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

  const assetsList = buildAssetList(wallet.assets);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <WalletSettingsContainer>
      <ScrollView>
        <WalletNameContainer
          onPress={() => {
            haptic('impactLight');
            //    TODO: Redirect me
          }}>
          <View>
            <Title>Wallet name</Title>
            <SettingTitle>wallet 1</SettingTitle>
          </View>

          <ChevronRightSvg height={16} />
        </WalletNameContainer>
        <Hr />

        <AssetsHeaderContainer>
          <Title>Assets</Title>
          <InfoImageContainer margin={'0% 0% 0% 8px'}>
            <InfoIcon />
          </InfoImageContainer>
        </AssetsHeaderContainer>

        {assetsList.map(asset => (
          <AssetSettingsRow asset={asset} key={asset.id} />
        ))}

        <Section>
          <Button
            buttonType={'link'}
            onPress={() => {
              //  TODO: Redirect me
            }}>
            Add an Asset
          </Button>
        </Section>

        <Section>
          <Title>Security</Title>
          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <SettingTitle>Backup</SettingTitle>
          </Setting>
          <Hr />

          <SettingView>
            <SettingTitle>Request Encrypt Password</SettingTitle>

            <Checkbox
              onPress={() => {
                haptic('impactLight');
                //    TODO: Update me
                setShowInfo(!showInfo);
              }}
              checked={showInfo}
            />
          </SettingView>

          {showInfo && (
            <Info>
              <InfoTriangle />

              <InfoHeader>
                <InfoImageContainer margin={'0% 8px 0% 0%'}>
                  <InfoIcon />
                </InfoImageContainer>

                <InfoTitle>Password Not Recoverable</InfoTitle>
              </InfoHeader>
              <InfoDescription>
                This password cannot be recovered. If this password is lost,
                funds can only be recovered by reimporting your 12-word recovery
                phrase.
              </InfoDescription>
            </Info>
          )}

          <Hr />
        </Section>

        <Section>
          <Title>Advanced</Title>
          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <SettingTitle>Sync Wallets Across Devices</SettingTitle>
          </Setting>
          <Hr />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <SettingTitle>Export Key</SettingTitle>
          </Setting>
          <Hr />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <SettingTitle>Extended Private Key</SettingTitle>
          </Setting>
          <Hr />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <SettingTitle>Delete</SettingTitle>
          </Setting>
        </Section>
      </ScrollView>
    </WalletSettingsContainer>
  );
};

export default WalletSettings;
