import React, {useLayoutEffect, useState} from 'react';
import {StackActions, useTheme} from '@react-navigation/native';
import {FlatList, LogBox, RefreshControl, TouchableOpacity} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import haptic from '../../../components/haptic-feedback/haptic';
import WalletRow, {WalletRowProps} from '../../../components/list/WalletRow';
import {BaseText, H5, HeaderTitle} from '../../../components/styled/Text';
import Settings from '../../../components/settings/Settings';
import {
  Hr,
  ActiveOpacity,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {RootState} from '../../../store';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {Wallet, Status} from '../../../store/wallet/wallet.models';
import {
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../styles/colors';
import {
  formatFiatAmount,
  shouldScale,
  sleep,
} from '../../../utils/helper-methods';
import {BalanceUpdateError} from '../components/ErrorMessages';
import OptionsSheet, {Option} from '../components/OptionsSheet';
import Icons from '../components/WalletIcons';
import {WalletStackParamList} from '../WalletStack';
import {StackScreenProps} from '@react-navigation/stack';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import {useAppSelector} from '../../../utils/hooks';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import KeyDropdownOption from '../components/KeyDropdownOption';
import {startGetRates} from '../../../store/wallet/effects';

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

const Balance = styled(BaseText)<{scale: boolean}>`
  font-size: ${({scale}) => (scale ? 25 : 35)}px;
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

const KeyToggle = styled(TouchableOpacity)`
  align-items: center;
  flex-direction: row;
`;

const KeyDropdown = styled.SafeAreaView`
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  max-height: 75%;
`;

const KeyDropdownOptionsContainer = styled.ScrollView`
  padding: 0 ${ScreenGutter};
`;

const CogIconContainer = styled.TouchableOpacity`
  margin-top: 10px;
  margin-right: 10px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 50px;
  justify-content: center;
  align-items: center;
  height: 45px;
  width: 45px;
`;

export const buildUIFormattedWallet: (
  wallet: Wallet,
  defaultAltCurrencyIsoCode: string,
) => WalletRowProps = (
  {
    id,
    img,
    currencyName,
    currencyAbbreviation,
    walletName,
    balance,
    credentials,
    keyId,
    isRefreshing,
    hideWallet,
    hideBalance,
    pendingTxps,
  },
  defaultAltCurrencyIsoCode,
) => ({
  id,
  keyId,
  img,
  currencyName,
  currencyAbbreviation: currencyAbbreviation.toUpperCase(),
  walletName: walletName || credentials.walletName,
  cryptoBalance: balance.crypto,
  cryptoLockedBalance: balance.cryptoLocked,
  fiatBalance: formatFiatAmount(balance.fiat, defaultAltCurrencyIsoCode),
  fiatLockedBalance: formatFiatAmount(
    balance.fiatLocked,
    defaultAltCurrencyIsoCode,
  ),
  network: credentials.network,
  isRefreshing,
  hideWallet,
  hideBalance,
  pendingTxps,
});

// Key overview list builder
export const buildNestedWalletList = (
  coins: Wallet[],
  tokens: Wallet[],
  defaultAltCurrencyIso: string,
) => {
  const walletList = [] as Array<WalletRowProps>;

  coins.forEach(coin => {
    walletList.push({
      ...buildUIFormattedWallet(coin, defaultAltCurrencyIso),
    });
    // eth wallet with tokens -> for every token wallet ID grab full wallet from _tokens and add it to the list
    if (coin.tokens) {
      coin.tokens.forEach(id => {
        const tokenWallet = tokens.find(token => token.id === id);
        if (tokenWallet) {
          walletList.push({
            ...buildUIFormattedWallet(tokenWallet, defaultAltCurrencyIso),
            isToken: true,
          });
        }
      });
    }
  });

  return walletList;
};

const KeyOverview: React.FC<KeyOverviewScreenProps> = ({navigation, route}) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const [showKeyOptions, setShowKeyOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {key} = route.params;
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);

  const [showKeyDropdown, setShowKeyDropdown] = useState(false);
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => {
        const hasMultipleKeys =
          Object.values(keys).filter(key => key.backupComplete).length > 1;
        return (
          <KeyToggle
            activeOpacity={ActiveOpacity}
            disabled={!hasMultipleKeys}
            onPress={() => setShowKeyDropdown(true)}>
            <HeaderTitle>{key?.keyName}</HeaderTitle>
            {hasMultipleKeys && <ChevronDownSvg style={{marginLeft: 10}} />}
          </KeyToggle>
        );
      },
      headerRight: () => {
        return key.methods.isPrivKeyEncrypted() ? (
          <CogIconContainer
            onPress={() =>
              navigation.navigate('KeySettings', {
                key,
              })
            }
            activeOpacity={ActiveOpacity}>
            <Icons.Cog />
          </CogIconContainer>
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
  }, [navigation, key]);

  const {wallets = [], totalBalance} = useSelector(
    ({WALLET}: RootState) => WALLET.keys[key.id] || {},
  );

  const coins = wallets.filter(
    wallet => !wallet.credentials.token && !wallet.hideWallet,
  );
  const tokens = wallets.filter(
    wallet => wallet.credentials.token && !wallet.hideWallet,
  );

  const walletList = buildNestedWalletList(
    coins,
    tokens,
    defaultAltCurrency.isoCode,
  );

  const keyOptions: Array<Option> = [];

  if (!key.methods.isPrivKeyEncrypted()) {
    keyOptions.push({
      img: <Icons.Encrypt />,
      title: 'Encrypt your Key',
      description:
        'Prevent an unauthorized user from sending funds out of your wallet.',
      onPress: () => {
        haptic('impactLight');
        navigation.navigate('KeySettings', {
          key,
          context: 'createEncryptPassword',
        });
      },
    });

    keyOptions.push({
      img: <Icons.Settings />,
      title: 'Key Settings',
      description: 'View all the ways to manage and configure your key.',
      onPress: () => {
        haptic('impactLight');
        navigation.navigate('KeySettings', {
          key,
        });
      },
    });
  }

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(startGetRates());
      await Promise.all([
        dispatch(startUpdateAllWalletStatusForKey(key)),
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
        <Balance scale={shouldScale(totalBalance)}>
          {formatFiatAmount(totalBalance, defaultAltCurrency.isoCode)}
        </Balance>
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
              activeOpacity={ActiveOpacity}
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('AddingOptions', {
                  key,
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
              onPress={() => {
                haptic('impactLight');
                const fullWalletObj = key.wallets.find(
                  ({id}) => id === item.id,
                )!;
                if (!fullWalletObj.isComplete()) {
                  fullWalletObj.getStatus(
                    {network: 'livenet'},
                    (err: any, status: Status) => {
                      if (err) {
                        // TODO
                        console.log(err);
                      }
                      navigation.navigate('Copayers', {
                        wallet: fullWalletObj,
                        status: status.wallet,
                      });
                    },
                  );
                } else {
                  navigation.navigate('WalletDetails', {
                    walletId: item.id,
                    key,
                  });
                }
              }}
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
      <SheetModal
        isVisible={showKeyDropdown}
        placement={'top'}
        onBackdropPress={() => setShowKeyDropdown(false)}>
        <KeyDropdown>
          <HeaderTitle style={{margin: 15}}>Other Keys</HeaderTitle>
          <KeyDropdownOptionsContainer>
            {Object.values(keys)
              .filter(_key => _key.id !== key.id)
              .filter(_key => _key.backupComplete)
              .map(({id, keyName, wallets, totalBalance}) => (
                <KeyDropdownOption
                  key={id}
                  keyId={id}
                  keyName={keyName}
                  wallets={wallets}
                  totalBalance={totalBalance}
                  onPress={keyId => {
                    setShowKeyDropdown(false);
                    navigation.dispatch(
                      StackActions.replace('Wallet', {
                        screen: 'KeyOverview',
                        params: {key: keys[keyId]},
                      }),
                    );
                  }}
                  defaultAltCurrencyIsoCode={defaultAltCurrency.isoCode}
                />
              ))}
          </KeyDropdownOptionsContainer>
        </KeyDropdown>
      </SheetModal>
    </OverviewContainer>
  );
};

export default KeyOverview;
