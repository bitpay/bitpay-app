import React, {useEffect, useLayoutEffect, useState} from 'react';
import {
  BaseText,
  H7,
  HeaderTitle,
  Link,
  Paragraph,
} from '../../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  Hr,
  ScreenGutter,
  SettingTitle,
  SettingView,
} from '../../../../components/styled/Containers';
import {SlateDark, White} from '../../../../styles/colors';
import Button, {ButtonState} from '../../../../components/button/Button';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../../WalletStack';
import {sleep} from '../../../../utils/helper-methods';
import {useAppSelector} from '../../../../utils/hooks/useAppSelector';
import {GetMainAddresses} from '../../../../store/wallet/effects/address/address';
import {useAppDispatch} from '../../../../utils/hooks';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import {CustomErrorMessage} from '../../components/ErrorMessages';
import {BWCErrorMessage} from '../../../../constants/BWCError';
import {GetWalletBalance} from '../../../../store/wallet/effects/status/status';
import {GetProtocolPrefixAddress} from '../../../../store/wallet/utils/wallet';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {
  FormatAmountStr,
  GetLowUtxos,
} from '../../../../store/wallet/effects/amount/amount';
import {TouchableOpacity, View} from 'react-native';
import {GetAmFormatDate} from '../../../../store/wallet/utils/time';
import Clipboard from '@react-native-community/clipboard';
import AddressesSkeleton from './AddressesSkeleton';
import {useTranslation} from 'react-i18next';

const ADDRESS_LIMIT = 5;

const AddressesContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const AddressesParagraph = styled(Paragraph)`
  margin-bottom: 15px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const AllAddressesLink = styled.TouchableOpacity`
  margin: 25px 0 10px;
`;

const LinkText = styled(Link)`
  font-size: 16px;
`;

const VerticalPadding = styled.View`
  padding: ${ScreenGutter} 0;
`;

const Title = styled(BaseText)`
  font-weight: bold;
  font-size: 18px;
  margin: 5px 0;
  color: ${({theme}) => theme.colors.text};
