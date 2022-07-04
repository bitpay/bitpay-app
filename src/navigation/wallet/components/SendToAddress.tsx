import React, {useState} from 'react';
import {
  CtaContainer as _CtaContainer,
  SearchContainer,
  SearchInput,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import styled, {useTheme} from 'styled-components/native';
import {BaseText, Paragraph} from '../../../components/styled/Text';
import {Caution, NeutralSlate} from '../../../styles/colors';
import {useDispatch} from 'react-redux';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {
  logSegmentEvent,
  startOnGoingProcessModal,
} from '../../../store/app/app.effects';
import {Effect, RootState} from '../../../store';
import {useTranslation} from 'react-i18next';
import debounce from 'lodash.debounce';
import {
  CheckIfLegacyBCH,
  ValidateURI,
} from '../../../store/wallet/utils/validations';
import {TouchableOpacity, View} from 'react-native';
import haptic from '../../../components/haptic-feedback/haptic';
import ScanSvg from '../../../../assets/img/onboarding/scan.svg';
import {
  createWalletAddress,
  GetCoinAndNetwork,
  TranslateToBchCashAddress,
} from '../../../store/wallet/effects/address/address';
import {GetChain} from '../../../store/wallet/utils/currency';
import {APP_NAME_UPPERCASE} from '../../../constants/config';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {BchLegacyAddressInfo, Mismatch} from './ErrorMessages';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {Recipient} from '../../../store/wallet/wallet.models';
import KeyWalletsRow, {
  KeyWallet,
  KeyWalletsRowProps,
} from '../../../components/list/KeyWalletsRow';
import {BuildKeyWalletRow} from '../screens/send/SendTo';
import {useAppSelector} from '../../../utils/hooks';

const ValidDataTypes: string[] = [
  'BitcoinAddress',
  'BitcoinCashAddress',
  'DogecoinAddress',
  'LitecoinAddress',
];

const SendToAddressContainer = styled.View`
  margin-top: 20px;
  padding: 0 15px;
`;

const ScrollViewContainer = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  padding: 5px 0 0 0;
`;

const CtaContainer = styled(_CtaContainer)`
  padding: 10px 16px;
`;

const SendToAddress = () => {
  const {t} = useTranslation();
  const theme = useTheme();
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';
  const [searchInput, setSearchInput] = useState('');
  const [recipient, setRecipient] = useState<Recipient>();
  const [errorMessage, setErrorMessage] = useState('');
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const {keys, rates} = useAppSelector(({WALLET}: RootState) => WALLET);

  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<WalletStackParamList, 'SendToOptions'>>();
  const {wallet} = route.params;
  const {
    currencyAbbreviation,
    id,
    credentials: {network},
  } = wallet;

  const keyWallets: KeyWalletsRowProps<KeyWallet>[] = BuildKeyWalletRow(
    keys,
    id,
    currencyAbbreviation,
    network,
    defaultAltCurrency.isoCode,
    searchInput,
    rates,
    dispatch,
  );

  const onErrorMessageDismiss = () => {
    setSearchInput('');
  };

  const BchLegacyAddressInfoDismiss = (searchText: string) => {
    try {
      const cashAddr = TranslateToBchCashAddress(
        searchText.replace(/^(bitcoincash:|bchtest:)/, ''),
      );
      setSearchInput(cashAddr);
      validateData(cashAddr);
    } catch (error) {
      dispatch(showBottomNotificationModal(Mismatch(onErrorMessageDismiss)));
    }
  };

  const checkCoinAndNetwork =
    (data: any): Effect<boolean> =>
    dispatch => {
      const addrData = GetCoinAndNetwork(data, network);
      const isValid =
        dispatch(GetChain(currencyAbbreviation)).toLowerCase() ===
          addrData?.coin.toLowerCase() && addrData?.network === network;

      if (isValid) {
        return true;
      } else {
        // @ts-ignore
        if (currencyAbbreviation === 'bch' && network === addrData?.network) {
          const isLegacy = CheckIfLegacyBCH(data);
          if (isLegacy) {
            const appName = APP_NAME_UPPERCASE;

            dispatch(
              showBottomNotificationModal(
                BchLegacyAddressInfo(appName, () => {
                  BchLegacyAddressInfoDismiss(data);
                }),
              ),
            );
          } else {
            dispatch(
              showBottomNotificationModal(Mismatch(onErrorMessageDismiss)),
            );
          }
        } else {
          dispatch(
            showBottomNotificationModal(Mismatch(onErrorMessageDismiss)),
          );
        }
      }
      return false;
    };

  const validateData = async (text: string) => {
    const data = ValidateURI(text);
    if (ValidDataTypes.includes(data?.type)) {
      if (dispatch(checkCoinAndNetwork(text))) {
        setErrorMessage('');
        setRecipient({address: text});
      }
      {
      }
    } else {
      setErrorMessage(text.length > 15 ? 'Invalid Address' : '');
    }
  };

  const onSearchInputChange = debounce((text: string) => {
    validateData(text);
  }, 300);

  const onSendToWallet = async (selectedWallet: KeyWallet) => {
    try {
      const {
        credentials,
        id: walletId,
        keyId,
        walletName,
        receiveAddress,
      } = selectedWallet;

      let address = receiveAddress;

      if (!address) {
        dispatch(
          startOnGoingProcessModal(
            // t('Generating Address')
            t(OnGoingProcessMessages.GENERATING_ADDRESS),
          ),
        );
        address = (await dispatch<any>(
          createWalletAddress({wallet: selectedWallet, newAddress: false}),
        )) as string;
        dispatch(dismissOnGoingProcessModal());
      }
      setSearchInput(walletName || credentials.walletName);
      setRecipient({
        type: 'wallet',
        name: walletName || credentials.walletName,
        walletId,
        keyId,
        address,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <SendToAddressContainer>
        <Paragraph>
          {t(
            'To get started, you’ll need to enter a valid address or select an existing contact or wallet.',
          )}
        </Paragraph>
        <SearchContainer style={{marginTop: 25, marginBottom: 0}}>
          <SearchInput
            placeholder={t('Enter address or select wallet')}
            placeholderTextColor={placeHolderTextColor}
            value={searchInput}
            onChangeText={(text: string) => {
              setSearchInput(text);
              onSearchInputChange(text);
            }}
          />
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              haptic('impactLight');
              dispatch(
                logSegmentEvent('track', 'Open Scanner', {
                  context: 'SendTo',
                }),
              );
              navigation.navigate('Scan', {
                screen: 'Root',
                params: {
                  onScanComplete: data => {
                    try {
                      if (data) {
                        validateData(data);
                      }
                    } catch (err) {
                      console.log(err);
                    }
                  },
                },
              });
            }}>
            <ScanSvg />
          </TouchableOpacity>
        </SearchContainer>
        {errorMessage ? <ErrorText>{errorMessage}</ErrorText> : null}
      </SendToAddressContainer>
      <ScrollViewContainer>
        <View style={{marginTop: 10}}>
          <KeyWalletsRow
            keyWallets={keyWallets}
            onPress={(selectedWallet: KeyWallet) => {
              onSendToWallet(selectedWallet);
            }}
          />
        </View>
      </ScrollViewContainer>

      <CtaContainer>
        <Button
          buttonStyle={'primary'}
          onPress={() => {
            haptic('impactLight');
            navigation.navigate('Wallet', {
              screen: 'SelectInputs',
              params: {
                recipient: recipient!,
                wallet,
              },
            });
          }}
          disabled={!recipient}>
          {t('Continue')}
        </Button>
      </CtaContainer>
    </>
  );
};

export default SendToAddress;
