import React, {useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import _ from 'lodash';
import uniqBy from 'lodash.uniqby';
import {
  SafeAreaView,
  ScrollView as RNScrollView,
  ScrollViewProps,
  View,
  ViewProps,
  Text,
  TextProps,
  StyleSheet,
} from 'react-native';
import {useNavigation, useTheme} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {ActiveOpacity, Br} from '../../../components/styled/Containers';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {BaseText, H3, H5, Paragraph} from '../../../components/styled/Text';
import {
  LightBlack,
  Slate,
  Slate10,
  Slate30,
  SlateDark,
} from '../../../styles/colors';
import AddSvg from '../../../../assets/img/add.svg';
import AddWhiteSvg from '../../../../assets/img/add-white.svg';
import Button from '../../../components/button/Button';
import ChevronRight from '../components/ChevronRight';
import SendToPill from '../../wallet/components/SendToPill';
import {BitpayIdScreens, BitpayIdGroupParamList} from '../BitpayIdGroup';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {BuildKeysAndWalletsList} from '../../../store/wallet/utils/wallet';
import {Network} from '../../../constants';
import {
  CurrencyIconAndBadge,
  WalletSelector,
} from '../../wallet/screens/send/confirm/Shared';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {AppActions} from '../../../store/app';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {formatCurrencyAbbreviation, sleep} from '../../../utils/helper-methods';
import {BitPayIdEffects} from '../../../store/bitpay-id';
import {ReceivingAddress} from '../../../store/bitpay-id/bitpay-id.models';
import {WalletScreens} from '../../wallet/WalletGroup';
import AddressModal from '../components/AddressModal';
import {keyBackupRequired} from '../../tabs/home/components/Crypto';
import TwoFactorRequiredModal from '../components/TwoFactorRequiredModal';
import {getCurrencyCodeFromCoinAndChain} from '../utils/bitpay-id-utils';
import {
  BitpaySupportedCoins,
  BitpaySupportedTokens,
} from '../../../constants/currencies';
import {IsVMChain} from '../../../store/wallet/utils/currency';
import DefaultImage from '../../../../assets/img/currencies/default.svg';
import FooterButtonContainer from '../../../components/footer/FooterButtonContainer';
import {useOngoingProcess} from '../../../contexts';

const styles = StyleSheet.create({
  receiveSettingsContainer: {
    flex: 1,
  },
  viewContainer: {
    padding: 16,
    flexDirection: 'column',
  },
  viewBody: {
    flexGrow: 1,
    paddingBottom: 150,
  },
  sectionHeader: {
    marginTop: 20,
  },
  addressItem: {
    alignItems: 'center',
    borderWidth: 0.75,
    borderRadius: 8,
    flexDirection: 'row',
    height: 55,
    paddingHorizontal: 15,
    marginTop: 10,
    paddingLeft: 2,
  },
  addressItemText: {
    flexGrow: 1,
    flexShrink: 1,
    marginLeft: 1,
  },
  addressPillContainer: {
    height: 37,
    marginRight: 20,
    width: 100,
  },
  walletName: {
    fontSize: 16,
  },
  addButton: {
    height: 30,
    width: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 11,
    marginRight: 9,
  },
  moreCurrenciesText: {
    fontSize: 14,
  },
  unusedCurrencies: {
    flexDirection: 'row',
  },
  unusedCurrencyIcons: {
    flexDirection: 'row',
    marginRight: 30,
  },
});

const ReceiveSettingsContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SafeAreaView>) => (
  <SafeAreaView style={[styles.receiveSettingsContainer, style]} {...rest} />
);

const ViewContainer = ({style, ...rest}: ScrollViewProps) => (
  <RNScrollView style={[styles.viewContainer, style]} {...rest} />
);

const ViewBody = ({style, ...rest}: ViewProps) => (
  <View style={[styles.viewBody, style]} {...rest} />
);

const SectionHeader = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => (
    <H5 ref={ref} style={[styles.sectionHeader, style]} {...rest} />
  ),
);

const AddressItem = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.addressItem,
        {borderColor: theme.dark ? Slate : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const AddressItemText = React.forwardRef<
  React.ComponentRef<typeof Paragraph>,
  React.ComponentProps<typeof Paragraph>
>(({style, ...rest}, ref) => (
  <Paragraph ref={ref} style={[styles.addressItemText, style]} {...rest} />
));

const AddressPillContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.addressPillContainer, style]} {...rest} />
);

