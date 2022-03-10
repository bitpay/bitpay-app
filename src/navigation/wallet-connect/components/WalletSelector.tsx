import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {FlatList} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import haptic from '../../../components/haptic-feedback/haptic';
import WalletRow, {WalletRowProps} from '../../../components/list/WalletRow';
import {BaseText, H4} from '../../../components/styled/Text';
import {RootState} from '../../../store';
import {Wallet} from '../../../store/wallet/wallet.models';
import {
  isValidWalletConnectUri,
  keyExtractor,
  sleep,
} from '../../../utils/helper-methods';
import {buildUIFormattedWallet} from '../../wallet/screens/KeyOverview';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {walletConnectOnSessionRequest} from '../../../store/wallet-connect/wallet-connect.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';
import {LightBlack, White} from '../../../styles/colors';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {ScreenGutter} from '../../../components/styled/Containers';

export type WalletConnectIntroParamList = {
  uri?: string;
};

const WalletSelectorContainer = styled.View`
  padding: ${ScreenGutter};
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  max-height: 75%;
`;

const DescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: normal;
  font-size: 16px;
  line-height: 24px;
  margin: 22px 0;
`;

export default ({
  isVisible,
  dappUri,
  onBackdropPress,
}: {
  isVisible: boolean;
  dappUri: string;
  onBackdropPress: () => void;
}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [uri, setUri] = useState(dappUri);

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

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

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
        setUri('');
        await showErrorMessage(
          CustomErrorMessage({
            errMsg: BWCErrorMessage(e),
            title: 'Uh oh, something went wrong',
          }),
        );
      } finally {
        dispatch(dismissOnGoingProcessModal());
      }
    },
    [dispatch, navigation, showErrorMessage],
  );

  const goToScanView = useCallback(
    (wallet: Wallet) => {
      navigation.navigate('Scan', {
        screen: 'Root',
        params: {
          onScanComplete: async data => {
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
          onBackdropPress();
          await sleep(500);
          uri ? goToStartView(item, uri) : goToScanView(item);
        }}
        wallet={item}
      />
    ),
    [onBackdropPress, goToStartView, goToScanView, uri],
  );

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onBackdropPress}>
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
  );
};
