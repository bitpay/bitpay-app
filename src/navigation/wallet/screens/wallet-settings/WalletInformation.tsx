import React, {useEffect, useLayoutEffect, useState} from 'react';
import {H5, H7, HeaderTitle} from '../../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../../WalletStack';
import styled from 'styled-components/native';
import {
  Hr,
  ScreenGutter,
  SettingTitle,
} from '../../../../components/styled/Containers';
import {LightBlack, NeutralSlate} from '../../../../styles/colors';
import Clipboard from '@react-native-community/clipboard';
import {useAppSelector} from '../../../../utils/hooks/useAppSelector';
import {
  Key,
  Wallet,
  WalletStatus,
} from '../../../../store/wallet/wallet.models';
import {
  GetPrecision,
  IsUtxoCoin,
} from '../../../../store/wallet/utils/currency';
import {View} from 'react-native';
import WalletInformationSkeleton from './WalletInformationSkeleton';
import {sleep} from '../../../../utils/helper-methods';

const InfoContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const InfoLabel = styled.View`
  padding: 5px 10px;
  border-radius: 3px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
`;

const InfoSettingsRow = styled.View`
  align-items: center;
  flex-direction: row;
  flex-wrap: nowrap;
  height: 58px;
`;

const SettingsHeader = styled(InfoSettingsRow)`
  margin: 15px 0 5px 0;
`;

const CopyButton = styled.TouchableOpacity`
  margin-bottom: 15px;
`;

export const getLinkedWallet = (key: Key, wallet: Wallet) => {
  const {
    credentials: {token, walletId},
  } = wallet;
  if (token) {
    const linkedWallet = key.wallets.find(({tokens}) =>
      tokens?.includes(walletId),
    );
    const walletName =
      linkedWallet?.walletName || linkedWallet?.credentials.walletName;
    return `${walletName}`;
  }

  return;
};

