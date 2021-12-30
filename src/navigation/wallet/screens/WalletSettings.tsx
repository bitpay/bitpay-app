import React from 'react';
import {BaseText} from '../../../components/styled/Text';
import {useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {View} from 'react-native';
import styled from 'styled-components/native';
import {
  Hr,
  ScreenGutter,
  SettingTitle,
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

const InfoImageContainer = styled.View`
  margin-left: 8px;
`;

const AssetsListCtaContainer = styled.View`
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
          <InfoImageContainer>
            <InfoIcon />
          </InfoImageContainer>
        </AssetsHeaderContainer>

        {assetsList.map(asset => (
          <AssetSettingsRow asset={asset} key={asset.id} />
        ))}

        <AssetsListCtaContainer>
          <Button
            buttonType={'link'}
            onPress={() => {
              //  TODO: Redirect me
            }}>
            Add an Asset
          </Button>
        </AssetsListCtaContainer>
      </ScrollView>
    </WalletSettingsContainer>
  );
};

export default WalletSettings;
