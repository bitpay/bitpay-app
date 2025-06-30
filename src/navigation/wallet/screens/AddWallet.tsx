import React, {useLayoutEffect, useState} from 'react';
import {
  BaseText,
  HeaderTitle,
  InfoDescription,
  InfoHeader,
  InfoTitle,
  Link,
} from '../../../components/styled/Text';
import styled from 'styled-components/native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {
  AdvancedOptionsButton,
  AdvancedOptionsButtonText,
  AdvancedOptionsContainer,
  AdvancedOptions,
  Column,
  ScreenGutter,
  Info,
  InfoTriangle,
  InfoImageContainer,
} from '../../../components/styled/Containers';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import {
  openUrlWithInAppBrowser,
  startOnGoingProcessModal,
} from '../../../store/app/app.effects';
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
import {NeutralSlate, SlateDark, White} from '../../../styles/colors';
import {View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {getProtocolName, sleep} from '../../../utils/helper-methods';
import Haptic from '../../../components/haptic-feedback/haptic';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import Checkbox from '../../../components/checkbox/Checkbox';
import {Network} from '../../../constants';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {WrongPasswordError} from '../components/ErrorMessages';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {BitpaySupportedCoins} from '../../../constants/currencies';
import InfoSvg from '../../../../assets/img/info.svg';
import {URL} from '../../../constants';
import {useTranslation} from 'react-i18next';
import {BitpayIdScreens} from '../../bitpay-id/BitpayIdGroup';
import {
  IsSegwitCoin,
  IsTaprootCoin,
  IsUtxoChain,
} from '../../../store/wallet/utils/currency';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {LogActions} from '../../../store/log';
import {CommonActions, useTheme} from '@react-navigation/native';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {RootStacks, getNavigationTabName} from '../../../Root';
import {BWCErrorMessage} from '../../../constants/BWCError';

export type AddWalletParamList = {
  key: Key;
  currencyAbbreviation: string;
  currencyName: string;
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

const RowContainer = styled(TouchableOpacity)`
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
  const dispatch = useAppDispatch();
  const {currencyAbbreviation, currencyName, key: _key} = route.params;
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const key = keys[_key.id];
  const filteredWallets = key.wallets.filter(
    ({currencyAbbreviation: c}) => currencyAbbreviation === c && IsUtxoChain(c),
  );
  let nextAccountNumber;
  if (filteredWallets.length > 0) {
    nextAccountNumber = (
      Math.max(...filteredWallets.map(wallet => wallet.credentials.account)) + 1
    ).toString();
  }
  // temporary until advanced settings is finished
  const [showOptions, setShowOptions] = useState(false);
  const [isTestnet, setIsTestnet] = useState(false);
  const [isRegtest, setIsRegtest] = useState(false);
  const [singleAddress, setSingleAddress] = useState(false);
  const network = useAppSelector(({APP}) => APP.network);
  const singleAddressCurrency =
    BitpaySupportedCoins[currencyAbbreviation?.toLowerCase() as string]
      ?.properties?.singleAddress;
  const nativeSegwitCurrency = IsSegwitCoin(currencyAbbreviation);
  const taprootCurrency = IsTaprootCoin(currencyAbbreviation);
  const [useNativeSegwit, setUseNativeSegwit] = useState(nativeSegwitCurrency);
  const [segwitVersion, setSegwitVersion] = useState(0);

  const withinReceiveSettings = isWithinReceiveSettings(navigation.getParent());

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => {
        return (
          <HeaderTitle>
            {t('AddWallet', {
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

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<{walletName: string}>({
    resolver: yupResolver(schema),
    defaultValues: {
      walletName: nextAccountNumber
        ? `${currencyName} (${nextAccountNumber})`
        : currencyName,
    },
  });

  const walletNameValue = useWatch({
    control,
    name: 'walletName',
  });

  const _addWallet = async ({
    walletName,
  }: {
    walletName: string;
  }): Promise<Wallet> => {
    return new Promise(async (resolve, reject) => {
      try {
        let password: string | undefined;
        let account: number | undefined;
        let customAccount = false;

        if (key.isPrivKeyEncrypted) {
          password = await dispatch(getDecryptPassword(key));
        }

        dispatch(
          Analytics.track('Created Basic Wallet', {
            coin: currencyAbbreviation!.toLowerCase(),
            isErc20Token: false,
          }),
        );
        dispatch(startOnGoingProcessModal('ADDING_WALLET'));
        // adds wallet and binds to key obj - creates eth wallet if needed
        const wallet = await dispatch(
          addWallet({
            key,
            currency: {
              chain: currencyAbbreviation,
              currencyAbbreviation: currencyAbbreviation!,
              isToken: false,
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
      const wallet = await _addWallet({walletName});

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
      const errstring =
        err instanceof Error
          ? err.message
          : err !== undefined
          ? JSON.stringify(err)
          : 'An unknown error occurred';

      dispatch(LogActions.debug(`Error adding wallet: ${errstring}`));
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
          />
        ) : null}

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
                      currencyAbbreviation || '',
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

        <ButtonContainer>
          <Button
            disabled={!walletNameValue}
            onPress={add}
            buttonStyle={'primary'}>
            {t('Add Wallet')}
          </Button>
        </ButtonContainer>
      </ScrollView>
    </CreateWalletContainer>
  );
};

export default AddWallet;
