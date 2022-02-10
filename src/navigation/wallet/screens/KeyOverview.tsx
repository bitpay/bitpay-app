import {useNavigation, useTheme} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import React, {useLayoutEffect, useState} from 'react';
import {FlatList, LogBox, RefreshControl} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import haptic from '../../../components/haptic-feedback/haptic';
import WalletRow, {WalletRowProps} from '../../../components/list/WalletRow';
import {BaseText, H5, HeaderTitle} from '../../../components/styled/Text';
import Settings from '../../../components/settings/Settings';
import {Hr} from '../../../components/styled/Containers';
import {RootState} from '../../../store';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {startUpdateAllWalletBalancesForKey} from '../../../store/wallet/effects/balance/balance';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {Wallet} from '../../../store/wallet/wallet.models';
import {SlateDark, White} from '../../../styles/colors';
import {formatFiatAmount, sleep} from '../../../utils/helper-methods';
import {BalanceUpdateError} from '../components/ErrorMessages';
import OptionsSheet, {Option} from '../components/OptionsSheet';
import Icons from '../components/WalletIcons';
import {WalletStackParamList} from '../WalletStack';
import SettingsIcon from '../../../components/icons/settings/SettingsIcon';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

type KeyOverviewScreenProps = StackScreenProps<
  WalletStackParamList,
  'KeyOverview'
>;

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

export const buildUIFormattedWallet: (wallet: Wallet) => WalletRowProps = ({
  id,
  img,
  currencyName,
  currencyAbbreviation,
  walletName,
  balance,
  credentials,
  keyId,
}) => ({
  id,
  keyId,
  img,
  currencyName,
  currencyAbbreviation: currencyAbbreviation.toUpperCase(),
  walletName,
  cryptoBalance: balance.crypto,
  fiatBalance: formatFiatAmount(balance.fiat, 'usd'),
  network: credentials.network,
});

// Key overview and Key settings list builder
export const buildNestedWalletList = (wallets: Wallet[]) => {
  const walletList = [] as Array<WalletRowProps>;
  const _coins = wallets.filter(wallet => !wallet.credentials.token);
  const _tokens = wallets.filter(wallet => wallet.credentials.token);

  _coins.forEach(coin => {
    walletList.push(buildUIFormattedWallet(coin));
    // eth wallet with tokens -> for every token wallet ID grab full wallet from _tokens and add it to the list
    if (coin.tokens) {
      coin.tokens.forEach(id => {
        const tokenWallet = _tokens.find(token => token.id === id);
        if (tokenWallet) {
          walletList.push({
            ...buildUIFormattedWallet(tokenWallet),
            isToken: true,
          });
        }
      });
    }
  });

  return walletList;
};

const KeyOverview: React.FC<KeyOverviewScreenProps> = ({route}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const [showKeyOptions, setShowKeyOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {key} = route.params;
  const {isPrivKeyEncrypted} = key;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>My Key</HeaderTitle>,
      headerRight: () => {
        return isPrivKeyEncrypted ? (
          <SettingsIcon
            onPress={() =>
              navigation.navigate('Wallet', {
                screen: 'KeySettings',
                params: {
                  key,
                },
              })
            }
          />
        ) : (
          <>
            <Settings
              onPress={() => {
                setShowKeyOptions(true);
              }}
            />
          </>
        );
      },
    });
  }, [navigation]);

  const {wallets = [], totalBalance} = useSelector(
    ({WALLET}: RootState) => WALLET.keys[key.id] || {},
  );

  const walletList = buildNestedWalletList(wallets);

  const keyOptions: Array<Option> = [];

  if (!isPrivKeyEncrypted) {
    keyOptions.push({
      img: <Icons.Encrypt />,
      title: 'Encrypt your Key',
      description:
        'Prevent an unauthorized used from sending funds out of your wallet.',
      onPress: () => {
        navigation.navigate('Wallet', {
          screen: 'CreateEncryptPassword',
          params: {
            key,
          },
        });
      },
    });

    keyOptions.push({
      img: <Icons.Settings />,
      title: 'Key Settings',
      description: 'View all the ways to manage and configure your key.',
      onPress: () =>
        navigation.navigate('Wallet', {
          screen: 'KeySettings',
          params: {
            key,
          },
        }),
    });
  }

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(startUpdateAllWalletBalancesForKey(key)),
        sleep(1000),
      ]);
      dispatch(updatePortfolioBalance());
    } catch (err) {
      dispatch(showBottomNotificationModal(BalanceUpdateError));
    }
    setRefreshing(false);
  };

  return (
    <OverviewContainer>
      <BalanceContainer>
        <Balance>${totalBalance?.toFixed(2)} USD</Balance>
      </BalanceContainer>
      <Hr />
      <FlatList
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={() => onRefresh()}
          />
        }
        ListHeaderComponent={() => {
          return (
            <WalletListHeader>
              <H5>My Wallets</H5>
            </WalletListHeader>
          );
        }}
        ListFooterComponent={() => {
          return (
            <WalletListFooter
              activeOpacity={0.75}
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('Wallet', {
                  screen: 'CurrencySelection',
                  params: {context: 'addWallet', key},
                });
              }}>
              <Icons.Add />
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
                  params: {walletId: item.id, key},
                })
              }
            />
          );
        }}
      />
      {keyOptions.length > 0 ? (
        <OptionsSheet
          isVisible={showKeyOptions}
          title={'Key Options'}
          options={keyOptions}
          closeModal={() => setShowKeyOptions(false)}
        />
      ) : null}
    </OverviewContainer>
  );
};

export default KeyOverview;
