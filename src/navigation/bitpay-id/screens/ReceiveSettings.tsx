import React, {useEffect, useState} from 'react';
import _ from 'lodash';
import styled from 'styled-components/native';
import {useNavigation, useTheme} from '@react-navigation/native';
import {
  ActiveOpacity,
  Br,
  CtaContainerAbsolute,
} from '../../../components/styled/Containers';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {H3, H5, Paragraph} from '../../../components/styled/Text';
import {BaseText} from '../../wallet/components/KeyDropdownOption';
import {
  LightBlack,
  Slate,
  Slate10,
  Slate30,
  SlateDark,
} from '../../../styles/colors';
import AddSvg from '../../../../assets/img/add.svg';
import AddWhiteSvg from '../../../../assets/img/add-white.svg';
import {TouchableOpacity} from 'react-native';
import Button from '../../../components/button/Button';
import ChevronRight from '../components/ChevronRight';
import SendToPill from '../../wallet/components/SendToPill';
import {BitpayIdScreens, BitpayIdStackParamList} from '../BitpayIdStack';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {BuildKeysAndWalletsList} from '../../../store/wallet/utils/wallet';
import {Network} from '../../../constants';
import {
  CurrencyIconAndBadge,
  WalletSelector,
} from '../../wallet/screens/send/confirm/Shared';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {AppActions} from '../../../store/app';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {formatCurrencyAbbreviation, sleep} from '../../../utils/helper-methods';
import {BitPayIdEffects} from '../../../store/bitpay-id';
import {ReceivingAddress} from '../../../store/bitpay-id/bitpay-id.models';
import {WalletScreens} from '../../wallet/WalletStack';
import AddressModal from '../components/AddressModal';
import {keyBackupRequired} from '../../tabs/home/components/Crypto';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import TwoFactorRequiredModal from '../components/TwoFactorRequiredModal';
import {getCurrencyCodeFromCoinAndChain} from '../utils/bitpay-id-utils';
import {
  BitpaySupportedCoins,
  BitpaySupportedTokens,
} from '../../../constants/currencies';
import DefaultImage from '../../../../assets/img/currencies/default.svg';
import {useTranslation} from 'react-i18next';

const ReceiveSettingsContainer = styled.SafeAreaView`
  flex: 1;
`;

const ViewContainer = styled.ScrollView`
  padding: 16px;
  flex-direction: column;
`;

const ViewBody = styled.View`
  flex-grow: 1;
  padding-bottom: 150px;
`;

const SectionHeader = styled(H5)`
  margin-top: 20px;
`;

const AddressItem = styled.View`
  align-items: center;
  border: 0.75px solid ${Slate};
  border-color: ${({theme: {dark}}) => (dark ? Slate : Slate30)};
  border-radius: 8px;
  flex-direction: row;
  height: 55px;
  padding: 0 15px;
  margin-top: 10px;
  padding-left: 2px;
`;

const AddressItemText = styled(Paragraph)`
  flex-grow: 1;
  margin-left: 0px;
`;

const AddressPillContainer = styled.View`
  height: 37px;
  margin-right: 20px;
  width: 100px;
`;

const WalletName = styled(BaseText)`
  font-size: 16px;
`;

const AddButton = styled.View`
  height: 30px;
  width: 30px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate10)};
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  margin-left: 11px;
  margin-right: 9px;
`;

const MoreCurrenciesText = styled(Paragraph)`
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  font-size: 14px;
`;

const UnusedCurrencies = styled.View`
  flex-direction: row;
`;

const UnusedCurrencyIcons = styled.View`
  flex-direction: row;
  margin-right: 30px;
`;

const FooterButton = styled(CtaContainerAbsolute)`
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
`;

const numVisibleCurrencyIcons = 3;

const getReceivingAddressKey = (coin: string, chain: string) => {
  return `${coin.toLowerCase()}_${chain.toLowerCase()}`;
};

const createAddressMap = (receivingAddresses: ReceivingAddress[]) => {
  return _.keyBy(receivingAddresses, ({coin, chain}) =>
    getReceivingAddressKey(coin, chain),
  );
};

type ReceiveSettingsProps = NativeStackScreenProps<
  BitpayIdStackParamList,
  'ReceiveSettings'
>;

