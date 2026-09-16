import React, {useEffect, useLayoutEffect, useState} from 'react';
import {H5, H7, HeaderTitle} from '../../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../../WalletGroup';
import {useTheme} from '../../../../contexts';
import {Hr, SettingTitle} from '../../../../components/styled/Containers';
import {LightBlack, NeutralSlate} from '../../../../styles/colors';
import Clipboard from '@react-native-clipboard/clipboard';
import {useAppSelector} from '../../../../utils/hooks/useAppSelector';
import {Key, Wallet} from '../../../../store/wallet/wallet.models';
import {
  GetPrecision,
  IsUtxoChain,
} from '../../../../store/wallet/utils/currency';
import {
  ScrollView as RNScrollView,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import WalletInformationSkeleton from './WalletInformationSkeleton';
import {formatCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {useAppDispatch, useLogger} from '../../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import haptic from '../../../../components/haptic-feedback/haptic';
import CopiedSvg from '../../../../../assets/img/copied-success.svg';
import {
  TouchableOpacity,
  TouchableOpacityProps,
} from '@components/base/TouchableOpacity';
import {isTSSKey} from '../../../../store/wallet/effects/tss-send/tss-send';
import {findWalletById} from '../../../../store/wallet/utils/wallet';

const DEFERRED_LOAD_FALLBACK_MS = 2000;

const styles = StyleSheet.create({
  infoContainer: {
    flex: 1,
  },
  scrollView: {
    marginTop: 20,
    paddingHorizontal: 12,
  },
  infoLabel: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 3,
  },
  infoSettingsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    height: 58,
  },
  settingsHeader: {
    marginTop: 15,
    marginRight: 0,
    marginBottom: 5,
    marginLeft: 0,
  },
  copyImgContainer: {
    justifyContent: 'center',
    marginRight: 5,
  },
  copyImgContainerRight: {
    justifyContent: 'center',
    marginLeft: 5,
  },
  copyRow: {
    flexDirection: 'row',
  },
});

const InfoLabel = ({style, ...rest}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.infoLabel,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        style,
      ]}
      {...rest}
    />
  );
};

const InfoSettingsRow = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.infoSettingsRow, style]} {...rest} />
);

const SettingsHeader = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View
    style={[styles.infoSettingsRow, styles.settingsHeader, style]}
    {...rest}
  />
);

const CopyImgContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.copyImgContainer, style]} {...rest} />
);

const CopyImgContainerRight = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.copyImgContainerRight, style]} {...rest} />
);

const CopyRow = ({style, ...rest}: TouchableOpacityProps) => (
  <TouchableOpacity style={[styles.copyRow, style]} {...rest} />
);

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
    params: {
      keyId: routeKeyId,
      walletId: routeWalletId,
      copayerId: routeCopayerId,
    },
  } = useRoute<RouteProp<WalletGroupParamList, 'WalletInformation'>>();
  const key = useAppSelector(({WALLET}) => WALLET.keys[routeKeyId]);
  const wallet = findWalletById(
    key.wallets,
    routeWalletId,
    routeCopayerId,
  ) as Wallet;

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
      keyId,
      account,
      copayerId,
      publicKeyRing,
      rootPath,
    },
    tokenAddress,
    tssMetadata,
  } = wallet;
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
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

  const precision = dispatch(
    GetPrecision(currencyAbbreviation, chain, tokenAddress),
  );

  const [copayers, setCopayers] = useState<any[]>();
  const [balanceByAddress, setBalanceByAddress] = useState<any[]>();

  useEffect(() => {
    let active = true;
    let started = false;
    const load = () => {
      if (started || !active) {
        return;
      }

      started = true;
      wallet?.getStatus(
        {
          tokenAddress: token?.address,
        },
        (err, status) => {
          if (!active) {
            return;
          }
          if (err) {
            const errStr =
              err instanceof Error ? err.message : JSON.stringify(err);
            logger.error(`error [WalletInformation] [getStatus]: ${errStr}`);
            setIsLoading(false);
          } else if (status) {
            setCopayers(status.wallet.copayers);
            setBalanceByAddress(status.balance.byAddress);
            setIsLoading(false);
          }
        },
      );
    };
    const unsubscribe = (navigation as any).addListener(
      'transitionEnd',
      (event: {data?: {closing?: boolean}}) => {
        if (!event.data?.closing) {
          load();
        }
      },
    );
    const fallbackTimer = setTimeout(load, DEFERRED_LOAD_FALLBACK_MS);

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, [logger, navigation, token, wallet]);

  return (
    <SafeAreaView style={styles.infoContainer}>
      <RNScrollView style={styles.scrollView}>
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
                  {isTSSKey(key) && tssMetadata
                    ? `${tssMetadata.m}-${tssMetadata.n}`
                    : `${m}-${n}`}
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

            {IsUtxoChain(chain) ? (
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

                      {precision?.unitToSatoshi ? (
                        <InfoLabel>
                          <H7>
                            {(a.amount / precision.unitToSatoshi).toFixed(8)}{' '}
                            {formatCurrencyAbbreviation(currencyAbbreviation)}
                          </H7>
                        </InfoLabel>
                      ) : null}
                    </InfoSettingsRow>
                  </View>
                ))}
                <Hr />
              </>
            ) : null}
          </>
        )}
      </RNScrollView>
    </SafeAreaView>
  );
};

export default WalletInformation;
