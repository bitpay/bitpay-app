import React, {useLayoutEffect, useState} from 'react';
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
import {sleep} from '../../../utils/helper-methods';
import {
  toggleHideAccount,
  updatePortfolioBalance,
} from '../../../store/wallet/wallet.actions';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {useTranslation} from 'react-i18next';
import SearchComponent from '../../../components/chain-search/ChainSearch';
import {WalletRowProps} from '../../../components/list/WalletRow';
import {TouchableOpacity} from 'react-native-gesture-handler';
import WalletSettingsRow from '../../../components/list/WalletSettingsRow';
import InfoSvg from '../../../../assets/img/info.svg';

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
    params: {accountItem, key},
  } = useRoute<RouteProp<WalletGroupParamList, 'AccountSettings'>>();
  const navigation = useNavigation();
  const accountInfo = useAppSelector(
    ({WALLET}) => WALLET.keys[key.id].evmAccountsInfo,
  );
  const hideAccount = accountInfo?.[accountItem.receiveAddress]?.hideAccount;
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as WalletRowProps[]);
  const selectedChainFilterOption = useAppSelector(
    ({APP}) => APP.selectedChainFilterOption,
  );

  const {accountName} = accountItem;

  const dispatch = useAppDispatch();

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
          ({
            id,
            currencyName,
            chain,
            img,
            badgeImg,
            isToken,
            network,
            hideWallet,
            walletName,
            isComplete,
          }) => (
            <TouchableOpacity
              onPress={() => onPressItem(isComplete, id)}
              key={id}
              activeOpacity={ActiveOpacity}>
              <WalletSettingsRow
                id={id}
                img={img}
                badgeImg={badgeImg}
                currencyName={currencyName}
                chain={chain}
                key={id}
                isToken={isToken}
                network={network}
                hideWallet={hideWallet}
                walletName={walletName}
                isComplete={isComplete}
              />
            </TouchableOpacity>
          ),
        )}
      </>
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Wallet Settings')}</HeaderTitle>,
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

        <SettingView>
          <AccountSettingsTitle>{t('Hide Account')}</AccountSettingsTitle>

          <ToggleSwitch
            onChange={async () => {
              dispatch(
                toggleHideAccount({
                  keyId: key.id,
                  accountAddress: accountItem.receiveAddress,
                }),
              );
              await startUpdateAllWalletStatusForKey({
                key,
                accountAddress: accountItem.receiveAddress,
                force: true,
              }),
                await sleep(1000);
              dispatch(updatePortfolioBalance());
            }}
            isEnabled={!!accountInfo}
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
