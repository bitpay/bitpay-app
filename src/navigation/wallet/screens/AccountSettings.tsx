import React, {useLayoutEffect, useMemo, useState} from 'react';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import {View} from 'react-native';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  Hr,
  Info,
  InfoImageContainer,
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
import {TouchableOpacity} from 'react-native-gesture-handler';
import WalletSettingsRow from '../../../components/list/WalletSettingsRow';
import InfoSvg from '../../../../assets/img/info.svg';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {sleep} from '../../../utils/helper-methods';
import {buildAccountList} from '../../../store/wallet/utils/wallet';
import {Key} from '../../../store/wallet/wallet.models';

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

const WalletNameContainer = styled.TouchableOpacity`
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
  margin: 20px 0;
`;

const AssetsHeaderContainer = styled.View`
  padding-top: ${ScreenGutter};
  flex-direction: row;
  align-items: center;
`;

const AccountSettings = () => {
  const {t} = useTranslation();
  const {
    params: {key, selectedAccountAddress},
  } = useRoute<RouteProp<WalletGroupParamList, 'AccountSettings'>>();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const accountInfo = useAppSelector(
    ({WALLET}) => WALLET.keys[key.id].evmAccountsInfo,
  );
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as WalletRowProps[]);
  const selectedChainFilterOption = useAppSelector(
    ({APP}) => APP.selectedChainFilterOption,
  );
  const {rates} = useAppSelector(({RATE}) => RATE);
  const {defaultAltCurrency} = useAppSelector(({APP}) => APP);
  const _key: Key = useAppSelector(({WALLET}) => WALLET.keys[key.id]);
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
    accountInfo?.[accountItem.receiveAddress]?.hideAccount,
  );

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
      <>
        {wallets.map(
          (
            {
              id,
              currencyName,
              img,
              badgeImg,
              isToken,
              hideWallet,
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
              walletName={walletName}
              onPress={() => onPressItem(isComplete, id)}
            />
          ),
        )}
      </>
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Account Settings')}</HeaderTitle>,
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
              setHideAccount(!hideAccount);
              dispatch(
                toggleHideAccount({
                  keyId: key.id,
                  accountAddress: accountItem.receiveAddress,
                }),
              );
              dispatch(startUpdateAllWalletStatusForKey({key, force: true}));
              await sleep(1000);
              dispatch(updatePortfolioBalance());
            }}
            isEnabled={!!hideAccount}
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

        <Hr />

        <AssetsHeaderContainer>
          <Title>{t('Assets')}</Title>
          <InfoImageContainer infoMargin={'0 0 0 8px'}>
            <TouchableOpacity
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('KeyExplanation');
              }}>
              <InfoSvg />
            </TouchableOpacity>
          </InfoImageContainer>
        </AssetsHeaderContainer>

        <SearchComponentContainer>
          <SearchComponent<WalletRowProps>
            searchVal={searchVal}
            setSearchVal={setSearchVal}
            searchResults={searchResults}
            setSearchResults={setSearchResults}
            searchFullList={accountItem.wallets}
            context={'accountsettings'}
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