const WalletName = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => (
    <BaseText ref={ref} style={[styles.walletName, style]} {...rest} />
  ),
);

const AddButton = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.addButton,
        {backgroundColor: theme.dark ? LightBlack : Slate10},
        style,
      ]}
      {...rest}
    />
  );
};

const MoreCurrenciesText = React.forwardRef<
  React.ComponentRef<typeof Paragraph>,
  React.ComponentProps<typeof Paragraph>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <Paragraph
      ref={ref}
      style={[
        styles.moreCurrenciesText,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});

const UnusedCurrencies = ({style, ...rest}: ViewProps) => (
  <View style={[styles.unusedCurrencies, style]} {...rest} />
);

const UnusedCurrencyIcons = ({style, ...rest}: ViewProps) => (
  <View style={[styles.unusedCurrencyIcons, style]} {...rest} />
);

const numVisibleCurrencyIcons = 3;

const getReceivingAddressKey = (coin: string, chain: string) => {
  return `${coin.toLowerCase()}_${chain.toLowerCase()}`;
};

const createAddressMap = (receivingAddresses: ReceivingAddress[]) => {
  return _.keyBy(receivingAddresses, ({coin, chain}) =>
    getReceivingAddressKey(coin, chain),
  );
};

const matchesChainAndCurrency = (
  wallet: Wallet,
  chain: string,
  currencyAbbreviation: string,
) => {
  return (
    wallet.currencyAbbreviation?.toLowerCase() ===
      currencyAbbreviation?.toLowerCase() && wallet.chain === chain
  );
};

const hasAccountOrWalletsMatchChainAndCurrency = (
  chain: string,
  currencyAbbreviation: string,
) => {
  return account => {
    return account.currencyAbbreviation
      ? matchesChainAndCurrency(account, chain, currencyAbbreviation)
      : account.wallets?.some(wallet =>
          matchesChainAndCurrency(wallet, chain, currencyAbbreviation),
        );
  };
};

type ReceiveSettingsProps = NativeStackScreenProps<
  BitpayIdGroupParamList,
  BitpayIdScreens.RECEIVE_SETTINGS
>;

