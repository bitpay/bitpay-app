import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {
  BaseText,
  H4,
  HeaderTitle,
  TextAlign,
  Badge,
} from '../../../components/styled/Text';
import styled from 'styled-components/native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {
  ActiveOpacity,
  SheetContainer,
  Row,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {Key, Token, Wallet} from '../../../store/wallet/wallet.models';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {
  addWallet,
  getDecryptPassword,
  startGetRates,
} from '../../../store/wallet/effects';
import {Controller, useForm, useWatch} from 'react-hook-form';
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
  SupportedCurrencyOption,
  SupportedEvmCurrencyOptions,
  SupportedSvmCurrencyOptions,
} from '../../../constants/SupportedCurrencyOptions';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {FlatList, Keyboard, View} from 'react-native';
import {
  formatCryptoAddress,
  getAccount,
  getCurrencyAbbreviation,
  keyExtractor,
  sleep,
} from '../../../utils/helper-methods';
import haptic from '../../../components/haptic-feedback/haptic';
import Icons from '../components/WalletIcons';
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
import {BitpaySupportedCoins} from '../../../constants/currencies';
import {useTranslation} from 'react-i18next';
import {BitpayIdScreens} from '../../bitpay-id/BitpayIdGroup';
import {IsERCToken, IsSVMChain} from '../../../store/wallet/utils/currency';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {LogActions} from '../../../store/log';
import {CommonActions} from '@react-navigation/native';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {RootStacks, getNavigationTabName} from '../../../Root';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {SendToPillContainer} from './send/confirm/Shared';
import {PillText} from '../components/SendToPill';
import {ChainSelectionRow} from '../../../components/list/ChainSelectionRow';
import {RootState} from '../../../store';
import {BitpaySupportedTokenOptsByAddress} from '../../../constants/tokens';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import cloneDeep from 'lodash.clonedeep';

