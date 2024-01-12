import React, {useEffect, useLayoutEffect, useState} from 'react';
import {H5, H7, HeaderTitle} from '../../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../../WalletGroup';
import styled from 'styled-components/native';
import {
  Hr,
  ScreenGutter,
  SettingTitle,
} from '../../../../components/styled/Containers';
import {LightBlack, NeutralSlate} from '../../../../styles/colors';
import Clipboard from '@react-native-clipboard/clipboard';
import {useAppSelector} from '../../../../utils/hooks/useAppSelector';
import {Key, Wallet, Status} from '../../../../store/wallet/wallet.models';
import {
  GetPrecision,
  IsUtxoCoin,
} from '../../../../store/wallet/utils/currency';
import {View} from 'react-native';
import WalletInformationSkeleton from './WalletInformationSkeleton';
import {
  formatCurrencyAbbreviation,
  sleep,
} from '../../../../utils/helper-methods';
import {useAppDispatch, useLogger} from '../../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import haptic from '../../../../components/haptic-feedback/haptic';
import CopiedSvg from '../../../../../assets/img/copied-success.svg';

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

const CopyImgContainer = styled.View`
  justify-content: center;
  margin-right: 5px;
`;

const CopyImgContainerRight = styled.View`
  justify-content: center;
  margin-left: 5px;
`;

