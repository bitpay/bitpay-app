import React, {useCallback, useLayoutEffect, useMemo, useState} from 'react';
import {useTheme} from '@react-navigation/native';
import {FlatList, LogBox, RefreshControl, TouchableOpacity} from 'react-native';
import styled from 'styled-components/native';
import haptic from '../../../components/haptic-feedback/haptic';
import WalletRow, {WalletRowProps} from '../../../components/list/WalletRow';
import {BaseText, H5, HeaderTitle} from '../../../components/styled/Text';
import Settings from '../../../components/settings/Settings';
import {
  Hr,
  ActiveOpacity,
  ScreenGutter,
  HeaderRightContainer,
} from '../../../components/styled/Containers';
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
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import KeyDropdownOption from '../components/KeyDropdownOption';
import {getPriceHistory, startGetRates} from '../../../store/wallet/effects';
import EncryptPasswordImg from '../../../../assets/img/tinyicon-encrypt.svg';
import EncryptPasswordDarkModeImg from '../../../../assets/img/tinyicon-encrypt-darkmode.svg';

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
  text-align: center;
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
  flex-direction: column;
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
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 50px;
  justify-content: center;
  align-items: center;
  height: 40px;
  width: 40px;
`;

const HeaderTitleContainer = styled.View`
  flex-direction: row;
  align-items: center;
`;

export const buildUIFormattedWallet: (
  wallet: Wallet,
  defaultAltCurrencyIsoCode: string,
  currencyDisplay?: 'symbol',
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
  currencyDisplay,
) => ({
  id,
  keyId,
  img,
  currencyName,
  currencyAbbreviation: currencyAbbreviation.toUpperCase(),
  walletName: walletName || credentials.walletName,
  cryptoBalance: balance.crypto,
  cryptoLockedBalance: balance.cryptoLocked,
  fiatBalance: formatFiatAmount(balance.fiat, defaultAltCurrencyIsoCode, {
    currencyDisplay,
  }),
  fiatLockedBalance: formatFiatAmount(
    balance.fiatLocked,
    defaultAltCurrencyIsoCode,
    {currencyDisplay},
  ),
  network: credentials.network,
  isRefreshing,
  hideWallet,
  hideBalance,
  pendingTxps,
  multisig:
    credentials.n > 1
      ? `- Multisig ${credentials.m}/${credentials.n}`
      : undefined,
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
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const [showKeyOptions, setShowKeyOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {id} = route.params;
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const [showKeyDropdown, setShowKeyDropdown] = useState(false);
  const key = keys[id];
  const hasMultipleKeys =
    Object.values(keys).filter(k => k.backupComplete).length > 1;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => {
        return (
          <KeyToggle
            activeOpacity={ActiveOpacity}
            disabled={!hasMultipleKeys}
            onPress={() => setShowKeyDropdown(true)}>
            {key.methods.isPrivKeyEncrypted() ? (
              theme.dark ? (
                <EncryptPasswordDarkModeImg />
              ) : (
                <EncryptPasswordImg />
              )
            ) : null}
            <HeaderTitleContainer>
              <HeaderTitle style={{textAlign: 'center'}}>
                {key?.keyName}
              </HeaderTitle>
              {hasMultipleKeys && <ChevronDownSvg style={{marginLeft: 10}} />}
            </HeaderTitleContainer>
          </KeyToggle>
        );
      },
      headerRight: () => {
        return key?.methods.isPrivKeyEncrypted() ? (
          <HeaderRightContainer>
            <CogIconContainer
              onPress={() =>
                navigation.navigate('KeySettings', {
                  key,
                })
              }
              activeOpacity={ActiveOpacity}>
              <Icons.Cog />
            </CogIconContainer>
          </HeaderRightContainer>
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
  }, [navigation, key, hasMultipleKeys, theme.dark]);

  const {wallets = [], totalBalance} =
    useAppSelector(({WALLET}) => WALLET.keys[id]) || {};

  const memoizedWalletList = useMemo(() => {
    const coins = wallets.filter(
      wallet => !wallet.credentials.token && !wallet.hideWallet,
    );
    const tokens = wallets.filter(
      wallet => wallet.credentials.token && !wallet.hideWallet,
    );

    return buildNestedWalletList(coins, tokens, defaultAltCurrency.isoCode);
  }, [keys, wallets, defaultAltCurrency.isoCode]);

  const keyOptions: Array<Option> = [];

  if (!key?.methods.isPrivKeyEncrypted()) {
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
      dispatch(getPriceHistory(defaultAltCurrency.isoCode));
      await dispatch(startGetRates({force: true}));
      await Promise.all([
        dispatch(startUpdateAllWalletStatusForKey({key})),
        sleep(1000),
      ]);
      dispatch(updatePortfolioBalance());
    } catch (err) {
      dispatch(showBottomNotificationModal(BalanceUpdateError));
    }
    setRefreshing(false);
  };

  const memoizedRenderItem = useCallback(
    ({item}: {item: WalletRowProps}) => {
      return (
        <WalletRow
          id={item.id}
          wallet={item}
          onPress={() => {
            haptic('impactLight');
            const fullWalletObj = key.wallets.find(({id}) => id === item.id)!;
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
    },
    [navigation, keys],
  );

  return (
    <OverviewContainer>
      <BalanceContainer>
        <Balance scale={shouldScale(totalBalance)}>
          {formatFiatAmount(totalBalance, defaultAltCurrency.isoCode, {
            currencyDisplay: 'symbol',
          })}
        </Balance>
      </BalanceContainer>

      <Hr />

      <FlatList<WalletRowProps>
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
        data={memoizedWalletList}
        renderItem={memoizedRenderItem}
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
              .filter(_key => _key.backupComplete && _key.id !== id)
              .map(_key => (
                <KeyDropdownOption
                  key={_key.id}
                  keyId={_key.id}
                  keyName={_key.keyName}
                  wallets={_key.wallets}
                  totalBalance={_key.totalBalance}
                  onPress={keyId => {
                    setShowKeyDropdown(false);
                    navigation.setParams({
                      id: keyId,
                    });
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
