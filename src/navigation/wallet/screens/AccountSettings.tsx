import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {View} from 'react-native';
import styled from 'styled-components/native';
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
import {baseNavigatorOptions} from '../../../constants/NavigationOptions';
import HeaderBackButton from '../../../components/back/HeaderBackButton';
import {IsVMChain} from '../../../store/wallet/utils/currency';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {dismissOnGoingProcessModal} from '../../../store/app/app.actions';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const AccountSettingsContainer = styled.SafeAreaView`
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

const WalletNameContainer = styled(TouchableOpacity)`
  padding: 10px 0 20px 0;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const InfoDescription = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const AccountSettingsTitle = styled(SettingTitle)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const SearchComponentContainer = styled.View`
  margin: 5px 0px 20px 0px;
`;

const AssetsHeaderContainer = styled.View`
  padding-top: ${ScreenGutter};
  flex-direction: row;
  align-items: center;
`;

const AccountSettings = () => {
  const {t} = useTranslation();
  const {
    params: {key, selectedAccountAddress, context, isSvmAccount},
  } = useRoute<RouteProp<WalletGroupParamList, 'AccountSettings'>>();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const _key: Key = keys[key.id];

  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as WalletRowProps[]);
  const selectedChainFilterOption = useAppSelector(
    ({APP}) => APP.selectedChainFilterOption,
  );
  const {rates} = useAppSelector(({RATE}) => RATE);
  const {defaultAltCurrency} = useAppSelector(({APP}) => APP);
  const accountItem = useMemo(() => {
    const updatedKey = {
      ...key,
      wallets: _key.wallets.filter(
        wallet => wallet.receiveAddress === selectedAccountAddress,
      ),
    };
    return buildAccountList(
      updatedKey,
      defaultAltCurrency.isoCode,
      rates,
      dispatch,
      {
        skipFiatCalculations: true,
      },
    )[0];
  }, [_key, defaultAltCurrency.isoCode, rates]);
  const {accountName} = accountItem;
  const [hideAccount, setHideAccount] = useState(
    () =>
      _key.evmAccountsInfo?.[accountItem.receiveAddress]?.hideAccount ?? false,
  );
  const hasVisibleWallet = useMemo(
    () => _key.wallets.some(w => !w.hideWallet && IsVMChain(w.chain)),
    [_key],
  );
  useEffect(() => {
    const newHideAccount =
      _key.evmAccountsInfo?.[accountItem.receiveAddress]?.hideAccount ?? false;
    setHideAccount(newHideAccount);
  }, [_key]);

  const onPressItem = (isComplete: boolean | undefined, walletId: string) => {
    // Ignore if wallet is not complete
    if (!isComplete) {
      return;
    }
    haptic('impactLight');
    navigation.navigate('WalletSettings', {
      key,
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
              navigation.dispatch(
                CommonActions.reset({
                  index: 1,
                  routes: [
                    {
                      name: RootStacks.TABS,
                      params: {screen: TabsScreens.HOME},
                    },
                    {
                      name: WalletScreens.KEY_OVERVIEW,
                      params: {
                        id: key.id,
                      },
                    },
                  ],
                }),
              );
            } else {
              navigation.goBack();
            }
          }}
        />
      ),
    });
  });
  return (
    <AccountSettingsContainer>
      <ScrollView>
        <WalletNameContainer
          activeOpacity={ActiveOpacity}
          onPress={() => {
            haptic('impactLight');
            navigation.navigate('UpdateKeyOrWalletName', {
              key,
              accountItem,
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
              dispatch(startOnGoingProcessModal('LOADING'));
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
              dispatch(dismissOnGoingProcessModal());
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

        <AssetsHeaderContainer>
          <Title>{t('Assets')}</Title>
        </AssetsHeaderContainer>

        <SearchComponentContainer>
          <SearchComponent<WalletRowProps>
            searchVal={searchVal}
            setSearchVal={setSearchVal}
            searchResults={searchResults}
            setSearchResults={setSearchResults}
            searchFullList={accountItem.wallets}
            context={'accountsettings'}
            hideFilter={isSvmAccount}
          />
        </SearchComponentContainer>

        <WalletList
          wallets={
            !searchVal && !selectedChainFilterOption
              ? accountItem.wallets
              : searchResults
          }
        />
      </ScrollView>
    </AccountSettingsContainer>
  );
};

export default AccountSettings;