const CopyRow = styled.TouchableOpacity`
  flex-direction: row;
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
  const {t} = useTranslation();
  const logger = useLogger();
  const {
    params: {wallet},
  } = useRoute<RouteProp<WalletGroupParamList, 'WalletInformation'>>();

  const {
    chain,
    currencyAbbreviation,
    network,
    credentials: {
      walletName,
      walletId,
      token,
      m,
      n,
      addressType,
      rootPath,
      keyId,
      account,
      copayerId,
      publicKeyRing,
    },
    tokenAddress,
  } = wallet;
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const key = useAppSelector(({WALLET}) => WALLET.keys[wallet.keyId]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedWalletId, setCopiedWalletId] = useState(false);
  const [copiedAddressType, setCopiedAddressType] = useState(false);
  const [copiedRootPath, setCopiedRootPath] = useState(false);
  const [copiedXPubKey, setCopiedXPubKey] = useState('');
  const [copiedAddress, setCopiedAddress] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Wallet Information')}</HeaderTitle>,
    });
  }, [navigation, t]);

  const copyToClipboard = (text: string) => {
    haptic('impactLight');
    Clipboard.setString(text);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedWalletId(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedWalletId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedAddressType(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedAddressType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedRootPath(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedRootPath]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedXPubKey('');
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedXPubKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedAddress('');
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedAddress]);

  const {unitToSatoshi} = dispatch(
    GetPrecision(currencyAbbreviation, chain, tokenAddress),
  )!;

  const [copayers, setCopayers] = useState<any[]>();
  const [balanceByAddress, setBalanceByAddress] = useState<any[]>();

  useEffect(() => {
    wallet.getStatus(
      {
        tokenAddress: token ? token.address : null,
        network: wallet.network,
      },
      async (err: any, status: Status) => {
        if (err) {
          const errStr =
            err instanceof Error ? err.message : JSON.stringify(err);
          logger.error(`error [getStatus]: ${errStr}`);
          setIsLoading(false);
        } else if (status) {
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
              <SettingTitle>{t('Name (at creation)')}</SettingTitle>

              <InfoLabel>
                <H7>{walletName}</H7>
              </InfoLabel>
            </InfoSettingsRow>
            <Hr />

            <InfoSettingsRow>
              <SettingTitle>{t('Coin')}</SettingTitle>

              <InfoLabel>
                <H7>{formatCurrencyAbbreviation(currencyAbbreviation)}</H7>
              </InfoLabel>
            </InfoSettingsRow>
            <Hr />

            <InfoSettingsRow>
              <SettingTitle>{t('WalletId')}</SettingTitle>
            </InfoSettingsRow>

            <CopyRow
              style={{marginBottom: 15}}
              onPress={() => {
                copyToClipboard(walletId);
                setCopiedWalletId(true);
              }}>
              <H7
                numberOfLines={1}
                ellipsizeMode={'tail'}
                style={{maxWidth: '90%'}}>
                {walletId}
              </H7>
              <CopyImgContainerRight style={{minWidth: '10%'}}>
                {copiedWalletId ? <CopiedSvg width={17} /> : null}
              </CopyImgContainerRight>
            </CopyRow>
            <Hr />

            {token ? (
              <>
                <InfoSettingsRow>
                  <SettingTitle>{t('Linked Ethereum Wallet')}</SettingTitle>

                  <InfoLabel>
                    <H7>{getLinkedWallet(key, wallet)}</H7>
                  </InfoLabel>
                </InfoSettingsRow>
                <Hr />
              </>
            ) : null}

            <InfoSettingsRow>
              <SettingTitle>{t('Configuration (m-n)')}</SettingTitle>

              <InfoLabel>
                <H7>
                  {m}-{n}
                </H7>
              </InfoLabel>
            </InfoSettingsRow>
            <Hr />

            <InfoSettingsRow>
              <SettingTitle>{t('Network')}</SettingTitle>

              <InfoLabel>
                <H7>{network}</H7>
              </InfoLabel>
            </InfoSettingsRow>
            <Hr />

            {IsUtxoCoin(currencyAbbreviation) ? (
              <>
                <InfoSettingsRow>
                  <SettingTitle>{t('Address Type')}</SettingTitle>

                  <CopyRow
                    onPress={() => {
                      copyToClipboard(addressType);
                      setCopiedAddressType(true);
                    }}>
                    <CopyImgContainer>
                      {copiedAddressType ? <CopiedSvg width={17} /> : null}
                    </CopyImgContainer>
                    <H7>{addressType || 'P2SH'}</H7>
                  </CopyRow>
                </InfoSettingsRow>
                <Hr />
              </>
            ) : null}

            <InfoSettingsRow>
              <SettingTitle>{t('Derivation Path')}</SettingTitle>

              <CopyRow
                onPress={() => {
                  copyToClipboard(rootPath);
                  setCopiedRootPath(true);
                }}>
                <CopyImgContainer>
                  {copiedRootPath ? <CopiedSvg width={17} /> : null}
                </CopyImgContainer>
                <H7>{rootPath}</H7>
              </CopyRow>
            </InfoSettingsRow>
            <Hr />

            {!keyId ? (
              <>
                <InfoSettingsRow>
                  <SettingTitle>{t('Read Only Wallet')}</SettingTitle>

                  <InfoLabel>
                    <H7>{t('No private key')}</H7>
                  </InfoLabel>
                </InfoSettingsRow>
                <Hr />
              </>
            ) : null}

            <InfoSettingsRow>
              <SettingTitle>{t('Account')}</SettingTitle>

              <InfoLabel>
                <H7>#{account}</H7>
              </InfoLabel>
            </InfoSettingsRow>
            <Hr />

            {copayers ? (
              <>
                <SettingsHeader>
                  <H5>{t('Copayers')}</H5>
                </SettingsHeader>

                {copayers.map((copayer, index) => (
                  <InfoSettingsRow key={index}>
                    <SettingTitle>{copayer.name}</SettingTitle>

                    {copayer.id === copayerId ? (
                      <InfoLabel>
                        <H7>{t('(Me)')}</H7>
                      </InfoLabel>
                    ) : null}
                  </InfoSettingsRow>
                ))}
                <Hr />
              </>
            ) : null}

            <SettingsHeader>
              <H5>{t('Extended Public Keys')}</H5>
            </SettingsHeader>

            {publicKeyRing.map(
              ({xPubKey}: {xPubKey: string}, index: number) => (
                <View key={index}>
                  <InfoSettingsRow>
                    <SettingTitle>{t('Copayer ') + index}</SettingTitle>
                  </InfoSettingsRow>

                  <CopyRow
                    onPress={() => {
                      copyToClipboard(xPubKey);
                      setCopiedXPubKey(xPubKey);
                    }}>
                    <H7 style={{width: '90%'}}>{xPubKey}</H7>
                    <CopyImgContainerRight style={{width: '10%'}}>
                      {copiedXPubKey === xPubKey ? (
                        <CopiedSvg width={17} />
                      ) : null}
                    </CopyImgContainerRight>
                  </CopyRow>

                  <InfoSettingsRow>
                    <H7>({rootPath})</H7>
                  </InfoSettingsRow>
                  <Hr />
                </View>
              ),
            )}

            {balanceByAddress?.length ? (
              <>
                <SettingsHeader>
                  <H5>{t('Balance By Address')}</H5>
                </SettingsHeader>

                {balanceByAddress.map((a, index: number) => (
                  <View key={index}>
                    <InfoSettingsRow style={{justifyContent: 'space-between'}}>
                      <View>
                        <CopyRow
                          onPress={() => {
                            copyToClipboard(a.address);
                            setCopiedAddress(a.address);
                          }}>
                          <H7
                            numberOfLines={1}
                            ellipsizeMode={'tail'}
                            style={{maxWidth: 200}}>
                            {a.address}
                          </H7>
                          <CopyImgContainerRight style={{minWidth: '10%'}}>
                            {copiedAddress === a.address ? (
                              <CopiedSvg width={17} />
                            ) : null}
                          </CopyImgContainerRight>
                        </CopyRow>
                      </View>

                      <InfoLabel>
                        <H7>
                          {(a.amount / unitToSatoshi).toFixed(8)}{' '}
                          {formatCurrencyAbbreviation(currencyAbbreviation)}
                        </H7>
                      </InfoLabel>
                    </InfoSettingsRow>
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