const WalletInformation = () => {
  const {
    params: {wallet},
  } = useRoute<RouteProp<WalletStackParamList, 'WalletInformation'>>();

  const {
    credentials: {
      walletName,
      coin,
      walletId,
      token,
      m,
      n,
      network,
      addressType,
      rootPath,
      keyId,
      account,
      copayerId,
      publicKeyRing,
    },
  } = wallet;
  const navigation = useNavigation();
  const key = useAppSelector(({WALLET}) => WALLET.keys[wallet.keyId]);
  const [isLoading, setIsLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>Wallet Information</HeaderTitle>,
    });
  }, [navigation]);

  const copyText = (text: string) => {
    Clipboard.setString(text);
  };

  const unitToSatoshi = GetPrecision(coin)?.unitToSatoshi || 0;

  const [copayers, setCopayers] = useState<any[]>();
  const [balanceByAddress, setBalanceByAddress] = useState<any[]>();

  useEffect(() => {
    wallet.getStatus(
      {network: 'livenet'},
      async (err: any, status: WalletStatus) => {
        if (err) {
          // TODO
          console.log(err);
          setIsLoading(false);
        }
        if (status) {
          setCopayers(status.wallet.copayers);
          setBalanceByAddress(status.balance.byAddress);
          await sleep(500);
          setIsLoading(false);
        }
      },
    );
  }, [wallet]);

  return (
    <InfoContainer>
      <ScrollView>
        {isLoading ? (
          <WalletInformationSkeleton />
        ) : (
          <>
            <InfoSettingsRow>
              <SettingTitle>Name (at creation)</SettingTitle>

              <InfoLabel>
                <H7>{walletName}</H7>
              </InfoLabel>
            </InfoSettingsRow>
            <Hr />

            <InfoSettingsRow>
              <SettingTitle>Coin</SettingTitle>

              <InfoLabel>
                <H7>{coin.toUpperCase()}</H7>
              </InfoLabel>
            </InfoSettingsRow>
            <Hr />

            <InfoSettingsRow>
              <SettingTitle>WalletId</SettingTitle>
            </InfoSettingsRow>

            <CopyButton onPress={() => copyText(walletId)}>
              <H7 numberOfLines={1} ellipsizeMode={'tail'}>
                {walletId}
              </H7>
            </CopyButton>
            <Hr />

            {token ? (
              <>
                <InfoSettingsRow>
                  <SettingTitle>Linked Ethereum Wallet</SettingTitle>

                  <InfoLabel>
                    <H7>{getLinkedWallet(key, wallet)}</H7>
                  </InfoLabel>
                </InfoSettingsRow>
                <Hr />
              </>
            ) : null}

            <InfoSettingsRow>
              <SettingTitle>Configuration (m-n)</SettingTitle>

              <InfoLabel>
                <H7>
                  {m}-{n}
                </H7>
              </InfoLabel>
            </InfoSettingsRow>
            <Hr />

            <InfoSettingsRow>
              <SettingTitle>Network</SettingTitle>

              <InfoLabel>
                <H7>{network}</H7>
              </InfoLabel>
            </InfoSettingsRow>
            <Hr />

            {IsUtxoCoin(coin) ? (
              <>
                <InfoSettingsRow>
                  <SettingTitle>Address Type</SettingTitle>

                  <InfoLabel>
                    <H7>{addressType || 'P2SH'}</H7>
                  </InfoLabel>
                </InfoSettingsRow>
                <Hr />
              </>
            ) : null}

            <InfoSettingsRow>
              <SettingTitle>Derivation Path</SettingTitle>

              <InfoLabel>
                <H7>{rootPath}</H7>
              </InfoLabel>
            </InfoSettingsRow>
            <Hr />

            {!keyId ? (
              <>
                <InfoSettingsRow>
                  <SettingTitle>Read Only Wallet</SettingTitle>

                  <InfoLabel>
                    <H7>No private key</H7>
                  </InfoLabel>
                </InfoSettingsRow>
                <Hr />
              </>
            ) : null}

            <InfoSettingsRow>
              <SettingTitle>Account</SettingTitle>

              <InfoLabel>
                <H7>#{account}</H7>
              </InfoLabel>
            </InfoSettingsRow>
            <Hr />

            {copayers ? (
              <>
                <SettingsHeader>
                  <H5>Copayers</H5>
                </SettingsHeader>

                {copayers.map((copayer, index) => (
                  <InfoSettingsRow key={index}>
                    <SettingTitle>{copayer.name}</SettingTitle>

                    {copayer.id === copayerId ? (
                      <InfoLabel>
                        <H7>(Me)</H7>
                      </InfoLabel>
                    ) : null}
                  </InfoSettingsRow>
                ))}
                <Hr />
              </>
            ) : null}

            <SettingsHeader>
              <H5>Extended Public Keys</H5>
            </SettingsHeader>

            {publicKeyRing.map(
              ({xPubKey}: {xPubKey: string}, index: number) => (
                <View key={index}>
                  <InfoSettingsRow>
                    <SettingTitle>Copayer {index}</SettingTitle>
                  </InfoSettingsRow>

                  <CopyButton onPress={() => copyText(xPubKey)}>
                    <H7>{xPubKey}</H7>
                  </CopyButton>

                  <InfoSettingsRow>
                    {index === 0 ? <H7>({rootPath})</H7> : null}
                  </InfoSettingsRow>
                  <Hr />
                </View>
              ),
            )}

            {balanceByAddress?.length ? (
              <>
                <SettingsHeader>
                  <H5>Balance By Address</H5>
                </SettingsHeader>

                {balanceByAddress.map((a, index: number) => (
                  <View key={index}>
                    <InfoSettingsRow style={{justifyContent: 'space-between'}}>
                      <View>
                        <CopyButton
                          style={{marginBottom: 0}}
                          onPress={() => copyText(a.address)}>
                          <SettingTitle
                            numberOfLines={1}
                            ellipsizeMode={'tail'}
                            style={{maxWidth: 200}}>
                            {a.address}
                          </SettingTitle>
                        </CopyButton>
                      </View>

                      <InfoLabel>
                        <H7>
                          {(a.amount / unitToSatoshi).toFixed(8)}{' '}
                          {coin.toUpperCase()}
                        </H7>
                      </InfoLabel>
                    </InfoSettingsRow>

                    <Hr />
                  </View>
                ))}
                <Hr />
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </InfoContainer>
  );
};

export default WalletInformation;
