import React, {useLayoutEffect, useState} from 'react';
import styled from 'styled-components/native';
import {BaseText, H5, HeaderTitle} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import WalletRow, {WalletRowProps} from '../../../components/list/WalletRow';
import {FlatList, LogBox} from 'react-native';
import AddWallet from '../../../../assets/img/add-asset.svg';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import OptionsBottomPopupModal, {
  Option,
} from '../components/OptionsBottomPopupModal';
import Settings from '../../../components/settings/Settings';
import BackupSvg from '../../../../assets/img/wallet/backup.svg';
import EncryptSvg from '../../../../assets/img/wallet/encrypt.svg';
import SettingsSvg from '../../../../assets/img/wallet/settings.svg';
import {Hr} from '../../../components/styled/Containers';
import {Wallet} from '../../../store/wallet/wallet.models';
import {formatFiatBalance} from '../../../utils/helper-methods';
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);
const OverviewContainer = styled.View`
  flex: 1;
`;

const BalanceContainer = styled.View`
  height: 15%;
  margin-top: 20px;
  padding: 10px 15px;
`;

const Balance = styled(BaseText)`
  font-size: 36px;
  font-style: normal;
  font-weight: 700;
  line-height: 53px;
  letter-spacing: 0;
`;

const WalletListHeader = styled.View`
  padding: 10px;
  margin-top: 10px;
`;

const WalletListFooter = styled.TouchableOpacity`
  padding: 10px 10px 100px 10px;
  margin-top: 15px;
  flex-direction: row;
  align-items: center;
`;

const WalletListFooterText = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0;
  margin-left: 10px;
`;

// Key overview and Key settings list builder
export const buildNestedWalletList = (wallets: Wallet[]) => {
  const walletList = [] as Array<WalletRowProps>;
  const _coins = wallets.filter(wallet => !wallet.credentials.token);
  const _tokens = wallets.filter(wallet => wallet.credentials.token);

  const buildRow: (wallet: Wallet) => WalletRowProps = ({
    id,
    img,
    currencyName,
    currencyAbbreviation,
    balance = 0,
  }) => ({
    id,
    img,
    currencyName,
    currencyAbbreviation: currencyAbbreviation.toUpperCase(),
    cryptoBalance: balance,
    fiatBalance: formatFiatBalance(balance),
  });

  _coins.forEach(coin => {
    walletList.push(buildRow(coin));
    // eth wallet with tokens -> for every token wallet ID grab full wallet from _tokens and add it to the list
    if (coin.tokens) {
      coin.tokens.forEach(id => {
        // eslint-disable-next-line no-shadow
        const tokenWallet = _tokens.find(token => token.id === id);
        if (tokenWallet) {
          walletList.push({...buildRow(tokenWallet), isToken: true});
        }
      });
    }
  });

  return walletList;
};

const KeyOverview = () => {
  const route = useRoute<RouteProp<WalletStackParamList, 'KeyOverview'>>();
  const navigation = useNavigation();
  const [showKeyOptions, setShowKeyOptions] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>My Key</HeaderTitle>,
      headerRight: () => (
        <Settings
          onPress={() => {
            setShowKeyOptions(true);
          }}
        />
      ),
    });
  });
  const {key} = route.params;
  const {wallets} = useSelector(
    ({WALLET}: RootState) => WALLET.keys[key.id],
  ) || {wallets: []};
  const walletList = buildNestedWalletList(wallets);

  const keyOptions: Array<Option> = [
    {
      img: <BackupSvg />,
      title: 'Create a Backup Phrase',
      description:
        'The only way to recover a key if your phone is lost or stolen.',
      onPress: () => null,
    },
    {
      img: <EncryptSvg />,
      title: 'Encrypt your Key',
      description:
        'Prevent an unauthorized used from sending funds out of your wallet.',
      onPress: () => null,
    },
    {
      img: <SettingsSvg />,
      title: 'Key Settings',
      description: 'View all the ways to manage and configure your key.',
      onPress: () =>
        navigation.navigate('Wallet', {
          screen: 'KeySettings',
          params: {
            key,
          },
        }),
    },
  ];

  return (
    <OverviewContainer>
      <BalanceContainer>
        <Balance>${key.totalBalance?.toFixed(2)} USD</Balance>
      </BalanceContainer>
      <Hr />
      <FlatList
        ListHeaderComponent={() => {
          return (
            <WalletListHeader>
              <H5>My Wallets</H5>
            </WalletListHeader>
          );
        }}
        ListFooterComponent={() => {
          return (
            <WalletListFooter activeOpacity={0.75} onPress={() => null}>
              <AddWallet />
              <WalletListFooterText>Add Wallet</WalletListFooterText>
            </WalletListFooter>
          );
        }}
        data={walletList}
        renderItem={({item}) => {
          return (
            <WalletRow
              id={item.id}
              wallet={item}
              onPress={() =>
                navigation.navigate('Wallet', {
                  screen: 'WalletDetails',
                  params: {wallet: item},
                })
              }
            />
          );
        }}
      />
      <OptionsBottomPopupModal
        isVisible={showKeyOptions}
        title={'Key Options'}
        options={keyOptions}
        closeModal={() => setShowKeyOptions(false)}
      />
    </OverviewContainer>
  );
};

export default KeyOverview;
