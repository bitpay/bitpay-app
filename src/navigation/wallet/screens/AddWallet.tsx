import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {
  BaseText,
  H4,
  HeaderTitle,
  InfoDescription,
  InfoHeader,
  InfoTitle,
  Link,
  TextAlign,
} from '../../../components/styled/Text';
import styled from 'styled-components/native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {
  ActiveOpacity,
  AdvancedOptionsButton,
  AdvancedOptionsButtonText,
  AdvancedOptionsContainer,
  AdvancedOptions,
  Column,
  SheetContainer,
  Row,
  ScreenGutter,
  Info,
  InfoTriangle,
  InfoImageContainer,
} from '../../../components/styled/Containers';
import {Key, Token, Wallet} from '../../../store/wallet/wallet.models';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import {
  openUrlWithInAppBrowser,
  startOnGoingProcessModal,
} from '../../../store/app/app.effects';
import {
  dismissBottomNotificationModal,
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {
  addWallet,
  getDecryptPassword,
  startGetRates,
} from '../../../store/wallet/effects';
import {Controller, useForm} from 'react-hook-form';
import {yupResolver} from '@hookform/resolvers/yup';
import yup from '../../../lib/yup';
import {
  LightBlack,
  LuckySevens,
  NeutralSlate,
  Slate,
  SlateDark,
  White,
} from '../../../styles/colors';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {
  CurrencyListIcons,
  SupportedCoinsOptions,
  SupportedCurrencyOptions,
  SupportedEvmCurrencyOptions,
} from '../../../constants/SupportedCurrencyOptions';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {FlatList, Keyboard, View, TouchableOpacity} from 'react-native';
import {
  fixWalletAddresses,
  formatCryptoAddress,
  getAccount,
  getProtocolName,
  keyExtractor,
  sleep,
} from '../../../utils/helper-methods';
import haptic from '../../../components/haptic-feedback/haptic';
import Haptic from '../../../components/haptic-feedback/haptic';
import Icons from '../components/WalletIcons';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import Checkbox from '../../../components/checkbox/Checkbox';
import {Network} from '../../../constants';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {WrongPasswordError} from '../components/ErrorMessages';
import {
  getTokenContractInfo,
  startUpdateAllWalletStatusForKey,
} from '../../../store/wallet/effects/status/status';
import {
  createWalletAddress,
  GetCoinAndNetwork,
} from '../../../store/wallet/effects/address/address';
import {addCustomTokenOption} from '../../../store/wallet/effects/currencies/currencies';
import {
  BitpaySupportedCoins,
  SUPPORTED_EVM_COINS,
} from '../../../constants/currencies';
import InfoSvg from '../../../../assets/img/info.svg';
import {URL} from '../../../constants';
import {useTranslation} from 'react-i18next';
import {BitpayIdScreens} from '../../bitpay-id/BitpayIdGroup';
import {
  IsERCToken,
  IsSegwitCoin,
  IsTaprootCoin,
} from '../../../store/wallet/utils/currency';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {LogActions} from '../../../store/log';
import {CommonActions, useTheme} from '@react-navigation/native';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {RootStacks, getNavigationTabName} from '../../../Root';
import {BWCErrorMessage} from '../../../constants/BWCError';
import AccountRow from '../../../components/list/AccountRow';
import {SendToPillContainer} from './send/confirm/Shared';
import {PillText} from '../components/SendToPill';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {ChainSelectionRow} from '../../../components/list/ChainSelectionRow';

export type AddWalletParamList = {
  key: Key;
  chain?: string;
  currencyAbbreviation?: string;
  currencyName?: string;
  isToken?: boolean;
  isCustomToken?: boolean;
  tokenAddress?: string;
};

const CreateWalletContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const ButtonContainer = styled.View`
  margin-top: 40px;
`;

const AssociatedAccountContainer = styled.View`
  margin-top: 20px;
  position: relative;
`;

const AssociatedWallet = styled.TouchableOpacity`
  background: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
  padding: 0 20px;
  height: 55px;
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
`;

const AssociatedAccount = styled.TouchableOpacity`
  padding: 0 10px;
  height: 64px;
  border: 0.75px solid ${({theme}) => (theme.dark ? LuckySevens : Slate)};
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
`;

const Label = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? White : LightBlack)};
  font-size: 13px;
  font-weight: 500;
  opacity: 0.75;
  margin-bottom: 6px;
