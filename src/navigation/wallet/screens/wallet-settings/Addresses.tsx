import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {
  BaseText,
  H7,
  HeaderTitle,
  Link,
  Paragraph,
} from '../../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTheme} from '../../../../contexts';
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
import {WalletGroupParamList} from '../../WalletGroup';
import {sleep} from '../../../../utils/helper-methods';
import {GetMainAddresses} from '../../../../store/wallet/effects/address/address';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../../utils/hooks';
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
import {SafeAreaView, ScrollView, StyleSheet, View} from 'react-native';
import {GetAmFormatDate} from '../../../../store/wallet/utils/time';
import Clipboard from '@react-native-clipboard/clipboard';
import AddressesSkeleton from './AddressesSkeleton';
import {useTranslation} from 'react-i18next';
import haptic from '../../../../components/haptic-feedback/haptic';
import CopiedSvg from '../../../../../assets/img/copied-success.svg';
import {setWalletScanning} from '../../../../store/wallet/wallet.actions';
import {isSingleAddressChain} from '../../../../store/wallet/utils/currency';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {findWalletById} from '../../../../store/wallet/utils/wallet';

const ADDRESS_LIMIT = 5;
const DEFERRED_LOAD_FALLBACK_MS = 2000;

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  addressesContainer: {
    flex: 1,
  },
  scrollView: {
    marginTop: 20,
    paddingHorizontal: gutter,
  },
  addressesParagraph: {
    marginBottom: 15,
  },
  allAddressesLink: {
    marginTop: 25,
    marginHorizontal: 0,
    marginBottom: 10,
  },
  linkText: {
    fontSize: 16,
  },
  verticalPadding: {
    paddingVertical: gutter,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    marginVertical: 5,
  },
  copyRow: {
    flexDirection: 'row',
  },
  copyImgContainerRight: {
    justifyContent: 'center',
  },
});

const AddressesContainer: React.FC<
  React.ComponentProps<typeof SafeAreaView>
> = ({style, ...rest}) => (
  <SafeAreaView style={[styles.addressesContainer, style]} {...rest} />
);

const StyledScrollView: React.FC<React.ComponentProps<typeof ScrollView>> = ({
  style,
  ...rest
}) => <ScrollView style={[styles.scrollView, style]} {...rest} />;

const AddressesParagraph: React.FC<React.ComponentProps<typeof Paragraph>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[
        styles.addressesParagraph,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const AllAddressesLink: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.allAddressesLink, style]} {...rest} />
);

const LinkText: React.FC<React.ComponentProps<typeof Link>> = ({
  style,
  ...rest
}) => <Link style={[styles.linkText, style]} {...rest} />;

const VerticalPadding: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.verticalPadding, style]} {...rest} />;

const Title: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.title, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
};

const SubText: React.FC<React.ComponentProps<typeof H7>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <H7 style={[{color: theme.dark ? White : SlateDark}, style]} {...rest} />
  );
};

const CopyRow: React.FC<React.ComponentProps<typeof TouchableOpacity>> = ({
  style,
  ...rest
}) => <TouchableOpacity style={[styles.copyRow, style]} {...rest} />;

const CopyImgContainerRight: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.copyImgContainerRight, style]} {...rest} />;