`;

const SubText = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const Addresses = () => {
  const {t} = useTranslation();
  const {
    params: {wallet},
  } = useRoute<RouteProp<WalletStackParamList, 'Addresses'>>();

  const {
    credentials: {token, multisigEthInfo, coin},
    walletName,
    currencyName,
  } = wallet;
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const dispatch = useAppDispatch();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Addresses')}</HeaderTitle>,
    });

    return navigation.addListener('blur', async () => {
      await sleep(300);
      setButtonState(undefined);
    });
  }, [navigation, t]);
  const [buttonState, setButtonState] = useState<ButtonState>();
  const key = useAppSelector(({WALLET}) => WALLET.keys[wallet.keyId]);
  const [viewAll, setViewAll] = useState<boolean>();
  const [usedAddress, setUsedAddress] = useState<any[]>();
  const [latestUsedAddress, setLatestUsedAddress] = useState<any[]>();
  const [unusedAddress, setUnusedAddress] = useState<any[]>();
  const [latestUnusedAddress, setLatestUnusedAddress] = useState<any[]>();

  const [lowUtxosNb, setLowUtxosNb] = useState<number>();
  const [allUtxosNb, setAllUtxosNb] = useState<number>();
  const [lowUtxosSum, setLowUtxosSum] = useState<string>();
  const [allUtxosSum, setAllUtxosSum] = useState<string>();
  const [minFee, setMinFee] = useState<string>();
  const [minFeePer, setMinFeePer] = useState<string>();

  const init = async () => {
    try {
      const allAddresses = await GetMainAddresses(wallet, {
        doNotVerify: true,
      });

      const resp = await GetWalletBalance(wallet, {
        tokenAddress: token?.address ? token.address : '',
        multisigContractAddress: multisigEthInfo?.multisigContractAddress
          ? multisigEthInfo.multisigContractAddress
          : '',
      });

      const idx = resp.byAddress.map(
        (a: {address: string; amount: string; path: string}) => {
          return {[a.address]: a};
        },
      );

      let _withBalance = resp.byAddress;
      _withBalance = buildUiFormatList(_withBalance, wallet);
      setUsedAddress(_withBalance);

      let _noBalance = allAddresses.filter((a: any) => !idx[a.address]);
      _noBalance = buildUiFormatList(_noBalance, wallet);
      setUnusedAddress(_noBalance);

      setViewAll(
        _noBalance?.length > ADDRESS_LIMIT ||
          _withBalance?.length > ADDRESS_LIMIT,
      );
      setLatestUsedAddress(_withBalance.slice(0, ADDRESS_LIMIT));
      setLatestUnusedAddress(_noBalance.slice(0, ADDRESS_LIMIT));

      try {
        const response = await GetLowUtxos(wallet);

        if (response?.allUtxos?.length) {
          const _allUtxos = response.allUtxos || 0;
          const allSum = _allUtxos.reduce(
            (total: number, {satoshis}: {satoshis: number}) => total + satoshis,
            0,
          );
          const per = (response.minFee / allSum) * 100;
          const _lowUtxos = response.lowUtxos || 0;
          const _lowUtoxosSum = _lowUtxos.reduce(
            (total: number, {satoshis}: {satoshis: number}) => total + satoshis,
            0,
          );

          setLowUtxosNb(response.lowUtxos.length);
          setAllUtxosNb(response.allUtxos.length);

          setLowUtxosSum(dispatch(FormatAmountStr(coin, _lowUtoxosSum)));
          setAllUtxosSum(dispatch(FormatAmountStr(coin, allSum)));
          setMinFee(dispatch(FormatAmountStr(coin, response.minFee || 0)));
          setMinFeePer(per.toFixed(2) + '%');
        }
      } catch (e) {
        console.log(e);
      }
      setLoading(false);
    } catch (e) {
      setLoading(false);
      dispatch(
        showBottomNotificationModal(
          CustomErrorMessage({
            errMsg: BWCErrorMessage(e, t('Could not update wallet')),
          }),
        ),
      );
    }
  };

  const buildUiFormatList = (list: any, wallet: Wallet) => {
    const {
      credentials: {coin, network},
    } = wallet;
    list.forEach((item: any) => {
      item.path = item.path ? item.path.replace(/^m/g, 'xpub') : null;
      item.address = dispatch(
        GetProtocolPrefixAddress(coin, network, item.address),
      );

      if (item.createdOn) {
        item.uiTime = GetAmFormatDate(item.createdOn * 1000);
      }
      return item;
    });

    return list;
  };

  useEffect(() => {
    init();
  }, [wallet]);

  const {
    credentials: {walletId},
  } = wallet;

  const scan = async () => {
    try {
      setButtonState('loading');

      if (!wallet.isComplete()) {
        setButtonState('failed');
        await sleep(1000);
        setButtonState(null);
        return;
      }

      wallet.startScan(
        {
          includeCopayerBranches: true,
        },
        async (err: any) => {
          if (err) {
            console.log(err);
            setButtonState('failed');
            await sleep(1000);
            setButtonState(null);
            return;
          }
          setButtonState('success');
          navigation.navigate('Wallet', {
            screen: 'WalletDetails',
            params: {walletId, key},
          });

          return;
        },
      );
    } catch (e) {}
  };

  const copyText = (text: string) => {
    Clipboard.setString(text);
  };

  return (
    <AddressesContainer>
      <ScrollView>
        <AddressesParagraph>
          {t(
            'Each wallet (except for ETH/ERC20) can generate billions of addresses from your 12-word recovery phrase. A new address is automatically generated and shown each time you receive a payment.',
          )}
        </AddressesParagraph>
        <AddressesParagraph>
          {t(
            "It's a good idea to avoid reusing addresses - this both protects your privacy and keeps your bitcoins secure against hypothetical attacks by quantum computers.",
          )}
        </AddressesParagraph>

        <AddressesContainer>
          <Button onPress={scan} state={buttonState}>
            {t('Scan Addresses for Funds')}
          </Button>
        </AddressesContainer>

        {loading ? (
          <AddressesSkeleton />
        ) : (
          <>
            {viewAll ? (
              <AllAddressesLink
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  navigation.navigate('Wallet', {
                    screen: 'AllAddresses',
                    params: {
                      currencyAbbreviation: coin,
                      walletName: walletName || currencyName,
                      usedAddresses: usedAddress,
                      unusedAddresses: unusedAddress,
                    },
                  });
                }}>
                <LinkText>{t('View all addresses')}</LinkText>
              </AllAddressesLink>
            ) : null}

            {allUtxosNb ? (
              <>
                <VerticalPadding>
                  <Title>{t('Wallet Inputs')}</Title>

                  <SettingView>
                    <SettingTitle>{t('Total wallet inputs')}</SettingTitle>

                    <H7>
                      {allUtxosNb} [{allUtxosSum}]
                    </H7>
                  </SettingView>

                  <Hr />

                  <SettingView>
                    <SettingTitle>{t('Low amount inputs')}</SettingTitle>

                    <H7>
                      {lowUtxosNb} [{lowUtxosSum}]
                    </H7>
                  </SettingView>

                  <Hr />

                  <SettingView>
                    <SettingTitle numberOfLines={2}>
                      {t(
                        "Approximate Bitcoin network fee to transfer wallet's balance (with normal priority)",
                      )}
                    </SettingTitle>

                    <H7>
                      {minFeePer} [{minFee}]
                    </H7>
                  </SettingView>
                </VerticalPadding>
                <Hr />
              </>
            ) : null}

            {latestUsedAddress?.length ? (
              <>
                <VerticalPadding>
                  <Title>{t('Addresses with balance')}</Title>

                  {latestUsedAddress.map(({address, amount}, index) => (
                    <View key={index}>
                      <SettingView>
                        <View>
                          <TouchableOpacity
                            style={{justifyContent: 'center'}}
                            activeOpacity={ActiveOpacity}
                            onPress={() => copyText(address)}>
                            <SettingTitle
                              numberOfLines={1}
                              ellipsizeMode={'tail'}
                              style={{maxWidth: 250}}>
                              {address}
                            </SettingTitle>
                          </TouchableOpacity>
                        </View>

                        <H7>{dispatch(FormatAmountStr(coin, amount))}</H7>
                      </SettingView>

                      <Hr />
                    </View>
                  ))}
                </VerticalPadding>
              </>
            ) : null}

            {latestUnusedAddress?.length ? (
              <>
                <VerticalPadding>
                  <Title>{t('Unused addresses')}</Title>

                  {latestUnusedAddress.map(({address, path, uiTime}, index) => (
                    <View key={index}>
                      <VerticalPadding>
                        <TouchableOpacity
                          activeOpacity={ActiveOpacity}
                          onPress={() => copyText(address)}>
                          <SettingTitle
                            numberOfLines={1}
                            ellipsizeMode={'tail'}>
                            {address}
                          </SettingTitle>
                        </TouchableOpacity>

                        <SubText>
                          {path} {uiTime}
                        </SubText>
                      </VerticalPadding>

                      <Hr />
                    </View>
                  ))}
                </VerticalPadding>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </AddressesContainer>
  );
};

export default Addresses;