`;

const AssociateWalletName = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  margin-left: 10px;
  color: #9ba3ae;
`;

const AddressRow = styled(Row)`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 10px;
`;

const AccountLabel = styled(BaseText)`
  font-size: 16px;
`;

const AssociatedAccountSelectionModalContainer = styled(SheetContainer)`
  padding: 15px;
  min-height: 200px;
`;

const schema = yup.object().shape({
  walletName: yup.string().required('Wallet name is required').trim(),
});

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
`;

const OptionTitle = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const RowContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 18px;
`;

const WalletAdvancedOptionsContainer = styled(AdvancedOptionsContainer)`
  margin-top: 20px;
`;

const VerticalPadding = styled.View`
  padding: ${ScreenGutter} 0;
`;

export const AddPillContainer = styled(View)`
  background-color: ${({theme: {dark}}) => (dark ? SlateDark : NeutralSlate)};
  flex-direction: row;
  border-radius: 40px;
  align-items: center;
  justify-content: center;
  padding: 0 11px;
  height: 100%;
  max-width: 200px;
`;

const isWithinReceiveSettings = (parent: any): boolean => {
  return parent
    ?.getState()
    .routes.some(
      (r: any) => r.params?.screen === BitpayIdScreens.RECEIVE_SETTINGS,
    );
};

