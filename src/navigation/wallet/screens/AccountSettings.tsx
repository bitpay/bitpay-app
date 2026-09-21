import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {SafeAreaView, ScrollView, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../contexts';
import {
  ActiveOpacity,
  Hr,
  Info,
  InfoTriangle,
  ScreenGutter,
  SettingTitle,
  SettingView,
} from '../../../components/styled/Containers';
import ChevronRightSvg from '../../../../assets/img/angle-right.svg';
import haptic from '../../../components/haptic-feedback/haptic';

import {SlateDark, White} from '../../../styles/colors';
import ToggleSwitch from '../../../components/toggle-switch/ToggleSwitch';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  toggleHideAccount,
  updatePortfolioBalance,
} from '../../../store/wallet/wallet.actions';
import {useTranslation} from 'react-i18next';
import SearchComponent from '../../../components/chain-search/ChainSearch';
import {WalletRowProps} from '../../../components/list/WalletRow';
import WalletSettingsRow from '../../../components/list/WalletSettingsRow';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {sleep} from '../../../utils/helper-methods';
import {buildAccountList} from '../../../store/wallet/utils/wallet';
import {Key} from '../../../store/wallet/wallet.models';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../tabs/TabsStack';
import {CommonActions} from '@react-navigation/native';
import HeaderBackButton from '../../../components/back/HeaderBackButton';
import {IsVMChain} from '../../../store/wallet/utils/currency';
import {
  TouchableOpacity,
  TouchableOpacityProps,
} from '@components/base/TouchableOpacity';
import {useOngoingProcess} from '../../../contexts';
import {isTSSKey} from '../../../store/wallet/effects/tss-send/tss-send';
import ThresholdBadge from '../../../components/threshold-badge/ThresholdBadge';

