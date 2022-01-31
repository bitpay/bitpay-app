import React, {useLayoutEffect, useState} from 'react';
import styled from 'styled-components/native';
import {
  Balance,
  BaseText,
  H5,
  HeaderTitle,
} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import OptionsBottomPopupModal, {
  Option,
} from '../components/OptionsBottomPopupModal';
import Settings from '../../../components/settings/Settings';
import RequestAmountSvg from '../../../../assets/img/wallet/request-amount.svg';
import ShareAddressSvg from '../../../../assets/img/wallet/share-address.svg';
import SettingsSvg from '../../../../assets/img/wallet/settings.svg';
import LinkingButtons from '../../tabs/home/components/LinkingButtons';
import {useDispatch} from 'react-redux';
import ReceiveAddress from '../components/ReceiveAddress';
import {WalletActions} from '../../../store/wallet';

const WalletDetailsContainer = styled.View`
  flex: 1;
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-end;
`;

const BalanceContainer = styled.View`
  height: 15%;
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

const WalletDetails = () => {
  const route = useRoute<RouteProp<WalletStackParamList, 'WalletDetails'>>();
  const navigation = useNavigation();
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const {wallet} = route.params;
  const dispatch = useDispatch();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{wallet.currencyName}</HeaderTitle>,
      headerRight: () => (
        <Settings
          onPress={() => {
            setShowWalletOptions(true);
          }}
        />
      ),
    });
  });

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
            wallet,
          },
        }),
    },
  ];

  const showReceiveAddress = () => {
    const {keyId, id} = wallet;
    dispatch(
      WalletActions.showReceiveAddressModal({
        keyId,
        id,
      }),
    );
  };

  const {cryptoBalance, fiatBalance, currencyName, currencyAbbreviation} =
    wallet;
  return (
    <WalletDetailsContainer>
      <BalanceContainer>
        <Row>
          <Balance>
            {cryptoBalance} {currencyAbbreviation}
          </Balance>
          <Chain>{currencyAbbreviation}</Chain>
        </Row>
        <H5>{fiatBalance} USD</H5>
      </BalanceContainer>

      <LinkingButtons
        receiveCta={() => showReceiveAddress()}
        sendCta={() =>
          navigation.navigate('Wallet', {screen: 'SendTo', params: {wallet}})
        }
      />

      <OptionsBottomPopupModal
        isVisible={showWalletOptions}
        closeModal={() => setShowWalletOptions(false)}
        title={`Receive ${currencyName}`}
        options={assetOptions}
      />

      <ReceiveAddress />
    </WalletDetailsContainer>
  );
};

export default WalletDetails;
