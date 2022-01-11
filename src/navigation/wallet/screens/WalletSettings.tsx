import React, {useEffect, useState} from 'react';
import {BaseText, HeaderTitle, Link} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {View, TouchableOpacity} from 'react-native';
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
import {Asset, KeyMethods} from '../../../store/wallet/wallet.models';
import {AssetListIcons} from '../../../constants/AssetListIcons';
import AssetSettingsRow, {
  AssetSettingsRowProps,
} from '../../../components/list/AssetSettingsRow';
import Button from '../../../components/button/Button';
import {SlateDark, White} from '../../../styles/colors';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {useDispatch, useSelector} from 'react-redux';
import InfoIcon from '../../../components/icons/info/InfoIcon';
import ToggleSwitch from '../../../components/toggle-switch/ToggleSwitch';
import {AppActions} from '../../../store/app';
import DecryptEnterPasswordModal from '../components/DecryptEnterPasswordModal';
import {RootState} from '../../../store';
import {useLogger} from '../../../utils/hooks';
import {WalletActions} from '../../../store/wallet';
import {showBottomNotificationModal} from "../../../store/app/app.actions";

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
  color: ${({theme}) => theme.colors.text};
`;

const InfoHeader = styled.View`
  flex-direction: row;
  margin-bottom: 10px;
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

const buildAssetList = (assets: Asset[]) => {
  const assetList = [] as Array<AssetSettingsRowProps>;
  assets.forEach(({id, assetName, assetAbbreviation}) => {
    assetList.push({
      id,
      img: () => AssetListIcons[assetAbbreviation].square,
      assetName,
    });
  });
  return assetList;
};

const WalletSettings = () => {
  const {
    params: {wallet},
  } = useRoute<RouteProp<WalletStackParamList, 'WalletSettings'>>();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const assetsList = buildAssetList(wallet.assets);

  const [passwordToggle, setPasswordToggle] = useState(!!wallet.isPrivKeyEncrypted);
  const keyMethods: KeyMethods | undefined = useSelector(
    ({WALLET}: RootState) =>
      WALLET.keyMethods.find(key => key.id === wallet.id),
  );
  const logger = useLogger();

  const onSubmitPassword = async (password: string) => {
    if(keyMethods) {
      try {
        keyMethods.decrypt(password);
        logger.debug('Key Decrypted');
        await dispatch(
            WalletActions.successEncryptOrDecryptPassword({keyMethods: keyMethods}),
        );
        setPasswordToggle(false);
        dispatch(AppActions.dissmissDecryptPasswordModal());
      } catch (e) {
        console.log(e);
        dispatch(AppActions.dissmissDecryptPasswordModal());
      }
    } else {
      dispatch(AppActions.dissmissDecryptPasswordModal());
      dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: 'Something went wrong',
            message: 'Could not decrypt wallet.',
            enableBackdropDismiss: true,
            actions: [
              {
                text: 'OK',
                action: () => {},
                primary: true,
              },
            ],
          }),
      );
      logger.debug('Key Methods Error');
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>Wallet Settings</HeaderTitle>,
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
            <Title>Wallet name</Title>
            <WalletSettingsTitle>wallet 1</WalletSettingsTitle>
          </View>

          <ChevronRightSvg height={16} />
        </WalletNameContainer>
        <Hr />

        <AssetsHeaderContainer>
          <Title>Assets</Title>
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
          <Title>Security</Title>
          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <WalletSettingsTitle>Backup</WalletSettingsTitle>
          </Setting>
          <Hr />

          <SettingView>
            <WalletSettingsTitle>Request Encrypt Password</WalletSettingsTitle>

            <ToggleSwitch
              onChange={() => {
                if (!wallet.isPrivKeyEncrypted) {
                  navigation.navigate('Wallet', {
                    screen: 'CreateEncryptPassword',
                    params: {wallet},
                  });
                } else {
                  dispatch(
                    AppActions.showDecryptPasswordModal({
                      contextHandler: onSubmitPassword,
                    }),
                  );
                }
              }}
              isEnabled={passwordToggle}
            />
          </SettingView>

          <Info>
            <InfoTriangle />

            <InfoHeader>
              <InfoImageContainer infoMargin={'0 8px 0 0'}>
                <InfoIcon />
              </InfoImageContainer>

              <InfoTitle>Password Not Recoverable</InfoTitle>
            </InfoHeader>
            <InfoDescription>
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
                <Link>Learn More</Link>
              </TouchableOpacity>
            </VerticalPadding>
          </Info>

          <Hr />
        </VerticalPadding>

        <VerticalPadding>
          <Title>Advanced</Title>
          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <WalletSettingsTitle>
              Sync Wallets Across Devices
            </WalletSettingsTitle>
          </Setting>
          <Hr />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <WalletSettingsTitle>Export Key</WalletSettingsTitle>
          </Setting>
          <Hr />

          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <WalletSettingsTitle>Extended Private Key</WalletSettingsTitle>
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

      {/*<DecryptEnterPasswordModal contextHandler={onSubmitPassword}/>*/}
    </WalletSettingsContainer>
  );
};

export default WalletSettings;
