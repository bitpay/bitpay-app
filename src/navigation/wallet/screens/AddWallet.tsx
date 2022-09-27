import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
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
import {StackScreenProps} from '@react-navigation/stack';
import {WalletStackParamList} from '../WalletStack';
import {Key, Token, Wallet} from '../../../store/wallet/wallet.models';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import {
  logSegmentEvent,
  openUrlWithInAppBrowser,
  startOnGoingProcessModal,
} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {addWallet, getDecryptPassword} from '../../../store/wallet/effects';
import {Controller, useForm} from 'react-hook-form';
import {yupResolver} from '@hookform/resolvers/yup';
import yup from '../../../lib/yup';
import {buildUIFormattedWallet} from './KeyOverview';
import {
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../styles/colors';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import WalletRow from '../../../components/list/WalletRow';
import {FlatList, Keyboard} from 'react-native';
import {keyExtractor, sleep} from '../../../utils/helper-methods';
import haptic from '../../../components/haptic-feedback/haptic';
import Haptic from '../../../components/haptic-feedback/haptic';
import Icons from '../components/WalletIcons';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import Checkbox from '../../../components/checkbox/Checkbox';
import {Network} from '../../../constants';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {WrongPasswordError} from '../components/ErrorMessages';
import {getTokenContractInfo} from '../../../store/wallet/effects/status/status';
import {GetCoinAndNetwork} from '../../../store/wallet/effects/address/address';
import {addCustomTokenOption} from '../../../store/wallet/effects/currencies/currencies';
import {BitpaySupportedCoins} from '../../../constants/currencies';
import {TouchableOpacity} from 'react-native-gesture-handler';
import InfoSvg from '../../../../assets/img/info.svg';
import {URL} from '../../../constants';
import {useTranslation} from 'react-i18next';

type AddWalletScreenProps = StackScreenProps<WalletStackParamList, 'AddWallet'>;

export type AddWalletParamList = {
  key: Key;
  chain?: string;
  currencyAbbreviation?: string;
  currencyName?: string;
  isToken?: boolean;
  isCustomToken?: boolean;
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

const AssociatedWalletContainer = styled.View`
  margin: 20px 0;
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

const Label = styled(BaseText)`
  font-size: 13px;
  padding: 2px 0;
  font-weight: 500;
  line-height: 18px;
  color: ${({theme}) => (theme && theme.dark ? theme.colors.text : '#434d5a')};
`;

const AssociateWalletName = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  margin-left: 10px;
  color: #9ba3ae;
`;

const AssociatedWalletSelectionModalContainer = styled(SheetContainer)`
  padding: 15px;
  min-height: 200px;
`;

const schema = yup.object().shape({
  walletName: yup.string(),
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

const AddWallet: React.FC<AddWalletScreenProps> = ({navigation, route}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {
    currencyAbbreviation: _currencyAbbreviation,
    currencyName: _currencyName,
    chain,
    key,
    isToken,
    isCustomToken,
  } = route.params;
  // temporary until advanced settings is finished
  const network = useAppSelector(({APP}) => APP.network);
  const [showOptions, setShowOptions] = useState(false);
  const [isTestnet, setIsTestnet] = useState(false);
  const [singleAddress, setSingleAddress] = useState(false);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const [customTokenAddress, setCustomTokenAddress] = useState<
    string | undefined
  >('');
  const [currencyName, setCurrencyName] = useState(_currencyName);
  const [currencyAbbreviation, setCurrencyAbbreviation] = useState(
    _currencyAbbreviation,
  );

  const singleAddressCurrency =
    BitpaySupportedCoins[_currencyAbbreviation?.toLowerCase() as string]
      ?.properties?.singleAddress;
  const nativeSegwitCurrency = _currencyAbbreviation
    ? ['btc', 'ltc'].includes(_currencyAbbreviation.toLowerCase())
    : false;

  const [useNativeSegwit, setUseNativeSegwit] = useState(nativeSegwitCurrency);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => {
        return (
          <HeaderTitle>
            {isCustomToken
              ? t('Add Custom Token')
              : isToken
              ? t('Add Token', {currencyAbbreviation})
              : t('AddWallet', {currencyAbbreviation})}
          </HeaderTitle>
        );
      },
    });
  }, [navigation, t]);

  // find all eth wallets for key
  const ethWallets = key.wallets.filter(
    wallet => wallet.currencyAbbreviation === 'eth',
  );

  // formatting for the bottom modal
  const UIFormattedEthWallets = useMemo(
    () =>
      ethWallets.map(wallet =>
        buildUIFormattedWallet(
          wallet,
          defaultAltCurrency.isoCode,
          rates,
          dispatch,
        ),
      ),
    [],
  );

  // associatedWallet
  const [associatedWallet, setAssociatedWallet] = useState(
    UIFormattedEthWallets[0],
  );

  const [
    showAssociatedWalletSelectionDropdown,
    setShowAssociatedWalletSelectionDropdown,
  ] = useState<boolean | undefined>(false);

  const [associatedWalletModalVisible, setAssociatedWalletModalVisible] =
    useState(false);

  const [showWalletAdvancedOptions, setShowWalletAdvancedOptions] =
    useState(true);

  useEffect(() => {
    setShowAssociatedWalletSelectionDropdown(ethWallets.length > 1 && isToken);
    if (isToken) {
      setShowWalletAdvancedOptions(false);
    }
  }, []);

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<{walletName: string}>({resolver: yupResolver(schema)});

  const add = handleSubmit(async ({walletName}) => {
    try {
      const currency = currencyAbbreviation!.toLowerCase();
      let _associatedWallet: Wallet | undefined;

      if (isToken) {
        _associatedWallet = ethWallets.find(
          wallet => wallet.id === associatedWallet.id,
        );

        if (_associatedWallet?.tokens) {
          // check tokens within associated wallet and see if token already exist
          const {tokens} = _associatedWallet;

          for (const token of tokens) {
            if (
              key?.wallets
                .find(wallet => wallet.id === token)
                ?.currencyAbbreviation.toLowerCase() === currency
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
      }

      let password: string | undefined;

      if (key.isPrivKeyEncrypted) {
        password = await dispatch(getDecryptPassword(key));
      }

      navigation.popToTop();

      await dispatch(
        startOnGoingProcessModal(
          // t('Adding Wallet')
          t(OnGoingProcessMessages.ADDING_WALLET),
        ),
      );

      dispatch(
        logSegmentEvent('track', 'Created Basic Wallet', {
          coin: currency,
          isErc20Token: !!isToken,
        }),
      );

      // adds wallet and binds to key obj - creates eth wallet if needed
      const wallet = await dispatch(
        addWallet({
          key,
          associatedWallet: _associatedWallet,
          currency: {
            chain: chain!,
            currencyAbbreviation: currencyAbbreviation!,
            isToken: isToken!,
          },
          options: {
            password,
            network: isTestnet ? Network.testnet : network,
            useNativeSegwit,
            singleAddress,
            walletName: walletName === currencyName ? undefined : walletName,
          },
        }),
      );

      navigation.navigate('WalletDetails', {
        walletId: wallet.id,
        key,
        skipInitializeHistory: true,
      });

      dispatch(dismissOnGoingProcessModal());
    } catch (err: any) {
      if (err.message === 'invalid password') {
        dispatch(showBottomNotificationModal(WrongPasswordError()));
      } else {
        dispatch(dismissOnGoingProcessModal());
        await sleep(500);
        showErrorModal(err.message);
      }
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

  const renderItem = useCallback(
    ({item}) => (
      <WalletRow
        id={item.id}
        onPress={() => {
          haptic('soft');
          setAssociatedWallet(item);
          if (isCustomToken && !!customTokenAddress) {
            setCustomTokenAddress(undefined);
          }
          setAssociatedWalletModalVisible(false);
        }}
        wallet={item}
      />
    ),
    [],
  );

  const setTokenInfo = async (tokenAddress: string | undefined) => {
    try {
      if (!tokenAddress) {
        return;
      }

      setCustomTokenAddress(tokenAddress);

      const opts = {
        tokenAddress,
      };
      const fullWalletObj = key.wallets.find(
        ({id}) => id === associatedWallet.id,
      )!;
      const {network, currencyAbbreviation} = fullWalletObj;
      const addrData = GetCoinAndNetwork(tokenAddress, network);
      const isValid =
        currencyAbbreviation.toLowerCase() === addrData?.coin.toLowerCase() &&
        addrData?.network === network;

      if (!isValid) {
        return;
      }

      const tokenContractInfo = await getTokenContractInfo(fullWalletObj, opts);
      let customToken: Token = {
        name: tokenContractInfo.name,
        symbol: tokenContractInfo.symbol,
        decimals: Number(tokenContractInfo.decimals),
        address: tokenAddress,
      };
      setCurrencyAbbreviation(tokenContractInfo.symbol);
      setCurrencyName(tokenContractInfo.name);
      dispatch(addCustomTokenOption(customToken));
      Keyboard.dismiss();
    } catch (error) {
      Keyboard.dismiss();
      setCustomTokenAddress(undefined);
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
                label={isToken ? 'TOKEN NAME' : 'WALLET NAME'}
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

        {showAssociatedWalletSelectionDropdown && (
          <AssociatedWalletContainer>
            <Label>{t('ASSOCIATED WALLET')}</Label>
            <AssociatedWallet
              activeOpacity={ActiveOpacity}
              onPress={() => {
                setAssociatedWalletModalVisible(true);
              }}>
              <Row
                style={{alignItems: 'center', justifyContent: 'space-between'}}>
                <Row style={{alignItems: 'center'}}>
                  <CurrencyImage img={CurrencyListIcons.eth} size={30} />
                  <AssociateWalletName>
                    {associatedWallet?.walletName ||
                      `${associatedWallet.currencyAbbreviation.toUpperCase()} Wallet`}
                  </AssociateWalletName>
                </Row>
                <Icons.DownToggle />
              </Row>
            </AssociatedWallet>
          </AssociatedWalletContainer>
        )}

        {isCustomToken ? (
          <BoxInput
            placeholder={t('Token Address')}
            label={t('CUSTOM TOKEN CONTRACT')}
            onChangeText={(text: string) => {
              setTokenInfo(text);
            }}
            error={errors.walletName?.message}
            value={customTokenAddress}
          />
        ) : null}

        {showWalletAdvancedOptions && (
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
                <RowContainer
                  onPress={() => {
                    setUseNativeSegwit(!useNativeSegwit);
                  }}>
                  <Column>
                    <OptionTitle>Segwit</OptionTitle>
                  </Column>
                  <CheckBoxContainer>
                    <Checkbox
                      checked={useNativeSegwit}
                      onPress={() => {
                        setUseNativeSegwit(!useNativeSegwit);
                      }}
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
                  }}>
                  <Column>
                    <OptionTitle>
                      {isToken || currencyAbbreviation === 'ETH'
                        ? 'Kovan'
                        : 'Testnet'}
                    </OptionTitle>
                  </Column>
                  <CheckBoxContainer>
                    <Checkbox
                      checked={isTestnet}
                      onPress={() => {
                        setIsTestnet(!isTestnet);
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
          isVisible={associatedWalletModalVisible}
          onBackdropPress={() => setAssociatedWalletModalVisible(false)}>
          <AssociatedWalletSelectionModalContainer>
            <TextAlign align={'center'}>
              <H4>{t('Select a Wallet')}</H4>
            </TextAlign>
            <FlatList
              contentContainerStyle={{paddingTop: 20, paddingBottom: 20}}
              data={UIFormattedEthWallets}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
            />
          </AssociatedWalletSelectionModalContainer>
        </SheetModal>

        <ButtonContainer>
          <Button
            disabled={!currencyAbbreviation || !currencyName}
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