const ReceiveSettings: React.FC<ReceiveSettingsProps> = ({navigation}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigator = useNavigation();
  const theme = useTheme();
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
  const inactiveCurrencyOptions = SupportedCurrencyOptions.filter(
    currencyOption =>
      !uniqueActiveCurrencies.includes(
        currencyOption.currencyAbbreviation.toLowerCase(),
      ),
  );
  const keyWallets = BuildKeysAndWalletsList({
    keys,
    network: Network.mainnet,
    defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
    rates,
    dispatch,
  });

  const keyWalletsByCurrency = uniqueActiveWallets.reduce(
    (keyWalletMap, {currencyAbbreviation, chain}) => ({
      ...keyWalletMap,
      [getReceivingAddressKey(currencyAbbreviation, chain)]: keyWallets
        .map(keyWallet => ({
          ...keyWallet,
          wallets: keyWallet.wallets.filter(
            wallet =>
              wallet.currencyAbbreviation === walletSelectorCurrency &&
              wallet.chain === walletSelectorChain,
          ),
        }))
        .filter(keyWallet => keyWallet.wallets.length),
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
    dispatch(startOnGoingProcessModal('GENERATING_ADDRESS'));
    const address = await dispatch(
      createWalletAddress({wallet, newAddress: true}),
    );
    await dispatch(dismissOnGoingProcessModal());
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
    dispatch(startOnGoingProcessModal('SAVING_ADDRESSES'));
    const newReceivingAddresses = Object.values(activeAddresses);
    await dispatch(
      BitPayIdEffects.startUpdateReceivingAddresses(
        newReceivingAddresses,
        twoFactorCode,
      ),
    );
    await dispatch(dismissOnGoingProcessModal());
    return !receivingAddresses.length && newReceivingAddresses.length
      ? navigator.navigate('BitpayId', {
          screen: BitpayIdScreens.RECEIVING_ENABLED,
        })
      : navigation.popToTop();
  };

  useEffect(() => {
    const getWallets = async () => {
      const latestReceivingAddresses = await dispatch(
        BitPayIdEffects.startFetchReceivingAddresses(),
      );
      setActiveAddresses(createAddressMap(latestReceivingAddresses));
    };
    getWallets();
  }, [apiToken, dispatch]);

  useEffect(() => {
    setTwoFactorModalRequiredVisible(!otpEnabled);
  }, [otpEnabled]);

  const addWallet = (key: Key) => {
    navigator.navigate('Wallet', {
      screen: 'AddingOptions',
      params: {
        key,
      },
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
                ({currencyAbbreviation: coin, chain}) => {
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
                        <AddressItemText>
                          Select a{' '}
                          <WalletName>{coin.toUpperCase()} Wallet</WalletName>
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
                    navigator.navigate('Wallet', {screen: 'CreationOptions'});
                    return;
                  }
                  if (keyList.length === 1) {
                    addWallet(keyList[0]);
                    return;
                  }
                  navigator.navigate('Wallet', {
                    screen: WalletScreens.KEY_GLOBAL_SELECT,
                    params: {
                      onKeySelect: (selectedKey: Key) => addWallet(selectedKey),
                    },
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
              await dispatch(dismissOnGoingProcessModal());
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
      <FooterButton
        background={true}
        style={{
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }}>
        <Button
          onPress={() =>
            navigator.navigate('BitpayId', {
              screen: BitpayIdScreens.TWO_FACTOR,
              params: {
                onSubmit: async (twoFactorCode: string) => {
                  saveAddresses(twoFactorCode).catch(async error => {
                    dispatch(dismissOnGoingProcessModal());
                    await sleep(300);
                    showError({
                      error,
                      defaultErrorMessage: t('Could not save addresses'),
                    });
                  });
                },
                twoFactorCodeLength: 6,
              },
            })
          }
          buttonStyle={'primary'}>
          {t('Save Defaults')}
        </Button>
        <Br />
      </FooterButton>
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
        onClose={enable => {
          setTwoFactorModalRequiredVisible(false);
          navigation.pop();
          if (enable) {
            navigator.navigate('BitpayId', {
              screen: BitpayIdScreens.ENABLE_TWO_FACTOR,
            });
          }
        }}
      />
    </ReceiveSettingsContainer>
  );
};

export default ReceiveSettings;
