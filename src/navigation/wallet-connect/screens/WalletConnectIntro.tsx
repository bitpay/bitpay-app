import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {FlatList, TouchableOpacity} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import WalletRow, {WalletRowProps} from '../../../components/list/WalletRow';
import {BaseText, H4, Link, Paragraph} from '../../../components/styled/Text';
import {RootState} from '../../../store';
import {Wallet} from '../../../store/wallet/wallet.models';
import {
  isValidWalletConnectUri,
  keyExtractor,
  sleep,
} from '../../../utils/helper-methods';
import {buildUIFormattedWallet} from '../../wallet/screens/KeyOverview';
import {
  ScrollView,
  WalletConnectContainer,
} from '../styled/WalletConnectContainers';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {walletConnectOnSessionRequest} from '../../../store/wallet-connect/wallet-connect.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissOnGoingProcessModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {LightBlack, White} from '../../../styles/colors';

export type WalletConnectIntroParamList = {
  uri?: string;
};

const WalletSelectorContainer = styled.View`
  padding: 20px;
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-top-left-radius: 17px;
  border-top-right-radius: 17px;
`;

const DescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: normal;
  font-size: 16px;
  line-height: 24px;
  margin: 22px 0;
`;

const LinkContainer = styled.View`
  padding-top: 5px;
  padding-bottom: 57px;
`;

const WalletConnectIntro = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const route = useRoute<RouteProp<{params: WalletConnectIntroParamList}>>();
  const {uri} = route.params || {};

  const [walletSelectorModalVisible, setWalletSelectorModalVisible] =
    useState(false);

  const allKeys = useSelector(({WALLET}: RootState) => WALLET.keys);
  let allEthWallets: WalletRowProps[] = [];
  Object.entries(allKeys).map(([_, value]) => {
    if (!value.backupComplete) {
      return;
    }

    const ethWallets = value.wallets.filter(
      wallet => wallet.currencyAbbreviation === 'eth',
    );
    const UIFormattedEthWallets = ethWallets.map(wallet =>
      buildUIFormattedWallet(wallet),
    );
    allEthWallets = [...allEthWallets, ...UIFormattedEthWallets];
  });

  const goToStartView = useCallback(
    async (wallet: Wallet, wcUri: string) => {
      try {
        dispatch(showOnGoingProcessModal(OnGoingProcessMessages.LOADING));
        const peer = (await dispatch<any>(
          walletConnectOnSessionRequest(wcUri),
        )) as any;
        navigation.navigate('WalletConnect', {
          screen: 'WalletConnectStart',
          params: {
            keyId: wallet.keyId,
            walletId: wallet.id,
            peer,
          },
        });
      } catch (e) {
        console.log(e);
      } finally {
        dispatch(dismissOnGoingProcessModal());
      }
    },
    [dispatch, navigation],
  );

  const goToScanView = useCallback(
    (wallet: Wallet) => {
      navigation.navigate('Scan', {
        screen: 'Root',
        params: {
          contextHandler: async data => {
            if (isValidWalletConnectUri(data)) {
              goToStartView(wallet, data);
            }
          },
        },
      });
    },
    [goToStartView, navigation],
  );

  const renderItem = useCallback(
    ({item}) => (
      <WalletRow
        id={item.id}
        onPress={async () => {
          haptic('impactLight');
          setWalletSelectorModalVisible(false);
          await sleep(500);
          uri ? goToStartView(item, uri) : goToScanView(item);
        }}
        wallet={item}
      />
    ),
    [setWalletSelectorModalVisible, goToStartView, goToScanView, uri],
  );

  return (
    <WalletConnectContainer>
      <ScrollView>
        <Paragraph>
          WalletConnect is an open source protocol for connecting decentralized
          applications to mobile wallets with QR code scanning or deep linking.
        </Paragraph>
        <LinkContainer>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              dispatch(openUrlWithInAppBrowser('https://walletconnect.org/'));
            }}>
            <Link>Learn More</Link>
          </TouchableOpacity>
        </LinkContainer>
        <Button
          buttonStyle={'primary'}
          onPress={() => setWalletSelectorModalVisible(true)}>
          Connect
        </Button>

        <SheetModal
          isVisible={walletSelectorModalVisible}
          onBackdropPress={() => setWalletSelectorModalVisible(false)}>
          <WalletSelectorContainer>
            <H4>Select a Wallet</H4>
            {allEthWallets.length ? (
              <DescriptionText>
                Which Ethereum wallet would you like to use for WalletConnect?
              </DescriptionText>
            ) : (
              <DescriptionText>No wallets available</DescriptionText>
            )}
            <FlatList
              contentContainerStyle={{paddingTop: 20, paddingBottom: 20}}
              data={allEthWallets}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
            />
          </WalletSelectorContainer>
        </SheetModal>
      </ScrollView>
    </WalletConnectContainer>
  );
};

export default WalletConnectIntro;