const Addresses = () => {
  const {t} = useTranslation();
  const {
    params: {keyId, walletId: routeWalletId, copayerId},
  } = useRoute<RouteProp<WalletGroupParamList, 'Addresses'>>();
  const wallet = useAppSelector(({WALLET}) =>
    findWalletById(WALLET.keys[keyId].wallets, routeWalletId, copayerId),
  ) as Wallet;

  const {
    credentials: {token, multisigEthInfo},
    walletName,
    currencyName,
    currencyAbbreviation,
    chain,
    tokenAddress,
    singleAddress,
  } = wallet;
  const navigation = useNavigation();
  const logger = useLogger();
  const [loadingUtxos, setLoadingUtxos] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const dispatch = useAppDispatch();
  const [copiedAddressWithBalance, setCopiedAddressWithBalance] = useState('');
  const [copiedUnusedAddress, setCopiedUnusedAddress] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedAddressWithBalance('');
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedAddressWithBalance]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedUnusedAddress('');
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedUnusedAddress]);

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

  const buildUiFormatList = useCallback(
    (list: any[], targetWallet: Wallet, sortByAmount: boolean): any[] => {
      const {
        currencyAbbreviation: targetCurrency,
        network,
        chain: targetChain,
      } = targetWallet;

      const formattedList = list.map(item => {
        const {path, address, createdOn} = item;
        item.path = path ? path.replace(/^m/g, 'xpub') : null;
        item.address = dispatch(
          GetProtocolPrefixAddress(
            targetCurrency,
            network,
            address,
            targetChain,
          ),
        );

        if (createdOn) {
          item.uiTime = GetAmFormatDate(createdOn * 1000);
        }
        return item;
      });

      return formattedList.sort((a, b) => {
        if (sortByAmount && a.amount && b.amount) {
          return b.amount - a.amount;
        } else if (a.createdOn && b.createdOn) {
          return b.createdOn - a.createdOn;
        }
        return 0;
      });
    },
    [dispatch],
  );

  const setAddresses = useCallback(
    async (isCancelled: () => boolean) => {
      try {
        const [allAddresses, resp] = await Promise.all([
          GetMainAddresses(wallet, {
            doNotVerify: true,
          }),
          GetWalletBalance(wallet, {
            tokenAddress: token?.address ? token.address : '',
            multisigContractAddress:
              multisigEthInfo?.multisigContractAddress || '',
          }),
        ]);
        if (isCancelled()) {
          return;
        }

        const usedAddressSet = new Set(
          resp.byAddress.map(
            (addressData: {address: string}) => addressData.address,
          ),
        );

        let withBalance = buildUiFormatList(resp.byAddress, wallet, true);
        setUsedAddress(withBalance);

        let withoutBalance = allAddresses.filter(
          (addressData: any) => !usedAddressSet.has(addressData.address),
        );
        withoutBalance = buildUiFormatList(withoutBalance, wallet, false);
        setUnusedAddress(withoutBalance);

        setViewAll(
          withoutBalance.length > ADDRESS_LIMIT ||
            withBalance.length > ADDRESS_LIMIT,
        );
        setLatestUsedAddress(withBalance.slice(0, ADDRESS_LIMIT));
        setLatestUnusedAddress(withoutBalance.slice(0, ADDRESS_LIMIT));
        setLoadingAddresses(false);
      } catch (err) {
        if (isCancelled()) {
          return;
        }
        setLoadingAddresses(false);
        dispatch(
          showBottomNotificationModal(
            CustomErrorMessage({
              errMsg: BWCErrorMessage(err, t('Could not update wallet')),
            }),
          ),
        );
      }
    },
    [
      buildUiFormatList,
      dispatch,
      multisigEthInfo?.multisigContractAddress,
      t,
      token?.address,
      wallet,
    ],
  );

  const setUtxos = useCallback(
    async (isCancelled: () => boolean) => {
      try {
        const response = await GetLowUtxos(wallet);
        if (isCancelled()) {
          return;
        }

        if (response?.allUtxos?.length) {
          const allUtxos = response.allUtxos || 0;
          const allSum = allUtxos.reduce(
            (total: number, {satoshis}: {satoshis: number}) => total + satoshis,
            0,
          );
          const per = (response.minFee / allSum) * 100;
          const lowUtxos = response.lowUtxos || 0;
          const lowUtoxosSum = lowUtxos.reduce(
            (total: number, {satoshis}: {satoshis: number}) => total + satoshis,
            0,
          );

          setLowUtxosNb(response.lowUtxos.length);
          setAllUtxosNb(response.allUtxos.length);

          setLowUtxosSum(
            dispatch(
              FormatAmountStr(
                currencyAbbreviation,
                chain,
                tokenAddress,
                lowUtoxosSum,
              ),
            ),
          );
          setAllUtxosSum(
            dispatch(
              FormatAmountStr(
                currencyAbbreviation,
                chain,
                tokenAddress,
                allSum,
              ),
            ),
          );
          setMinFee(
            dispatch(
              FormatAmountStr(
                currencyAbbreviation,
                chain,
                tokenAddress,
                response.minFee || 0,
              ),
            ),
          );
          setMinFeePer(per.toFixed(2) + '%');
        }
        setLoadingUtxos(false);
      } catch (err: any) {
        if (isCancelled()) {
          return;
        }
        setLoadingUtxos(false);
        const errorMessage =
          err instanceof Error ? err.message : JSON.stringify(err);
        if (errorMessage.includes('No UTXOs')) {
          return;
        }
        logger.error(
          `error [Addresses - setUtxos] [getStatus]: ${errorMessage}`,
        );
      }
    },
    [chain, currencyAbbreviation, dispatch, logger, tokenAddress, wallet],
  );

  useEffect(() => {
    let cancelled = false;
    let started = false;
    const startLoading = () => {
      if (started || cancelled) {
        return;
      }
      started = true;
      const isCancelled = () => cancelled;
      void Promise.all([setAddresses(isCancelled), setUtxos(isCancelled)]);
    };
    const unsubscribe = (navigation as any).addListener(
      'transitionEnd',
      (event: {data?: {closing?: boolean}}) => {
        if (!event.data?.closing) {
          startLoading();
        }
      },
    );
    const fallbackTimer = setTimeout(startLoading, DEFERRED_LOAD_FALLBACK_MS);

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, [navigation, setAddresses, setUtxos]);

  const {
    credentials: {walletId},
  } = wallet;

  const scan = async () => {
    try {
      setButtonState('loading');

      if (!wallet.isComplete() && wallet.pendingTssSession) {
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
            logger.error(
              '[startScan] error: ' + (err.message || JSON.stringify(err)),
            );
            setButtonState('failed');
            await sleep(1000);
            setButtonState(null);
            return;
          }
          // set scanning (for UI scanning label on wallet details )
          dispatch(
            setWalletScanning({
              keyId: wallet.keyId,
              walletId: wallet.id,
              isScanning: true,
            }),
          );

          setButtonState('success');
          navigation.navigate('WalletDetails', {walletId, copayerId});

          return;
        },
      );
    } catch {}
  };

  const copyText = (text: string) => {
    haptic('impactLight');
    Clipboard.setString(text);
  };

  return (
    <AddressesContainer>
      <StyledScrollView>
        {!isSingleAddressChain(wallet.credentials.chain) ? (
          <>
            <AddressesParagraph>
              {t(
                'Each wallet can generate billions of addresses from your 12-word recovery phrase. A new address is automatically generated and shown each time you receive a payment.',
              )}
            </AddressesParagraph>
            <AddressesParagraph>
              {t(
                "It's a good idea to avoid reusing addresses - this both protects your privacy and keeps your assets secure against hypothetical attacks by quantum computers.",
              )}
            </AddressesParagraph>
          </>
        ) : null}

        {!singleAddress ? (
          <AddressesContainer>
            <Button onPress={scan} state={buttonState}>
              {t('Scan Addresses for Funds')}
            </Button>
          </AddressesContainer>
        ) : null}

        {loadingUtxos ? (
          <AddressesSkeleton />
        ) : (
          <>
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
          </>
        )}
        {loadingAddresses ? (
          <AddressesSkeleton />
        ) : (
          <>
            {viewAll ? (
              <AllAddressesLink
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  navigation.navigate('AllAddresses', {
                    currencyAbbreviation,
                    chain,
                    walletName: walletName || currencyName,
                    usedAddresses: usedAddress,
                    unusedAddresses: unusedAddress,
                    tokenAddress,
                  });
                }}>
                <LinkText>{t('View all addresses')}</LinkText>
              </AllAddressesLink>
            ) : null}

            {latestUsedAddress?.length ? (
              <>
                <VerticalPadding>
                  <Title>{t('Addresses with balance')}</Title>

                  {latestUsedAddress.map(({address, amount}, index) => (
                    <View key={index}>
                      <SettingView>
                        <CopyRow
                          style={{justifyContent: 'center'}}
                          activeOpacity={ActiveOpacity}
                          onPress={() => {
                            copyText(address);
                            setCopiedAddressWithBalance(address);
                          }}>
                          <SettingTitle
                            numberOfLines={1}
                            ellipsizeMode={'tail'}
                            style={{maxWidth: 225}}>
                            {address}
                          </SettingTitle>
                          <CopyImgContainerRight style={{minWidth: '10%'}}>
                            {copiedAddressWithBalance === address ? (
                              <CopiedSvg width={17} />
                            ) : null}
                          </CopyImgContainerRight>
                        </CopyRow>

                        <H7>
                          {dispatch(
                            FormatAmountStr(
                              currencyAbbreviation,
                              chain,
                              tokenAddress,
                              amount,
                            ),
                          )}
                        </H7>
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
                        <CopyRow
                          activeOpacity={ActiveOpacity}
                          onPress={() => {
                            copyText(address);
                            setCopiedUnusedAddress(address);
                          }}>
                          <SettingTitle
                            style={{width: '90%'}}
                            numberOfLines={1}
                            ellipsizeMode={'tail'}>
                            {address}
                          </SettingTitle>
                          <CopyImgContainerRight style={{width: '10%'}}>
                            {copiedUnusedAddress === address ? (
                              <CopiedSvg width={17} />
                            ) : null}
                          </CopyImgContainerRight>
                        </CopyRow>

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
      </StyledScrollView>
    </AddressesContainer>
  );
};

export default Addresses;