const styles = StyleSheet.create({
  accountSettingsContainer: {
    flex: 1,
  },
  scrollView: {
    marginTop: 20,
    paddingHorizontal: parseInt(ScreenGutter, 10),
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    marginVertical: 5,
  },
  walletNameContainer: {
    paddingTop: 10,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoDescription: {
    fontSize: 16,
  },
  searchComponentContainer: {
    marginTop: 5,
    marginBottom: 20,
  },
  assetsHeaderContainer: {
    paddingTop: parseInt(ScreenGutter, 10),
    flexDirection: 'row',
    alignItems: 'center',
  },
});

const Title: React.FC<React.ComponentProps<typeof BaseText>> = props => {
  const theme = useTheme();
  return (
    <BaseText
      {...props}
      style={[styles.title, {color: theme.colors.text}, props.style]}
    />
  );
};

const WalletNameContainer: React.FC<TouchableOpacityProps> = ({
  style,
  ...props
}) => (
  <TouchableOpacity style={[styles.walletNameContainer, style]} {...props} />
);

const InfoDescription: React.FC<
  React.ComponentProps<typeof BaseText>
> = props => {
  const theme = useTheme();
  return (
    <BaseText
      {...props}
      style={[
        styles.infoDescription,
        {color: theme.dark ? White : SlateDark},
        props.style,
      ]}
    />
  );
};

const AccountSettingsTitle: React.FC<
  React.ComponentProps<typeof SettingTitle>
> = props => {
  const theme = useTheme();
  return (
    <SettingTitle
      {...props}
      style={[{color: theme.dark ? White : SlateDark}, props.style]}
    />
  );
};

const AccountSettings = () => {
  const {t} = useTranslation();
  const {
    params: {keyId, selectedAccountAddress, context, isSvmAccount},
  } = useRoute<RouteProp<WalletGroupParamList, 'AccountSettings'>>();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const key: Key = useAppSelector(({WALLET}) => WALLET.keys[keyId]);
  const tssMetadata = key.wallets.find(wallet => wallet.tssKeyId)?.tssMetadata;

  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as WalletRowProps[]);
  const selectedChainFilterOption = useAppSelector(
    ({APP}) => APP.selectedChainFilterOption,
  );
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const accountItem = useMemo(() => {
    const updatedKey = {
      ...key,
      wallets: key.wallets.filter(
        wallet => wallet.receiveAddress === selectedAccountAddress,
      ),
    };
    return buildAccountList(
      updatedKey,
      defaultAltCurrency.isoCode,
      {},
      dispatch,
      {
        skipFiatCalculations: true,
      },
    )[0];
  }, [key, defaultAltCurrency.isoCode, dispatch, selectedAccountAddress]);
  const {accountName} = accountItem;
  const [hideAccount, setHideAccount] = useState(
    () =>
      key.evmAccountsInfo?.[accountItem.receiveAddress]?.hideAccount ?? false,
  );
  const hasVisibleWallet = useMemo(
    () => key.wallets.some(w => !w.hideWallet && IsVMChain(w.chain)),
    [key],
  );
  useEffect(() => {
    const newHideAccount =
      key.evmAccountsInfo?.[accountItem.receiveAddress]?.hideAccount ?? false;
    setHideAccount(newHideAccount);
  }, [accountItem.receiveAddress, key]);

  const onPressItem = (isComplete: boolean | undefined, walletId: string) => {
    // Ignore if wallet is not complete
    if (!isComplete) {
      return;
    }
    haptic('impactLight');
    navigation.navigate('WalletSettings', {
      keyId,
      walletId,
    });
  };

  const WalletList = ({wallets}: {wallets: WalletRowProps[]}) => {
    return (
      <View style={{paddingBottom: 50}}>
        {wallets.map(
          (
            {
              id,
              currencyName,
              img,
              badgeImg,
              isToken,
              hideWallet,
              hideWalletByAccount,
              walletName,
              isComplete,
            },
            index,
          ) => (
            <WalletSettingsRow
              key={index.toString()}
              img={img}
              badgeImg={badgeImg}
              currencyName={currencyName}
              isToken={isToken}
              hideWallet={hideWallet}
              hideWalletByAccount={hideWalletByAccount}
              walletName={walletName}
              onPress={() => onPressItem(isComplete, id)}
            />
          ),
        )}
      </View>
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Account Settings')}</HeaderTitle>,
      headerLeft: () => (
        <HeaderBackButton
          onPress={() => {
            if (hideAccount && context === 'accountDetails') {
              const baseRoutes = [
                {
                  name: RootStacks.TABS,
                  params: {screen: TabsScreens.HOME},
                },
              ];
              const keyOverviewRoute = {
                name: WalletScreens.KEY_OVERVIEW,
                params: {id: key.id},
              };
              const routes = isTSSKey(key)
                ? [...baseRoutes]
                : [...baseRoutes, keyOverviewRoute];

              navigation.dispatch(
                CommonActions.reset({
                  index: routes.length - 1,
                  routes,
                }),
              );
            } else {
              navigation.goBack();
            }
          }}
        />
      ),
    });
  }, [context, hideAccount, key, navigation, t]);
  return (
    <SafeAreaView style={styles.accountSettingsContainer}>
      <ScrollView style={styles.scrollView}>
        <WalletNameContainer
          activeOpacity={ActiveOpacity}
          onPress={() => {
            haptic('impactLight');
            navigation.navigate('UpdateKeyOrWalletName', {
              keyId,
              account: {
                accountAddress: accountItem.receiveAddress,
                accountName: accountItem.accountName,
              },
              context: 'account',
            });
          }}>
          <View>
            <Title>{t('Name')}</Title>
            <AccountSettingsTitle>{accountName}</AccountSettingsTitle>
          </View>

          <ChevronRightSvg height={16} />
        </WalletNameContainer>

        <Hr />

        <SettingView>
          <AccountSettingsTitle>{t('Hide Account')}</AccountSettingsTitle>

          <ToggleSwitch
            onChange={async () => {
              showOngoingProcess('LOADING');
              setHideAccount(!hideAccount);
              dispatch(
                toggleHideAccount({
                  keyId: key.id,
                  accountAddress: accountItem.receiveAddress,
                  accountToggleSelected: !hideAccount,
                }),
              );
              await sleep(1000);
              dispatch(
                startUpdateAllWalletStatusForKey({
                  key,
                  force: true,
                  createTokenWalletWithFunds: false,
                }),
              );
              await sleep(1000);
              dispatch(updatePortfolioBalance());
              hideOngoingProcess();
            }}
            isEnabled={!!hideAccount}
            isDisabled={!hasVisibleWallet}
          />
        </SettingView>
        {!hideAccount ? (
          <Info>
            <InfoTriangle />
            <InfoDescription>
              {t('This account will not be removed from the device.')}
            </InfoDescription>
          </Info>
        ) : null}
        {!hasVisibleWallet ? (
          <Info>
            <InfoTriangle />
            <InfoDescription>
              {t('All wallets in this account are hidden.')}
            </InfoDescription>
          </Info>
        ) : null}

        <Hr />

        <View style={styles.assetsHeaderContainer}>
          <Title>{t('Wallets')}</Title>
          {tssMetadata ? (
            <ThresholdBadge
              m={tssMetadata.m}
              n={tssMetadata.n}
              size={'list'}
              style={{marginLeft: 4}}
            />
          ) : null}
        </View>

        <View style={styles.searchComponentContainer}>
          <SearchComponent<WalletRowProps>
            searchVal={searchVal}
            setSearchVal={setSearchVal}
            searchResults={searchResults}
            setSearchResults={setSearchResults}
            searchFullList={accountItem.wallets}
            context={'accountsettings'}
            hideFilter={isSvmAccount}
          />
        </View>

        <WalletList
          wallets={
            !searchVal && !selectedChainFilterOption
              ? accountItem.wallets
              : searchResults
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountSettings;