export type AddCustomTokenParamList = {
  key: Key;
  selectedAccountAddress: string;
  selectedChain: string;
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

const AssociatedWallet = styled(TouchableOpacity)`
  padding: 0 20px;
  height: 55px;
  border: 0.75px solid ${({theme}) => (theme.dark ? LuckySevens : Slate)};
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
`;

const AssociatedAccountNoTouchable = styled.View`
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
  margin-left: 10px;
  font-size: 16px;
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

const BadgeContainer = styled.View`
  align-items: flex-start;
`;

const isWithinReceiveSettings = (parent: any): boolean => {
  return parent
    ?.getState()
    .routes.some(
      (r: any) => r.params?.screen === BitpayIdScreens.RECEIVE_SETTINGS,
    );
};

const AddCustomToken = ({
  route,
  navigation,
}: NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.ADD_CUSTOM_TOKEN
>) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {key: _key, selectedAccountAddress, selectedChain} = route.params;

  const tokenOptionsByAddress = useAppSelector(({WALLET}: RootState) => {
    return {
      ...BitpaySupportedTokenOptsByAddress,
      ...WALLET.tokenOptionsByAddress,
      ...WALLET.customTokenOptionsByAddress,
    };
  }) as {[key in string]: Token};
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const key = keys[_key.id];
  const [isTestnet, setIsTestnet] = useState(false);
  const [isRegtest, setIsRegtest] = useState(false);
  const network = useAppSelector(({APP}) => APP.network);
  const [chain, setChain] = useState(selectedChain);
  const SupportedChainCurrencyOptions = IsSVMChain(selectedChain)
    ? SupportedSvmCurrencyOptions
    : SupportedEvmCurrencyOptions;
  const [associatedWallet, setAssociatedWallet] = useState<
    Wallet | undefined
  >();
  const [tokenAddress, setTokenAddress] = useState<string | undefined>();
  const [currencyName, setCurrencyName] = useState<string | undefined>();
  const [currencyAbbreviation, setCurrencyAbbreviation] = useState<
    string | undefined
  >();
  const [invalidTokenAddress, setInvalidTokenAddress] =
    useState<boolean>(false);

  const DESCRIPTIONS: Record<string, string> = {
    eth: t('TokensOnEthereumNetworkDescription'),
    sol: t('TokensOnSolanaNetworkDescription'),
    matic: t('TokensOnPolygonNetworkDescription'),
    arb: t('TokensOnArbNetworkDescription'),
    base: t('TokensOnBaseNetworkDescription'),
    op: t('TokensOnOpNetworkDescription'),
  };

  useEffect(() => {
    const _associatedWallet = key.wallets.find(
      ({chain: _chain, currencyAbbreviation, receiveAddress}) =>
        _chain === chain &&
        !IsERCToken(currencyAbbreviation, _chain) &&
        receiveAddress === selectedAccountAddress,
    );
    setAssociatedWallet(_associatedWallet);
  }, [chain]);

  const [chainModalVisible, setChainModalVisible] = useState(false);
  const withinReceiveSettings = isWithinReceiveSettings(navigation.getParent());

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => {
        return <HeaderTitle>{t('Add Custom Token')}</HeaderTitle>;
      },
    });
  }, [navigation, t]);

  const {
    control,
    handleSubmit,
    formState: {errors},
    reset,
  } = useForm<{walletName: string}>({
    resolver: yupResolver(schema),
    defaultValues: {
      walletName: currencyName,
    },
  });

  const walletNameValue = useWatch({
    control,
    name: 'walletName',
  });

  useEffect(() => {
    if (currencyName) {
      reset({walletName: currencyName});
    }
  }, [currencyName]);

  const _addWallet = async (): Promise<Wallet> => {
    return new Promise(async (resolve, reject) => {
      try {
        let password: string | undefined;
        let account: number | undefined = getAccount(
          associatedWallet!.credentials.rootPath,
        );

        if (key.isPrivKeyEncrypted) {
          password = await dispatch(getDecryptPassword(key));
        }

        dispatch(
          Analytics.track('Created Basic Wallet', {
            coin: currencyAbbreviation!.toLowerCase(),
            isErc20Token: true,
          }),
        );
        dispatch(startOnGoingProcessModal('ADDING_WALLET'));

        const wallet = await dispatch(
          addWallet({
            key,
            associatedWallet,
            currency: {
              chain,
              currencyAbbreviation: currencyAbbreviation!,
              isToken: true,
              tokenAddress,
            },
            options: {
              password,
              network: isTestnet
                ? Network.testnet
                : isRegtest
                ? Network.regtest
                : network,
              walletName: walletNameValue,
              ...(account !== undefined && {
                account,
                customAccount: true,
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

  const add = handleSubmit(async () => {
    try {
      if (associatedWallet?.tokens) {
        // check tokens within associated wallet and see if token already exist
        const {tokens} = associatedWallet;

        const _tokenAddress = cloneDeep(tokenAddress); // Necessary to avoid saving tokenAddress in lowercase

        for (const token of tokens) {
          if (
            key?.wallets
              .find(wallet => wallet.id === token)
              ?.tokenAddress?.toLowerCase() === _tokenAddress?.toLowerCase()
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
      const wallet = await _addWallet();
      if (!withinReceiveSettings) {
        navigation.dispatch(
          CommonActions.reset({
            index: 3,
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
                name: WalletScreens.ACCOUNT_DETAILS,
                params: {
                  keyId: key.id,
                  selectedAccountAddress,
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

  const showMissingWalletMsg = async (chain: string) => {
    await sleep(500);
    dispatch(
      showBottomNotificationModal({
        type: 'info',
        title: t('Missing wallet'),
        message: DESCRIPTIONS[chain],
        actions: [
          {
            text: t('OK'),
            action: () => {},
            primary: true,
          },
        ],
        enableBackdropDismiss: true,
      }),
    );
  };

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

  const renderChain = useCallback(
    ({item}: {item: SupportedCurrencyOption}) => (
      <ChainSelectionRow
        chainObj={BitpaySupportedCoins[item.chain]}
        onToggle={async (currencyAbbreviation, chain) => {
          haptic('soft');
          setChainModalVisible(false);
          await sleep(1000);
          const hasAssociatedWallet = key.wallets.find(
            ({chain: _chain}) => _chain === chain,
          );
          if (!hasAssociatedWallet) {
            showMissingWalletMsg(chain);
          } else {
            setChain(chain);
          }
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
      const addrData = GetCoinAndNetwork(tokenAddress, network, chain);
      const isValid =
        addrData?.coin.toLowerCase() && network === addrData?.network;

      if (!isValid) {
        setInvalidTokenAddress(true);
        return;
      }
      setInvalidTokenAddress(false);

      let tokenContractInfo =
        tokenOptionsByAddress?.[getCurrencyAbbreviation(tokenAddress, chain)];
      if (!tokenContractInfo) {
        dispatch(
          LogActions.debug(
            'contract info not present in token options - consulting bws',
          ),
        );
        const fullWalletObj = key.wallets.find(
          ({id}) => id === associatedWallet?.id,
        )!;
        tokenContractInfo = await getTokenContractInfo(fullWalletObj, {
          tokenAddress,
          chain,
        });
        let customToken: Token = {
          name: tokenContractInfo.name,
          symbol: tokenContractInfo.symbol?.toLowerCase(),
          decimals: Number(tokenContractInfo.decimals),
          address: IsSVMChain(chain)
            ? tokenAddress
            : tokenAddress?.toLowerCase(), // Solana addresses are case sensitive
        };
        dispatch(addCustomTokenOption(customToken, chain));
      }
      setCurrencyAbbreviation(tokenContractInfo.symbol);
      setCurrencyName(tokenContractInfo.name);
      Keyboard.dismiss();
    } catch (error) {
      Keyboard.dismiss();
      setTokenAddress(undefined);
      await sleep(200);
      const err = IsSVMChain(chain)
        ? t(
            'Could not find any SPL contract attached to the provided address. Recheck the contract address and network of the associated wallet.',
          )
        : t(
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
                placeholder={`${currencyAbbreviation.toUpperCase()} Wallet`}
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
                    SupportedChainCurrencyOptions.find(
                      opts => opts.chain === chain,
                    )?.chainName
                  }
                </AssociateWalletName>
              </Row>
              <Icons.DownToggle />
            </Row>
          </AssociatedWallet>
        </AssociatedAccountContainer>

        {associatedWallet && associatedWallet.receiveAddress ? (
          <AssociatedAccountContainer>
            <Label>{t('ACCOUNT')}</Label>
            <AssociatedAccountNoTouchable>
              <Row
                style={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <View>
                  <AccountLabel>
                    {t('Account')} {associatedWallet.credentials.account}
                  </AccountLabel>
                  {associatedWallet.network !== 'livenet' && (
                    <BadgeContainer>
                      <Badge>{associatedWallet.network}</Badge>
                    </BadgeContainer>
                  )}
                </View>

                <View>
                  <AddressRow>
                    <SendToPillContainer>
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
                  </AddressRow>
                </View>
              </Row>
            </AssociatedAccountNoTouchable>
          </AssociatedAccountContainer>
        ) : null}

        <View style={{marginTop: 20}}>
          <BoxInput
            placeholder={t('Token Address')}
            disabled={!associatedWallet}
            label={t('TOKEN CONTRACT ADDRESS')}
            onChangeText={(text: string) => {
              setTokenInfo(text);
            }}
            error={errors.walletName?.message || invalidTokenAddress}
            value={tokenAddress}
          />
        </View>

        <SheetModal
          isVisible={chainModalVisible}
          onBackdropPress={() => setChainModalVisible(false)}>
          <AssociatedAccountSelectionModalContainer>
            <TextAlign align={'center'}>
              <H4>{t('Select a Chain')}</H4>
            </TextAlign>
            <FlatList
              contentContainerStyle={{paddingTop: 20, paddingBottom: 20}}
              data={SupportedChainCurrencyOptions}
              keyExtractor={keyExtractor}
              renderItem={renderChain}
            />
          </AssociatedAccountSelectionModalContainer>
        </SheetModal>

        <ButtonContainer>
          <Button
            accessibilityLabel="add-custom-token-button"
            disabled={!walletNameValue || invalidTokenAddress}
            onPress={add}
            buttonStyle={'primary'}>
            {t('Add Custom Token')}
          </Button>
        </ButtonContainer>
      </ScrollView>
    </CreateWalletContainer>
  );
};

export default AddCustomToken;