const ReceiveSettings = ({navigation}: ReceiveSettingsProps) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigator = useNavigation();
  const theme = useTheme();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const network = useAppSelector(({APP}) => APP.network);
  const securitySettings = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.securitySettings[network],
  );
  const apiToken = useAppSelector(({BITPAY_ID}) => BITPAY_ID.apiToken[network]);
  const receivingAddresses = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.receivingAddresses[network],
  ).map(address => ({...address, coin: address.coin || address.currency}));
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const [walletSelectorVisible, setWalletSelectorVisible] = useState(false);
  const [twoFactorModalRequiredVisible, setTwoFactorModalRequiredVisible] =
    useState(false);
  const [addressModalActiveAddress, setAddressModalActiveAddress] =
    useState<ReceivingAddress>();
  const [walletSelectorCurrency, setWalletSelectorCurrency] = useState('BTC');
  const [walletSelectorChain, setWalletSelectorChain] = useState<string>('BTC');
  const [activeAddresses, setActiveAddresses] = useState<
    _.Dictionary<ReceivingAddress>
  >(createAddressMap(receivingAddresses));

  const initialAddressMap = useMemo(
    () => createAddressMap(receivingAddresses),
    [receivingAddresses],
  );

  const hasChanges = useMemo(() => {
    const initKeys = Object.keys(initialAddressMap);
    const currKeys = Object.keys(activeAddresses);

    if (initKeys.length !== currKeys.length) {
      return true;
    }

    const sortedInit = [...initKeys].sort();
    const sortedCurr = [...currKeys].sort();
    for (let i = 0; i < sortedInit.length; i++) {
      if (sortedInit[i] !== sortedCurr[i]) {
        return true;
      }
    }

    for (const key of initKeys) {
      if (initialAddressMap[key]?.address !== activeAddresses[key]?.address) {
        return true;
      }
    }

    return false;
  }, [initialAddressMap, activeAddresses]);
  const uniqueActiveWallets = _.uniqBy(
    Object.values(keys)
      .flatMap(key => key.wallets)
      .filter(
        wallet =>
          wallet.network === Network.mainnet &&
          Object.values({
            ...BitpaySupportedCoins,
            ...BitpaySupportedTokens,
          }).some(
            ({coin, chain}) =>
              wallet.currencyAbbreviation === coin && wallet.chain === chain,
          ),
      ),
    wallet => getReceivingAddressKey(wallet.currencyAbbreviation, wallet.chain),
  );
  const uniqueActiveCurrencies = uniqueActiveWallets.map(
    wallet => wallet.currencyAbbreviation,
  );
  const unusedActiveWallets = uniqueActiveWallets.filter(
    wallet =>
      !Object.values(activeAddresses).some(
        ({coin, chain}) =>
          wallet.currencyAbbreviation === coin && wallet.chain === chain,
      ),
  );
  const inactiveCurrencyOptions = uniqBy(
    SupportedCurrencyOptions,
    currencyOption => currencyOption.currencyAbbreviation,
  ).filter(
    currencyOption =>
      !uniqueActiveCurrencies.includes(
        currencyOption.currencyAbbreviation.toLowerCase(),
      ),
  );
  const keyWallets = BuildKeysAndWalletsList({
    keys,
    network: Network.mainnet,
    defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
    filterWalletsByBalance: false,
    rates,
    dispatch,
  });

  const keyWalletsByCurrency = uniqueActiveWallets.reduce(
    (keyWalletMap, {currencyAbbreviation, chain}) => ({
      ...keyWalletMap,
      [getReceivingAddressKey(currencyAbbreviation, chain)]: keyWallets
        .filter(keyWallet =>
          keyWallet.mergedUtxoAndEvmAccounts?.some(
            hasAccountOrWalletsMatchChainAndCurrency(
              chain,
              currencyAbbreviation,
            ),
          ),
        )
        .map(keyWallet => {
          return {
            ...keyWallet,
            mergedUtxoAndEvmAccounts: keyWallet.mergedUtxoAndEvmAccounts
              ?.filter(
                hasAccountOrWalletsMatchChainAndCurrency(
                  chain,
                  currencyAbbreviation,
                ),
              )
              .map(account => ({
                ...account,
                wallets: account.wallets?.filter(wallet =>
                  matchesChainAndCurrency(wallet, chain, currencyAbbreviation),
                ),
                assetsByChain: account.assetsByChain?.map(chainAssets => ({
                  ...chainAssets,
                  chainAssetsList: chainAssets.chainAssetsList.filter(asset =>
                    matchesChainAndCurrency(asset, chain, currencyAbbreviation),
                  ),
                })),
              })),
          };
        }),
    }),
    {} as {[key: string]: any[]},
  );

  const {otpEnabled} = securitySettings || {};

  const showError = ({
    error,
    defaultErrorMessage,
    onDismiss,
  }: {
    error?: any;
    defaultErrorMessage: string;
    onDismiss?: () => Promise<void>;
  }) => {
    dispatch(
      AppActions.showBottomNotificationModal(
        CustomErrorMessage({
          title: t('Error'),
          errMsg: error?.message || defaultErrorMessage,
          action: () => onDismiss && onDismiss(),
        }),
      ),
    );
  };

  const generateAddress = async (wallet: Wallet) => {
    showOngoingProcess('GENERATING_ADDRESS');
    const address = await dispatch(
      createWalletAddress({wallet, newAddress: true}),
    );
    hideOngoingProcess();
    setActiveAddresses({
      ...activeAddresses,
      [getReceivingAddressKey(wallet.currencyAbbreviation, wallet.chain)]: {
        id: '',
        coin: wallet.currencyAbbreviation,
        chain: wallet.chain,
        label:
          wallet.walletName ||
          formatCurrencyAbbreviation(wallet.currencyAbbreviation),
        address,
        provider: 'BitPay',
        currency: getCurrencyCodeFromCoinAndChain(
          wallet.currencyAbbreviation,
          wallet.chain,
        ),
        status: {
          isActive: true,
        },
        usedFor: {
          payToEmail: true,
        },
      },
    });
  };

  const showAddressModal = (activeAddress: ReceivingAddress) => {
    setAddressModalActiveAddress(activeAddress);
  };

  const saveAddresses = async (twoFactorCode: string) => {
    showOngoingProcess('SAVING_ADDRESSES');
    const newReceivingAddresses = Object.values(activeAddresses);
    await dispatch(
      BitPayIdEffects.startUpdateReceivingAddresses(
        newReceivingAddresses,
        twoFactorCode,
      ),
    );
    hideOngoingProcess();
    return !receivingAddresses.length && newReceivingAddresses.length
      ? navigator.navigate(BitpayIdScreens.RECEIVING_ENABLED)
      : navigation.pop();
  };

  useEffect(() => {
    const getWallets = async () => {
      const latestReceivingAddresses = await dispatch(
        BitPayIdEffects.startFetchReceivingAddresses(),
      );
      setActiveAddresses(createAddressMap(latestReceivingAddresses));
    };
    getWallets().catch(() => {});
  }, [apiToken, dispatch]);

  useEffect(() => {
    setTwoFactorModalRequiredVisible(!otpEnabled);
  }, [otpEnabled]);

  const addWallet = (key: Key) => {
    navigator.navigate('AddingOptions', {
      key,
    });
  };

  const removeAddress = (activeAddress: ReceivingAddress) => {
    delete activeAddresses[
      getReceivingAddressKey(activeAddress.coin, activeAddress.chain)
    ];
    setActiveAddresses({...activeAddresses});
  };

  return (
    <ReceiveSettingsContainer>
      <ViewContainer>
        <ViewBody>
          <H3>{t('Choose your Primary Wallet to Receive Payments')}</H3>
          <Br />
          <Paragraph>
            {t(
              "Decide which wallets you'd like to receive funds when crypto is sent to your email address.",
            )}
          </Paragraph>
          {Object.keys(activeAddresses).length ? (
            <>
              <SectionHeader>{t('Active Addresses')}</SectionHeader>
              {Object.values(activeAddresses).map(({coin, chain}) => {
                const activeAddress =
                  activeAddresses[getReceivingAddressKey(coin, chain)];
                return (
                  <TouchableOpacity
                    activeOpacity={ActiveOpacity}
                    key={getReceivingAddressKey(coin, chain)}
                    onPress={() => showAddressModal(activeAddress)}>
                    <AddressItem>
                      <CurrencyIconAndBadge
                        coin={coin}
                        chain={chain}
                        size={25}
                      />
                      <AddressItemText>
                        <WalletName>{activeAddress.label}</WalletName>
                      </AddressItemText>
                      <AddressPillContainer>
                        <SendToPill
                          accent="action"
                          onPress={() => showAddressModal(activeAddress)}
                          description={activeAddress.address}
                        />
                      </AddressPillContainer>
                      <ChevronRight />
                    </AddressItem>
                  </TouchableOpacity>
                );
              })}
            </>
          ) : null}
          {unusedActiveWallets.length + inactiveCurrencyOptions.length > 0 ? (
            <>
              <SectionHeader>{t('Receiving Addresses')}</SectionHeader>
              {unusedActiveWallets.map(
                ({currencyAbbreviation: coin, chain, chainName}) => {
                  return (
                    <TouchableOpacity
                      activeOpacity={ActiveOpacity}
                      key={getReceivingAddressKey(coin, chain)}
                      onPress={() => {
                        setWalletSelectorCurrency(coin);
                        setWalletSelectorChain(chain);
                        setWalletSelectorVisible(true);
                      }}>
                      <AddressItem>
                        <CurrencyIconAndBadge
                          coin={coin}
                          chain={chain}
                          size={25}
                        />
                        <AddressItemText
                          ellipsizeMode={'tail'}
                          numberOfLines={1}>
                          Select a{' '}
                          <WalletName>
                            {coin.toUpperCase()} Wallet
                            {IsVMChain(chain) ? ` (${chainName})` : ''}
                          </WalletName>
                        </AddressItemText>
                        <ChevronRight />
                      </AddressItem>
                    </TouchableOpacity>
                  );
                },
              )}
              <TouchableOpacity
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  const keyList = Object.values(keys);
                  if (!keyList.length) {
                    navigator.navigate('CreationOptions');
                    return;
                  }
                  if (keyList.length === 1) {
                    addWallet(keyList[0]);
                    return;
                  }
                  navigator.navigate(WalletScreens.KEY_GLOBAL_SELECT, {
                    onKeySelect: (selectedKey: Key) => addWallet(selectedKey),
                  });
                }}>
                <AddressItem>
                  <AddButton>
                    {theme.dark ? <AddWhiteSvg /> : <AddSvg />}
                  </AddButton>
                  <AddressItemText>{t('Add Wallet')}</AddressItemText>
                  <UnusedCurrencies>
                    <UnusedCurrencyIcons>
                      {inactiveCurrencyOptions
                        .slice(0, numVisibleCurrencyIcons)
                        .map(currencyOption => {
                          return currencyOption.img ? (
                            <currencyOption.img
                              key={currencyOption.currencyAbbreviation}
                              height="25"
                              style={{marginRight: -35}}
                            />
                          ) : (
                            <DefaultImage
                              height={25}
                              style={{marginRight: -35}}
                            />
                          );
                        })}
                    </UnusedCurrencyIcons>
                    {inactiveCurrencyOptions.length >
                    numVisibleCurrencyIcons ? (
                      <MoreCurrenciesText>
                        +
                        {inactiveCurrencyOptions.length -
                          numVisibleCurrencyIcons}{' '}
                        {t('More')}
                      </MoreCurrenciesText>
                    ) : null}
                  </UnusedCurrencies>
                </AddressItem>
              </TouchableOpacity>
            </>
          ) : null}
        </ViewBody>
        <WalletSelector
          isVisible={walletSelectorVisible}
          setWalletSelectorVisible={setWalletSelectorVisible}
          autoSelectIfOnlyOneWallet={false}
          currency={walletSelectorCurrency}
          chain={walletSelectorChain}
          walletsAndAccounts={{
            keyWallets:
              keyWalletsByCurrency[
                getReceivingAddressKey(
                  walletSelectorCurrency,
                  walletSelectorChain,
                )
              ] || [],
            coinbaseWallets: [],
          }}
          onWalletSelect={async wallet => {
            const key = keys[wallet.keyId];
            if (!key.backupComplete) {
              dispatch(
                showBottomNotificationModal(
                  keyBackupRequired(
                    Object.values(keys)[0],
                    navigator,
                    dispatch,
                  ),
                ),
              );
              return;
            }
            await generateAddress(wallet).catch(async error => {
              hideOngoingProcess();
              await sleep(400);
              showError({
                error,
                defaultErrorMessage: t('Could not generate address'),
              });
            });
          }}
          onCoinbaseAccountSelect={() => {}}
          onBackdropPress={async () => {
            setWalletSelectorVisible(false);
          }}
        />
      </ViewContainer>
      <FooterButtonContainer>
        <Button
          onPress={() => {
            if (!hasChanges) {
              dispatch(
                showBottomNotificationModal({
                  type: 'info',
                  title: t('No changes detected'),
                  message: t(
                    "It looks like you haven't made any changes to your receiving addresses yet. Please make some changes before saving.",
                  ),
                  enableBackdropDismiss: true,
                  actions: [
                    {
                      text: t('OK'),
                      action: () => {},
                      primary: true,
                    },
                  ],
                }),
              );
              return;
            }
            navigator.navigate(WalletScreens.PAY_PRO_CONFIRM_TWO_FACTOR, {
              onSubmit: async (twoFactorCode: string) => {
                saveAddresses(twoFactorCode).catch(async error => {
                  hideOngoingProcess();
                  await sleep(300);
                  showError({
                    error,
                    defaultErrorMessage: t('Could not save addresses'),
                  });
                });
              },
              twoFactorCodeLength: 6,
            });
          }}
          buttonStyle={'primary'}>
          {t('Save Defaults')}
        </Button>
      </FooterButtonContainer>
      <AddressModal
        receivingAddress={addressModalActiveAddress}
        onClose={(remove?: boolean) => {
          if (remove) {
            removeAddress(addressModalActiveAddress!);
          }
          setAddressModalActiveAddress(undefined);
        }}
      />
      <TwoFactorRequiredModal
        isVisible={twoFactorModalRequiredVisible}
        onClose={async enable => {
          setTwoFactorModalRequiredVisible(false);
          await sleep(500);
          navigation.pop();
          if (enable) {
            navigator.navigate(BitpayIdScreens.ENABLE_TWO_FACTOR);
          }
        }}
      />
    </ReceiveSettingsContainer>
  );
};

export default ReceiveSettings;
