import React, {useLayoutEffect, useState} from 'react';
import styled from 'styled-components/native';
import {
  Balance,
  BaseText,
  H5,
  HeaderTitle,
} from '../../../components/styled/Text';
import {useNavigation} from '@react-navigation/native';
import {WalletStackParamList} from '../WalletStack';
import OptionsBottomPopupModal, {
  Option,
} from '../components/OptionsBottomPopupModal';
import Settings from '../../../components/settings/Settings';
import RequestAmountSvg from '../../../../assets/img/wallet/request-amount.svg';
import ShareAddressSvg from '../../../../assets/img/wallet/share-address.svg';
import SettingsSvg from '../../../../assets/img/wallet/settings.svg';
import LinkingButtons from '../../tabs/home/components/LinkingButtons';
import ReceiveAddress from '../components/ReceiveAddress';
import {StackScreenProps} from '@react-navigation/stack';
import {
  startUpdateAllWalletBalancesForKey,
  startUpdateWalletBalance,
} from '../../../store/wallet/effects/balance/balance';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {BalanceUpdateError} from '../components/ErrorMessages';
import {useDispatch, useSelector} from 'react-redux';
import {FlatList, RefreshControl} from 'react-native';
import {SlateDark} from '../../../styles/colors';
import {RootState} from '../../../store';
import {buildUIFormattedWallet} from './KeyOverview';
import {
  findWalletById,
  isBalanceCacheKeyStale,
} from '../../../store/wallet/utils/wallet';
import {Wallet} from '../../../store/wallet/wallet.models';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {SUPPORTED_CURRENCIES} from '../../../constants/currencies';
import {sleep} from '../../../utils/helper-methods';

type WalletDetailsScreenProps = StackScreenProps<
  WalletStackParamList,
  'WalletDetails'
>;

const WalletDetailsContainer = styled.View`
  flex: 1;
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-end;
`;

const BalanceContainer = styled.View`
  margin-top: 20px;
  padding: 10px 15px;
  flex-direction: column;
`;

const Chain = styled(BaseText)`
  font-size: 14px;
  font-style: normal;
  font-weight: 300;
  letter-spacing: 0;
  line-height: 40px;
`;

const WalletDetails: React.FC<WalletDetailsScreenProps> = ({route}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {walletId, key} = route.params;
  const balanceCacheKey = useSelector(
    ({WALLET}: RootState) => WALLET.balanceCacheKey,
  );
  const fullWalletObj = useSelector(({WALLET}: RootState) =>
    findWalletById(WALLET.keys[key.id].wallets, walletId),
  ) as Wallet;
  const uiFormattedWallet = buildUIFormattedWallet(fullWalletObj);
  const [showReceiveAddressBottomModal, setShowReceiveAddressBottomModal] =
    useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>{uiFormattedWallet.currencyName}</HeaderTitle>
      ),
      headerRight: () => (
        <Settings
          onPress={() => {
            setShowWalletOptions(true);
          }}
        />
      ),
    });
  }, [navigation]);

  const assetOptions: Array<Option> = [
    {
      img: <RequestAmountSvg />,
      title: 'Request a specific amount',
      description:
        'This will generate an invoice, which the person you send it to can pay using any wallet.',
      onPress: () => null,
    },
    {
      img: <ShareAddressSvg />,
      title: 'Share Address',
      description:
        'Share your wallet address to someone in your contacts so they can send you funds.',
      onPress: () => null,
    },
    {
      img: <SettingsSvg />,
      title: 'Wallet Settings',
      description: 'View all the ways to manage and configure your wallet.',
      onPress: () =>
        navigation.navigate('Wallet', {
          screen: 'WalletSettings',
          params: {
            wallet: uiFormattedWallet,
          },
        }),
    },
  ];

  const showReceiveAddress = () => {
    setShowReceiveAddressBottomModal(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);

    if (!isBalanceCacheKeyStale(balanceCacheKey[walletId])) {
      console.log('skipping balance update');
      await sleep(1000);
      setRefreshing(false);
      return;
    }

    try {
      await dispatch(startUpdateWalletBalance({key, wallet: fullWalletObj}));
      dispatch(updatePortfolioBalance());
    } catch (err) {
      dispatch(showBottomNotificationModal(BalanceUpdateError));
    }
    setRefreshing(false);
  };

  const {
    cryptoBalance,
    fiatBalance,
    currencyName,
    currencyAbbreviation,
    network,
  } = uiFormattedWallet;
  return (
    <WalletDetailsContainer>
      <FlatList
        refreshControl={
          <RefreshControl
            tintColor={SlateDark}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={() => {
          return (
            <>
              <BalanceContainer>
                <Row>
                  <Balance>
                    {cryptoBalance} {currencyAbbreviation}
                  </Balance>
                  <Chain>{currencyAbbreviation}</Chain>
                </Row>
                {SUPPORTED_CURRENCIES.includes(
                  currencyAbbreviation.toLowerCase(),
                ) && (
                  <H5>
                    {network === 'testnet'
                      ? fiatBalance || 'Test - No Value'
                      : fiatBalance}
                  </H5>
                )}
              </BalanceContainer>

              <LinkingButtons
                receiveCta={() => showReceiveAddress()}
                sendCta={() => null}
              />
            </>
          );
        }}
      />

      <OptionsBottomPopupModal
        isVisible={showWalletOptions}
        closeModal={() => setShowWalletOptions(false)}
        title={`Receive ${currencyName}`}
        options={assetOptions}
      />

      <ReceiveAddress
        isVisible={showReceiveAddressBottomModal}
        closeModal={() => setShowReceiveAddressBottomModal(false)}
        wallet={fullWalletObj}
      />
    </WalletDetailsContainer>
  );
};

export default WalletDetails;