const AddWallet = ({
  route,
  navigation,
}: NativeStackScreenProps<WalletGroupParamList, WalletScreens.ADD_WALLET>) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const {
    currencyAbbreviation: _currencyAbbreviation,
    currencyName: _currencyName,
    chain: _chain,
    tokenAddress: _tokenAddress,
    key,
    isToken,
    isCustomToken,
  } = route.params;
  // temporary until advanced settings is finished
  const [showOptions, setShowOptions] = useState(false);
  const [loadingEVMWallets, setLoadingEVMWallets] = useState(false);
  const [isTestnet, setIsTestnet] = useState(false);
  const [isRegtest, setIsRegtest] = useState(false);
  const [singleAddress, setSingleAddress] = useState(false);
  const network = useAppSelector(({APP}) => APP.network);
  const [tokenAddress, setTokenAddress] = useState<string | undefined>(
    _tokenAddress,
  );
  const [currencyName, setCurrencyName] = useState(_currencyName);
  const [currencyAbbreviation, setCurrencyAbbreviation] = useState(
    _currencyAbbreviation,
  );
  const [chain, setChain] = useState(
    _chain || SupportedEvmCurrencyOptions[0].currencyAbbreviation,
  );
  const singleAddressCurrency =
    BitpaySupportedCoins[currencyAbbreviation?.toLowerCase() as string]
      ?.properties?.singleAddress;
  const nativeSegwitCurrency = IsSegwitCoin(_currencyAbbreviation);
  const taprootCurrency = IsTaprootCoin(_currencyAbbreviation);
  const [useNativeSegwit, setUseNativeSegwit] = useState(nativeSegwitCurrency);
  const [segwitVersion, setSegwitVersion] = useState(0);
  const [evmWallets, setEvmWallets] = useState<Wallet[] | undefined>();
  const [accountsInfo, setAccountsInfo] = useState<
    {receiveAddress: string; accountNumber: number}[]
  >([]);
  const [associatedWallet, setAssociatedWallet] = useState<
    Wallet | undefined
  >();

  const DESCRIPTIONS: Record<string, string> = {
    eth: t('TokensOnEthereumNetworkDescription'),
    matic: t('TokensOnPolygonNetworkDescription'),
    arb: t('TokensOnArbNetworkDescription'),
    base: t('TokensOnBaseNetworkDescription'),
    op: t('TokensOnOpNetworkDescription'),
  };

  const [
    showAssociatedAccountSelectionDropdown,
    setShowAssociatedAccountSelectionDropdown,
  ] = useState<boolean | undefined>(false);

  const [associatedAccountModalVisible, setAssociatedAccountModalVisible] =
    useState(false);

  const [showChainSelectionDropdown] = useState<boolean | undefined>(!!_chain);

  const [chainModalVisible, setChainModalVisible] = useState(false);

  const withinReceiveSettings = isWithinReceiveSettings(navigation.getParent());

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => {
        return (
          <HeaderTitle>
            {isCustomToken
              ? t('Add Custom Token')
              : isToken
              ? t('Add Token', {
                  currencyAbbreviation: currencyAbbreviation?.toUpperCase(),
                })
              : t('AddWallet', {
                  currencyAbbreviation: currencyAbbreviation?.toUpperCase(),
                })}
          </HeaderTitle>
        );
      },
    });
  }, [navigation, t]);

  const toggleUseNativeSegwit = () => {
    setUseNativeSegwit(!(useNativeSegwit && segwitVersion === 0));
    setSegwitVersion(0);
  };

  const toggleUseTaproot = () => {
    setUseNativeSegwit(!(useNativeSegwit && segwitVersion === 1));
    setSegwitVersion(1);
  };

  const addAssociatedWallet = async () => {
    try {
      const evmCoinOption = SupportedCoinsOptions.find(
        ({chain: _chain}) => _chain === chain,
      );
      const _associatedWallet = await _addWallet({
        _currencyAbbreviation: evmCoinOption?.currencyAbbreviation,
        walletName: evmCoinOption?.currencyName,
      });
      setAssociatedWallet(_associatedWallet);
      _setEvmWallets(chain);
      dispatch(dismissOnGoingProcessModal());
    } catch (err: any) {
      dispatch(LogActions.error(JSON.stringify(err)));
    }
  };

  const showMissingWalletMsg = async (chain: string) => {
    await sleep(500);
    dispatch(
      showBottomNotificationModal({
        type: 'info',
        title: t('Missing wallet'),
        message: DESCRIPTIONS[chain],
        actions: [
          {
            primary: true,
            action: async () => {
              dispatch(dismissBottomNotificationModal());
              await sleep(500);
              addAssociatedWallet();
            },
            text: t('Create Wallet'),
          },
          {
            primary: false,
            action: () => {
              dispatch(dismissBottomNotificationModal());
            },
            text: t('Cancel'),
          },
        ],
        enableBackdropDismiss: true,
      }),
    );
  };

  const _setEvmWallets = async (chain: string) => {
    if (!SUPPORTED_EVM_COINS.includes(chain)) {
      return;
    }
    if (isCustomToken) {
      setTokenAddress(undefined);
      setCurrencyName(undefined);
    }

    // Extract rootPaths from wallets
    const rootPaths = key.wallets.map(
      wallet => `${wallet.credentials.rootPath}:${wallet.chain}`,
    );

    const extractAccountIndex = (rootPath: string) => {
      const match = rootPath.match(/m\/44'\/60'\/(\d+)'/);
      return match ? parseInt(match[1], 10) : null;
    };

    const doesAccountIndexExistForChain = (index: number, chain: string) => {
      return rootPaths.some(path => {
        const [pathRoot, pathChain] = path.split(':');
        const accountIndex = extractAccountIndex(pathRoot);
        return accountIndex === index && pathChain === chain;
      });
    };

    // Display associated wallets under the following conditions:
    // 1. The wallet is part of a Layer 2 chain and no other wallet from the specified Layer 2 chain exists for the account.
    // 2. The wallet is an ERC20 token.
    const IS_TOKEN_CREATION = isToken;
    const isWalletSupported = (wallet: Wallet): boolean => {
      // Check if the wallet is an ERC token, tokens are not associated wallets
      const _isToken = IsERCToken(wallet.currencyAbbreviation, wallet.chain);
      if (_isToken) {
        return false;
      }

      // Ensure the wallet is on a supported EVM chain
      const isSupportedChain = SUPPORTED_EVM_COINS.includes(wallet.chain);
      if (!isSupportedChain) {
        return false;
      }

      // For token creation, wallet must be on the same chain
      const isSameChain = wallet.chain === chain;
      if (isSameChain && IS_TOKEN_CREATION) {
        return true;
      } else if (IS_TOKEN_CREATION) {
        return false;
      }

      const accountIndex = extractAccountIndex(wallet.credentials.rootPath);

      // Check if the account index exists for the same chain or other chains
      if (accountIndex !== null) {
        // add the chain that is being created to the array
        const alreadyCreatedEVMCoins = [
          ...new Set([chain].concat(key.wallets.map(w => w.chain))),
        ];
        const accountExistsForAllOtherChains = alreadyCreatedEVMCoins.every(
          supportedChain =>
            doesAccountIndexExistForChain(accountIndex, supportedChain),
        );

        const accountIsAlreadyCreated = doesAccountIndexExistForChain(
          accountIndex,
          chain,
        );

        if (accountExistsForAllOtherChains || accountIsAlreadyCreated) {
          return false;
        }
      }

      return !isSameChain;
    };

    const _evmWallets = key.wallets.filter(isWalletSupported);
    if (!_evmWallets?.length && isToken) {
      showMissingWalletMsg(chain);
      return;
    }
    setLoadingEVMWallets(true);
    // workaround for fixing wallets without receive address
    await fixWalletAddresses({
      appDispatch: dispatch,
      wallets: _evmWallets,
    });
    const _accountsInfo = _evmWallets.map(wallet => {
      return {
        receiveAddress: wallet.receiveAddress,
        accountNumber: wallet.credentials.account,
      };
    }) as {receiveAddress: string; accountNumber: number}[];
    const uniqueAccountsInfo = _accountsInfo
      .filter(account => account.receiveAddress !== undefined)
      .filter(
        (account, index, self) =>
          index ===
          self.findIndex(a => a.receiveAddress === account.receiveAddress),
      );
    setEvmWallets(_evmWallets);
    setAccountsInfo(uniqueAccountsInfo);
    setAssociatedWallet(_evmWallets[0]);
    setShowAssociatedAccountSelectionDropdown(uniqueAccountsInfo.length > 0);
    setLoadingEVMWallets(false);
  };

  useEffect(() => {
    _setEvmWallets(chain);
  }, []);

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<{walletName: string}>({resolver: yupResolver(schema)});

  const _addWallet = async ({
    _associatedWallet,
    walletName,
    _isToken,
    _currencyAbbreviation,
    _tokenAddress,
  }: {
    _associatedWallet?: Wallet;
    walletName?: string;
    _isToken?: boolean;
    _currencyAbbreviation?: string;
    _tokenAddress?: string;
  }): Promise<Wallet> => {
    return new Promise(async (resolve, reject) => {
      try {
        let password: string | undefined;
        let account: number | undefined;
        let customAccount = false;

        if (key.isPrivKeyEncrypted) {
          password = await dispatch(getDecryptPassword(key));
        }

        if (_associatedWallet) {
          _currencyAbbreviation = currencyAbbreviation!;
          account = getAccount(_associatedWallet.credentials.rootPath);
          customAccount = true;
        }
        dispatch(
          Analytics.track('Created Basic Wallet', {
            coin: _currencyAbbreviation!.toLowerCase(),
            isErc20Token: !!isToken,
          }),
        );
        dispatch(startOnGoingProcessModal('ADDING_WALLET'));
        // adds wallet and binds to key obj - creates eth wallet if needed
        const wallet = await dispatch(
          addWallet({
            key,
            associatedWallet: _associatedWallet,
            currency: {
              chain,
              currencyAbbreviation: _currencyAbbreviation!,
              isToken: _isToken,
              tokenAddress: _tokenAddress,
            },
            options: {
              password,
              network: isTestnet
                ? Network.testnet
                : isRegtest
                ? Network.regtest
                : network,
              useNativeSegwit,
              segwitVersion,
              singleAddress,
              walletName,
              ...(account !== undefined && {
                account,
                customAccount,
              }),
            },
          }),
        );

        if (!wallet.receiveAddress) {
          const walletAddress = (await dispatch<any>(
            createWalletAddress({wallet, newAddress: true}),
          )) as string;
          dispatch(LogActions.info(`new address generated: ${walletAddress}`));
        }

        try {
          // new wallet might have funds
          await dispatch(startGetRates({force: true}));
          await dispatch(startUpdateAllWalletStatusForKey({key, force: true}));
          await sleep(1000);
          dispatch(updatePortfolioBalance());
        } catch (error) {
          // ignore error
        }

        dispatch(dismissOnGoingProcessModal());
        resolve(wallet);
      } catch (err: any) {
        if (err.message === 'invalid password') {
          dispatch(showBottomNotificationModal(WrongPasswordError()));
        } else {
          dispatch(dismissOnGoingProcessModal());
          await sleep(500);
          showErrorModal(BWCErrorMessage(err));
          reject(err);
        }
      }
    });
  };

  const add = handleSubmit(async ({walletName}) => {
    try {
      let _currencyAbbreviation: string | undefined;
      let _associatedWallet: Wallet | undefined;
      if (associatedWallet) {
        _associatedWallet = evmWallets?.find(
          wallet => wallet.id === associatedWallet?.id,
        );

        if (_associatedWallet?.tokens && isToken) {
          // check tokens within associated wallet and see if token already exist
          const {tokens} = _associatedWallet;

          for (const token of tokens) {
            if (
              key?.wallets
                .find(wallet => wallet.id === token)
                ?.tokenAddress?.toLowerCase() === tokenAddress
            ) {
              dispatch(
                showBottomNotificationModal({
                  type: 'warning',
                  title: t('Currency already added'),
                  message: t(
                    'This currency is already associated with the selected wallet',
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
          }
        }
      } else {
        _currencyAbbreviation = SupportedCurrencyOptions.find(
          currencyOpts =>
            currencyOpts.chain === chain &&
            currencyOpts.currencyAbbreviation === currencyAbbreviation,
        )?.currencyAbbreviation!;
      }

      const wallet = await _addWallet({
        _associatedWallet,
        _isToken: isToken,
        _tokenAddress: tokenAddress,
        walletName,
        _currencyAbbreviation,
      });

      if (!withinReceiveSettings) {
        navigation.dispatch(
          CommonActions.reset({
            index: 2,
            routes: [
              {
                name: RootStacks.TABS,
                params: {screen: getNavigationTabName()},
              },
              {
                name: WalletScreens.KEY_OVERVIEW,
                params: {
                  id: key.id,
                },
              },
              {
                name: WalletScreens.WALLET_DETAILS,
                params: {
                  walletId: wallet.id,
                  key,
                  skipInitializeHistory: false, // new wallet might have transactions
                },
              },
            ],
          }),
        );
      }
    } catch (err: any) {
      dispatch(LogActions.error(JSON.stringify(err)));
    }
  });

  const showErrorModal = (e: string) => {
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: t('Something went wrong'),
        message: e,
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
  };

  const renderAccounts = useCallback(
    ({item}) => (
      <AccountRow
        chain={chain}
        selected={item.receiveAddress === associatedWallet?.receiveAddress}
        account={item}
        onPress={() => {
          haptic('soft');
          const _associatedWallet = evmWallets?.find(
            wallet => wallet.receiveAddress === item.receiveAddress,
          );
          if (_associatedWallet) {
            setAssociatedWallet(_associatedWallet);
          }
          if (isCustomToken && !!tokenAddress) {
            setTokenAddress(undefined);
          }
          setAssociatedAccountModalVisible(false);
        }}
      />
    ),
    [evmWallets, associatedWallet, chain],
  );

  const renderChain = useCallback(
    ({item}) => (
      <ChainSelectionRow
        chainObj={BitpaySupportedCoins[item.chain]}
        onToggle={(currencyAbbreviation, chain) => {
          haptic('soft');
          setChain(
            SupportedEvmCurrencyOptions.find(evmOpts => evmOpts.chain === chain)
              ?.chain!,
          );
          _setEvmWallets(chain);
          setChainModalVisible(false);
        }}
        key={item.id}
      />
    ),
    [],
  );

  const setTokenInfo = async (tokenAddress: string | undefined) => {
    try {
      if (!tokenAddress) {
        return;
      }

      setTokenAddress(tokenAddress);
      const fullWalletObj = key.wallets.find(
        ({id}) => id === associatedWallet?.id,
      )!;
      const {network, currencyAbbreviation, chain} = fullWalletObj;
      const opts = {
        tokenAddress,
        chain,
      };
      const addrData = GetCoinAndNetwork(tokenAddress, network, chain);
      const isValid =
        addrData?.coin.toLowerCase() && network === addrData?.network;

      if (!isValid) {
        return;
      }

      const tokenContractInfo = await getTokenContractInfo(fullWalletObj, opts);
      let customToken: Token = {
        name: tokenContractInfo.name,
        symbol: tokenContractInfo.symbol?.toLowerCase(),
        decimals: Number(tokenContractInfo.decimals),
        address: tokenAddress?.toLowerCase(),
      };
      setCurrencyAbbreviation(tokenContractInfo.symbol);
      setCurrencyName(tokenContractInfo.name);
      dispatch(addCustomTokenOption(customToken, chain));
      Keyboard.dismiss();
    } catch (error) {
      Keyboard.dismiss();
      setTokenAddress(undefined);
      await sleep(200);
      const err = t(
        'Could not find any ERC20 contract attached to the provided address. Recheck the contract address and network of the associated wallet.',
      );
      showErrorModal(err);
    }
  };

  return (
    <CreateWalletContainer>
      <ScrollView>
        {currencyAbbreviation && currencyName ? (
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                placeholder={`${currencyAbbreviation} Wallet`}
                label={'WALLET NAME'}
                onBlur={onBlur}
                onChangeText={(text: string) => onChange(text)}
                error={errors.walletName?.message}
                value={value}
              />
            )}
            name="walletName"
            defaultValue={`${currencyName}`}
          />
        ) : null}

        {!showChainSelectionDropdown && (
          <AssociatedAccountContainer>
            <Label>{t('CHAIN')}</Label>
            <AssociatedWallet
              activeOpacity={ActiveOpacity}
              onPress={() => {
                setChainModalVisible(true);
              }}>
              <Row
                style={{alignItems: 'center', justifyContent: 'space-between'}}>
                <Row style={{alignItems: 'center'}}>
                  <CurrencyImage img={CurrencyListIcons[chain]} size={30} />
                  <AssociateWalletName>
                    {
                      SupportedEvmCurrencyOptions.find(
                        evmOpts => evmOpts.chain === chain,
                      )?.chainName
                    }
                  </AssociateWalletName>
                </Row>
                <Icons.DownToggle />
              </Row>
            </AssociatedWallet>
          </AssociatedAccountContainer>
        )}

        {loadingEVMWallets && (
          <SkeletonPlaceholder
            backgroundColor={theme.dark ? LightBlack : '#E1E9EE'}
            highlightColor={theme.dark ? '#333333' : '#F2F8FC'}>
            <SkeletonPlaceholder.Item
              flexDirection={'row'}
              alignItems={'center'}
              justifyContent={'space-between'}
              height={110}>
              <SkeletonPlaceholder.Item
                width="100%"
                height={30}
                borderRadius={4}
                marginRight={10}
              />
            </SkeletonPlaceholder.Item>
          </SkeletonPlaceholder>
        )}

        {showAssociatedAccountSelectionDropdown &&
        associatedWallet &&
        associatedWallet.receiveAddress &&
        !loadingEVMWallets ? (
          <AssociatedAccountContainer>
            <Label>{t('CHOOSE ACCOUNT')}</Label>
            <AssociatedAccount
              activeOpacity={ActiveOpacity}
              onPress={() => {
                setAssociatedAccountModalVisible(true);
              }}>
              <Row
                style={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <View>
                  <AccountLabel>
                    {t('Account')} {associatedWallet.credentials.account}
                  </AccountLabel>
                </View>

                <View>
                  <AddressRow>
                    <SendToPillContainer style={{marginRight: 10}}>
                      <AddPillContainer>
                        <CurrencyImage
                          img={CurrencyListIcons[chain]}
                          size={20}
                        />
                        <PillText accent={'action'}>
                          {formatCryptoAddress(associatedWallet.receiveAddress)}
                        </PillText>
                      </AddPillContainer>
                    </SendToPillContainer>
                    <Icons.DownToggle />
                  </AddressRow>
                </View>
              </Row>
            </AssociatedAccount>
          </AssociatedAccountContainer>
        ) : null}

        {isCustomToken ? (
          <View style={{marginTop: 20}}>
            <BoxInput
              placeholder={t('Token Address')}
              disabled={!associatedWallet}
              label={t('CUSTOM TOKEN CONTRACT')}
              onChangeText={(text: string) => {
                setTokenInfo(text);
              }}
              error={errors.walletName?.message}
              value={tokenAddress}
            />
          </View>
        ) : null}

        {!isToken && (
          <WalletAdvancedOptionsContainer>
            <AdvancedOptionsButton
              onPress={() => {
                Haptic('impactLight');
                setShowOptions(!showOptions);
              }}>
              {showOptions ? (
                <>
                  <AdvancedOptionsButtonText>
                    {t('Hide Advanced Options')}
                  </AdvancedOptionsButtonText>
                  <ChevronUpSvg />
                </>
              ) : (
                <>
                  <AdvancedOptionsButtonText>
                    {t('Show Advanced Options')}
                  </AdvancedOptionsButtonText>
                  <ChevronDownSvg />
                </>
              )}
            </AdvancedOptionsButton>

            {showOptions && nativeSegwitCurrency && (
              <AdvancedOptions>
                <RowContainer onPress={() => toggleUseNativeSegwit()}>
                  <Column>
                    <OptionTitle>Segwit</OptionTitle>
                  </Column>
                  <CheckBoxContainer>
                    <Checkbox
                      checked={useNativeSegwit && segwitVersion === 0}
                      onPress={() => toggleUseNativeSegwit()}
                    />
                  </CheckBoxContainer>
                </RowContainer>
              </AdvancedOptions>
            )}

            {showOptions && taprootCurrency && (
              <AdvancedOptions>
                <RowContainer onPress={() => toggleUseTaproot()}>
                  <Column>
                    <OptionTitle>Taproot</OptionTitle>
                  </Column>
                  <CheckBoxContainer>
                    <Checkbox
                      checked={useNativeSegwit && segwitVersion === 1}
                      onPress={() => toggleUseTaproot()}
                    />
                  </CheckBoxContainer>
                </RowContainer>
              </AdvancedOptions>
            )}

            {showOptions && (
              <AdvancedOptions>
                <RowContainer
                  activeOpacity={1}
                  onPress={() => {
                    setIsTestnet(!isTestnet);
                    setIsRegtest(false);
                  }}
                  onLongPress={() => {
                    setIsTestnet(false);
                    setIsRegtest(!isRegtest);
                  }}>
                  <Column>
                    <OptionTitle>
                      {getProtocolName(
                        chain || '',
                        isRegtest ? 'regtest' : 'testnet',
                      )}
                    </OptionTitle>
                  </Column>
                  <CheckBoxContainer>
                    <Checkbox
                      checked={isTestnet || isRegtest}
                      onPress={() => {
                        setIsTestnet(!isTestnet);
                        setIsRegtest(false);
                      }}
                    />
                  </CheckBoxContainer>
                </RowContainer>
              </AdvancedOptions>
            )}

            {showOptions && !singleAddressCurrency && (
              <AdvancedOptions>
                <RowContainer
                  activeOpacity={1}
                  onPress={() => {
                    setSingleAddress(!singleAddress);
                  }}>
                  <Column>
                    <OptionTitle>Single Address</OptionTitle>
                  </Column>
                  <CheckBoxContainer>
                    <Checkbox
                      checked={singleAddress}
                      onPress={() => {
                        setSingleAddress(!singleAddress);
                      }}
                    />
                  </CheckBoxContainer>
                </RowContainer>

                {singleAddress && (
                  <>
                    <Info style={{marginHorizontal: 10}}>
                      <InfoTriangle />

                      <InfoHeader>
                        <InfoImageContainer infoMargin={'0 8px 0 0'}>
                          <InfoSvg />
                        </InfoImageContainer>

                        <InfoTitle>Single Address Wallet</InfoTitle>
                      </InfoHeader>
                      <InfoDescription>
                        The single address feature will force the wallet to only
                        use one address rather than generating new addresses.
                      </InfoDescription>

                      <VerticalPadding>
                        <TouchableOpacity
                          onPress={() => {
                            Haptic('impactLight');
                            dispatch(
                              openUrlWithInAppBrowser(URL.HELP_SINGLE_ADDRESS),
                            );
                          }}>
                          <Link>Learn More</Link>
                        </TouchableOpacity>
                      </VerticalPadding>
                    </Info>
                  </>
                )}
              </AdvancedOptions>
            )}
          </WalletAdvancedOptionsContainer>
        )}

        <SheetModal
          isVisible={associatedAccountModalVisible}
          onBackdropPress={() => setAssociatedAccountModalVisible(false)}>
          <AssociatedAccountSelectionModalContainer>
            <TextAlign align={'center'}>
              <H4>{t('Choose Account')}</H4>
            </TextAlign>
            <FlatList
              contentContainerStyle={{paddingTop: 20, paddingBottom: 20}}
              data={accountsInfo}
              keyExtractor={item => item.receiveAddress}
              renderItem={renderAccounts}
            />
          </AssociatedAccountSelectionModalContainer>
        </SheetModal>

        <SheetModal
          isVisible={chainModalVisible}
          onBackdropPress={() => setChainModalVisible(false)}>
          <AssociatedAccountSelectionModalContainer>
            <TextAlign align={'center'}>
              <H4>{t('Select a Chain')}</H4>
            </TextAlign>
            <FlatList
              contentContainerStyle={{paddingTop: 20, paddingBottom: 20}}
              data={SupportedEvmCurrencyOptions}
              keyExtractor={keyExtractor}
              renderItem={renderChain}
            />
          </AssociatedAccountSelectionModalContainer>
        </SheetModal>

        <ButtonContainer>
          <Button
            disabled={
              !currencyAbbreviation ||
              !currencyName ||
              (!associatedWallet && isToken) ||
              loadingEVMWallets
            }
            onPress={add}
            buttonStyle={'primary'}>
            {t('Add ') +
              (isCustomToken
                ? t('Custom Token')
                : isToken
                ? t('Token')
                : t('Wallet'))}
          </Button>
        </ButtonContainer>
      </ScrollView>
    </CreateWalletContainer>
  );
};

export default AddWallet;
